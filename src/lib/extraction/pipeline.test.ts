import { describe, expect, it, vi } from "vitest";
import type { MenuAiPort, UploadedFile } from "./pipeline";
import { MAX_UPLOAD_BYTES, extractMenu } from "./pipeline";
import { rawExtraction } from "./fixtures";

function pdf(overrides: Partial<UploadedFile> = {}): UploadedFile {
  return {
    name: "menu.pdf",
    type: "application/pdf",
    size: 2048,
    bytes: async () => new ArrayBuffer(2048),
    ...overrides,
  };
}

function port(overrides: Partial<MenuAiPort> = {}): MenuAiPort {
  return {
    toMarkdown: vi.fn(async () => ({ ok: true as const, markdown: "# Menu\n\nPizza 9.50" })),
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
    const ai = port({ toMarkdown: async () => ({ ok: true, markdown: "   \n  " }) });
    const result = await extractMenu(pdf(), ai);
    expect(result).toMatchObject({ ok: false, code: "conversion_failed" });
  });

  it("reports an unavailable AI service", async () => {
    const ai = port({ extractJson: async () => ({ ok: false, reason: "ai_unavailable" }) });
    const result = await extractMenu(pdf(), ai);
    expect(result).toMatchObject({ ok: false, code: "ai_unavailable", status: 503 });
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
    expect(result.menu.vocabulary.format.map((o) => o.id)).toEqual([
      "pizza",
      "salad",
      "sandwich",
    ]);
  });

  it("caps how much converted text reaches the model", async () => {
    let sent = "";
    const ai = port({
      toMarkdown: async () => ({ ok: true, markdown: "x".repeat(120_000) }),
      extractJson: async (markdown) => {
        sent = markdown;
        return { ok: true, value: rawExtraction() };
      },
    });
    await extractMenu(pdf(), ai);
    expect(sent.length).toBe(50_000);
  });
});
