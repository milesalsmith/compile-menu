import type { ExtractionFailure, ValidatedMenu } from "./validate";
import { validateExtraction } from "./validate";

/* ---------- EXTRACTION PIPELINE ---------- */
/* PDF -> markdown -> structured JSON -> deterministic validation. Typed
   against a port rather than the Workers AI binding, so the pipeline runs in
   a plain test process and the extraction model can be swapped without
   touching anything in here (rule 020-worker-api.mdc). */

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_MARKDOWN_CHARS = 50_000;
export const PDF_MIME = "application/pdf";

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  bytes: ArrayBuffer;
}

export type ConversionOutcome =
  | { ok: true; markdown: string }
  | { ok: false; reason: "conversion_failed" };

export type ModelOutcome =
  | { ok: true; value: unknown }
  | { ok: false; reason: "schema_not_met" | "ai_unavailable" };

export interface MenuAiPort {
  toMarkdown(file: UploadedFile): Promise<ConversionOutcome>;
  extractJson(markdown: string): Promise<ModelOutcome>;
}

export type ExtractionErrorCode =
  | "unsupported_file_type"
  | "file_too_large"
  | "empty_file"
  | "conversion_failed"
  | "ai_unavailable"
  | "schema_not_met"
  | ExtractionFailure;

export type ExtractionOutcome =
  | { ok: true; menu: ValidatedMenu }
  | { ok: false; code: ExtractionErrorCode; status: number; message: string };

/* User-facing copy. Says what went wrong and what to do about it, and never
   leaks a model name, a stack, or anything from the document itself. */
const FAILURES: Record<ExtractionErrorCode, { status: number; message: string }> = {
  unsupported_file_type: { status: 415, message: "That file isn't a PDF. Upload the menu as a PDF." },
  file_too_large: { status: 413, message: "That PDF is too large. The limit is 8 MB." },
  empty_file: { status: 400, message: "That PDF appears to be empty." },
  conversion_failed: {
    status: 422,
    message: "We couldn't read any text from that PDF. Scanned or image-only menus won't work.",
  },
  ai_unavailable: {
    status: 503,
    message: "The extraction service is unavailable right now. Try again in a moment.",
  },
  schema_not_met: {
    status: 422,
    message: "We couldn't turn that document into a menu structure. Try a clearer menu PDF.",
  },
  invalid_output: {
    status: 422,
    message: "We couldn't turn that document into a menu structure. Try a clearer menu PDF.",
  },
  unsafe_field: {
    status: 422,
    message:
      "That extraction included allergen information, which this tool never infers. Nothing was compiled.",
  },
  too_few_items: {
    status: 422,
    message: "We found too few dishes to compile. This works best on a full main-course menu.",
  },
  no_variety: {
    status: 422,
    message:
      "Every dish came out looking the same, so there's no decision to compile. Try a menu with more variety.",
  },
};

function fail(code: ExtractionErrorCode): ExtractionOutcome {
  return { ok: false, code, ...FAILURES[code] };
}

export async function extractMenu(file: UploadedFile, ai: MenuAiPort): Promise<ExtractionOutcome> {
  if (file.type !== PDF_MIME) return fail("unsupported_file_type");
  if (file.size > MAX_UPLOAD_BYTES || file.bytes.byteLength > MAX_UPLOAD_BYTES) {
    return fail("file_too_large");
  }
  if (file.size === 0 || file.bytes.byteLength === 0) return fail("empty_file");

  const converted = await ai.toMarkdown(file);
  if (!converted.ok) return fail(converted.reason);

  const markdown = converted.markdown.trim();
  if (markdown.length === 0) return fail("conversion_failed");

  const extracted = await ai.extractJson(markdown.slice(0, MAX_MARKDOWN_CHARS));
  if (!extracted.ok) return fail(extracted.reason);

  const validated = validateExtraction(extracted.value);
  if (!validated.ok) return fail(validated.code);

  return { ok: true, menu: validated.menu };
}
