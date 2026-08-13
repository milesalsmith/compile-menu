import { describe, expect, it, vi } from "vitest";
import type { MenuAiPort, UploadedFile } from "./pipeline";
import { MAX_MARKDOWN_CHARS, MAX_UPLOAD_BYTES, MIN_MARKDOWN_CHARS, extractMenu } from "./pipeline";
import { rawExtraction, sourceFor } from "./fixtures";

const SOURCE = sourceFor(rawExtraction());

function bytesOf(content: string): ArrayBuffer {
  return new TextEncoder().encode(content).buffer as ArrayBuffer;
}

const REAL_PDF = bytesOf("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\ntrailer\n%%EOF\n");

function pdf(overrides: Partial<UploadedFile> = {}): UploadedFile {
  return {
    name: "menu.pdf",
    type: "application/pdf",
    size: REAL_PDF.byteLength,
    bytes: async () => REAL_PDF,
    ...overrides,
  };
}

function port(overrides: Partial<MenuAiPort> = {}): MenuAiPort {
  return {
    toMarkdown: vi.fn(async () => ({
      ok: true as const,
      markdown: SOURCE,
      mimeType: "application/pdf",
    })),
    extractJson: vi.fn(async () => ({ ok: true as const, value: rawExtraction() })),
    ...overrides,
  };
}

describe("upload gates — checked before any AI call", () => {
  it("rejects a file that isn't a PDF", async () => {
    const ai = port();
    const result = await extractMenu(pdf({ type: "image/png" }), ai);
    expect(result).toMatchObject({ ok: false, code: "unsupported_file_type", status: 415 });
    expect(ai.toMarkdown).not.toHaveBeenCalled();
  });

  it("treats the browser's content type as a claim and checks the bytes", async () => {
    const ai = port();
    const disguised = bytesOf("GIF89a this is not a pdf at all");
    const result = await extractMenu(
      pdf({ name: "menu.pdf", size: disguised.byteLength, bytes: async () => disguised }),
      ai
    );
    expect(result).toMatchObject({ ok: false, code: "not_a_pdf", status: 415 });
    expect(ai.toMarkdown).not.toHaveBeenCalled();
  });

  it("rejects an oversized upload without reading it or spending an AI call", async () => {
    const ai = port();
    const bytes = vi.fn(async () => new ArrayBuffer(8));
    const result = await extractMenu(pdf({ size: MAX_UPLOAD_BYTES + 1, bytes }), ai);
    expect(result).toMatchObject({ ok: false, code: "file_too_large", status: 413 });
    expect(ai.toMarkdown).not.toHaveBeenCalled();
    expect(bytes).not.toHaveBeenCalled();
  });

  it("rejects an empty file", async () => {
    const ai = port();
    const result = await extractMenu(pdf({ size: 0 }), ai);
    expect(result).toMatchObject({ ok: false, code: "empty_file" });
    expect(ai.toMarkdown).not.toHaveBeenCalled();
  });
});

describe("conversion and model failures each surface as themselves", () => {
  it("reports a malformed PDF that cannot be converted", async () => {
    const ai = port({ toMarkdown: async () => ({ ok: false, reason: "conversion_failed" }) });
    const result = await extractMenu(pdf(), ai);
    expect(result).toMatchObject({ ok: false, code: "conversion_failed" });
  });

  it("treats a PDF that converts to nothing as unreadable", async () => {
    const ai = port({
      toMarkdown: async () => ({ ok: true, markdown: "   \n  ", mimeType: "application/pdf" }),
    });
    const result = await extractMenu(pdf(), ai);
    expect(result).toMatchObject({ ok: false, code: "conversion_failed" });
  });

  it("refuses a scan that converts to a handful of characters without calling the model", async () => {
    const ai = port({
      toMarkdown: async () => ({
        ok: true,
        markdown: "Cinco\nwww.example.com\n",
        mimeType: "application/pdf",
      }),
    });
    const result = await extractMenu(pdf(), ai);
    expect(result).toMatchObject({ ok: false, code: "sparse_text", status: 422 });
    if (result.ok) throw new Error("expected failure");
    expect(result.trace.markdownChars).toBeLessThan(MIN_MARKDOWN_CHARS);
    expect(result.trace.stage).toBe("convert");
    expect(ai.extractJson).not.toHaveBeenCalled();
    expect(result.message).toMatch(/readable text/i);
    expect(result.message).not.toMatch(/too few dishes/i);
  });

  it("stops when the converter detects something other than a PDF", async () => {
    const ai = port({
      toMarkdown: async () => ({ ok: true, markdown: SOURCE, mimeType: "text/html" }),
    });
    const result = await extractMenu(pdf(), ai);
    expect(result).toMatchObject({ ok: false, code: "not_a_pdf" });
    expect(ai.extractJson).not.toHaveBeenCalled();
  });

  it("accepts a detected type that carries parameters", async () => {
    const ai = port({
      toMarkdown: async () => ({
        ok: true,
        markdown: SOURCE,
        mimeType: "application/pdf; charset=binary",
      }),
    });
    expect((await extractMenu(pdf(), ai)).ok).toBe(true);
  });

  it("reports an unavailable AI service", async () => {
    const ai = port({ extractJson: async () => ({ ok: false, reason: "ai_unavailable" }) });
    const result = await extractMenu(pdf(), ai);
    expect(result).toMatchObject({ ok: false, code: "ai_unavailable", status: 503 });
    expect(result.trace.stage).toBe("extract");
    expect(result.trace.timings.extractMs).toBeGreaterThanOrEqual(0);
  });

  it("reports a model timeout as itself, not a generic outage", async () => {
    const ai = port({
      extractJson: async () => ({ ok: false, reason: "ai_timeout", errorClass: "TimeoutError" }),
    });
    const result = await extractMenu(pdf(), ai);
    expect(result).toMatchObject({ ok: false, code: "ai_timeout", status: 504 });
    if (result.ok) throw new Error("expected failure");
    expect(result.trace.aiErrorClass).toBe("TimeoutError");
    expect(result.message).not.toMatch(/unavailable/i);
  });

  it("handles the model being unable to satisfy the schema", async () => {
    const ai = port({ extractJson: async () => ({ ok: false, reason: "schema_not_met" }) });
    const result = await extractMenu(pdf(), ai);
    expect(result).toMatchObject({ ok: false, code: "schema_not_met", status: 422 });
  });

  it("rejects structurally invalid model output instead of repairing it", async () => {
    const ai = port({ extractJson: async () => ({ ok: true, value: { items: "lots" } }) });
    const result = await extractMenu(pdf(), ai);
    expect(result).toMatchObject({ ok: false, code: "invalid_output" });
    expect(result.trace.modelShape).toMatchObject({
      kind: "object",
      keys: ["items"],
      itemsKey: null,
    });
  });

  it("compiles a dish list with no model vocabulary", async () => {
    const extraction = rawExtraction();
    const ai = port({
      extractJson: async () => ({ ok: true, value: { items: extraction.items } }),
    });
    const result = await extractMenu(pdf(), ai);
    if (!result.ok) throw new Error(result.code);
    expect(result.menu.items).toHaveLength(5);
    expect(result.trace.modelShape?.itemsKey).toBe("items");
  });

  it("never leaks internals in a user-facing message", async () => {
    const ai = port({ extractJson: async () => ({ ok: false, reason: "ai_unavailable" }) });
    const result = await extractMenu(pdf(), ai);
    if (result.ok) throw new Error("expected failure");
    expect(result.message).not.toMatch(/@cf\/|json_schema|stack|undefined/i);
  });
});

describe("a valid upload compiles", () => {
  it("returns items and a vocabulary drawn from the document", async () => {
    const result = await extractMenu(pdf(), port());
    if (!result.ok) throw new Error(result.code);
    expect(result.menu.items).toHaveLength(5);
    expect(result.trace.stage).toBe("done");
    expect(result.trace.proposed).toBe(5);
    expect(result.trace.kept).toBe(5);
    expect(result.menu.vocabulary.format.map((o) => o.id)).toEqual([
      "pizza",
      "salad",
      "sandwich",
    ]);
  });

  it("sends the whole converted document to the model, unabridged", async () => {
    let sent = "";
    const ai = port({
      extractJson: async (markdown) => {
        sent = markdown;
        return { ok: true, value: rawExtraction() };
      },
    });
    await extractMenu(pdf(), ai);
    expect(sent).toBe(SOURCE.trim());
  });

  it("refuses a document past the reliable ceiling rather than reading part of it", async () => {
    const ai = port({
      toMarkdown: async () => ({
        ok: true,
        markdown: "x".repeat(MAX_MARKDOWN_CHARS + 1),
        mimeType: "application/pdf",
      }),
    });
    const result = await extractMenu(pdf(), ai);
    /* Compiling the first 50k characters and presenting it as the menu would
       be a quietly wrong answer, which is worse than a refusal. */
    expect(result).toMatchObject({ ok: false, code: "menu_too_long", status: 413 });
    expect(ai.extractJson).not.toHaveBeenCalled();
  });
});
