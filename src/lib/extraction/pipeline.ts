import type { ExtractionFailure, ValidatedMenu } from "./validate";
import { validateExtraction } from "./validate";
import type { ExtractionTrace } from "./trace";
import { emptyTrace } from "./trace";

/* ---------- EXTRACTION PIPELINE ---------- */
/* PDF -> markdown -> structured JSON -> deterministic validation. Typed
   against a port rather than the Workers AI binding, so the pipeline runs in
   a plain test process and the extraction model can be swapped without
   touching anything in here (rule 020-worker-api.mdc). */

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/* Floor on converted text. Image-only / scanned menus from field testing
   yielded ~60 characters from toMarkdown (pdftotext: 2). Calling extract on
   that is a wasted inference call and a misleading "too few dishes". */
export const MIN_MARKDOWN_CHARS = 300;

/* The ceiling on converted text we will extract from reliably. Past it we
   stop rather than quietly compiling a menu from the first N characters and
   presenting the result as if the whole document had been read. */
export const MAX_MARKDOWN_CHARS = 50_000;

export const PDF_MIME = "application/pdf";

export interface UploadedFile {
  name: string;
  /** Advisory only: the browser said so. The file signature decides. */
  type: string;
  size: number;
  /** Read lazily, so a rejected upload is never pulled into memory. */
  bytes(): Promise<ArrayBuffer>;
}

export interface ConvertibleFile {
  name: string;
  bytes: ArrayBuffer;
}

export type ConversionOutcome =
  | { ok: true; markdown: string; mimeType: string }
  | {
      ok: false;
      reason: "conversion_failed" | "ai_unavailable" | "ai_timeout" | "ai_rate_limited";
      errorClass?: string;
    };

export type ModelOutcome =
  | { ok: true; value: unknown }
  | {
      ok: false;
      reason: "schema_not_met" | "ai_unavailable" | "ai_timeout" | "ai_rate_limited";
      errorClass?: string;
    };

export interface MenuAiPort {
  toMarkdown(file: ConvertibleFile): Promise<ConversionOutcome>;
  extractJson(markdown: string): Promise<ModelOutcome>;
}

export type ExtractionErrorCode =
  | "unsupported_file_type"
  | "file_too_large"
  | "empty_file"
  | "not_a_pdf"
  | "conversion_failed"
  | "sparse_text"
  | "menu_too_long"
  | "ai_unavailable"
  | "ai_timeout"
  | "ai_rate_limited"
  | "schema_not_met"
  | ExtractionFailure;

export type ExtractionOutcome =
  | { ok: true; menu: ValidatedMenu; trace: ExtractionTrace }
  | { ok: false; code: ExtractionErrorCode; status: number; message: string; trace: ExtractionTrace };

/* User-facing copy. Says what went wrong and what to do about it, and never
   leaks a model name, a stack, or anything from the document itself. */
const FAILURES: Record<ExtractionErrorCode, { status: number; message: string }> = {
  unsupported_file_type: { status: 415, message: "That file isn't a PDF. Upload the menu as a PDF." },
  file_too_large: { status: 413, message: "That PDF is too large. The limit is 8 MB." },
  empty_file: { status: 400, message: "That PDF appears to be empty." },
  not_a_pdf: {
    status: 415,
    message: "That file isn't a real PDF, whatever it's named. Upload the menu as a PDF.",
  },
  conversion_failed: {
    status: 422,
    message: "We couldn't read any text from that PDF. Scanned or image-only menus won't work.",
  },
  sparse_text: {
    status: 422,
    message:
      "This PDF doesn't contain readable text. Try a text-based menu — exported or printed from a website — not a photo or scan of the page.",
  },
  menu_too_long: {
    status: 413,
    message:
      "That document is longer than we can read reliably. Upload just the food menu, not the full brochure or wine list.",
  },
  ai_unavailable: {
    status: 503,
    message: "The extraction service is unavailable right now. Try again in a moment.",
  },
  ai_timeout: {
    status: 504,
    message:
      "That menu took too long to compile. Try a shorter PDF — just the mains, not the whole brochure.",
  },
  ai_rate_limited: {
    status: 429,
    message: "The extraction service is busy. Wait a minute and try again.",
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

function fail(
  code: ExtractionErrorCode,
  trace: ExtractionTrace,
  started: number
): ExtractionOutcome {
  trace.timings.totalMs = Date.now() - started;
  return { ok: false, code, ...FAILURES[code], trace };
}

/* %PDF- must appear in the header. A little slack for the leading junk some
   generators emit, but nowhere near enough to accept a renamed file. */
const PDF_SIGNATURE = "%PDF-";
const SIGNATURE_SEARCH_BYTES = 1024;

function looksLikePdf(bytes: ArrayBuffer): boolean {
  const head = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, SIGNATURE_SEARCH_BYTES));
  const ascii = String.fromCharCode(...head);
  return ascii.includes(PDF_SIGNATURE);
}

function baseMimeType(value: string): string {
  return value.split(";")[0].trim().toLowerCase();
}

export async function extractMenu(file: UploadedFile, ai: MenuAiPort): Promise<ExtractionOutcome> {
  const started = Date.now();
  const trace = emptyTrace({ bytes: file.size });

  /* The browser's content type is a hint from the client, so it only buys a
     cheap early exit. What the bytes actually are is decided below. */
  if (file.type !== PDF_MIME) return fail("unsupported_file_type", trace, started);
  if (file.size > MAX_UPLOAD_BYTES) return fail("file_too_large", trace, started);
  if (file.size === 0) return fail("empty_file", trace, started);

  const bytes = await file.bytes();
  trace.bytes = bytes.byteLength;
  if (bytes.byteLength === 0) return fail("empty_file", trace, started);
  if (bytes.byteLength > MAX_UPLOAD_BYTES) return fail("file_too_large", trace, started);
  if (!looksLikePdf(bytes)) return fail("not_a_pdf", trace, started);

  trace.stage = "convert";
  const convertStarted = Date.now();
  const converted = await ai.toMarkdown({ name: file.name, bytes });
  trace.timings.convertMs = Date.now() - convertStarted;
  if (!converted.ok) {
    if (converted.errorClass) trace.aiErrorClass = converted.errorClass;
    return fail(converted.reason, trace, started);
  }

  /* Trust the converter's detected type over the client's claim before any
     of this reaches the extraction model. */
  if (baseMimeType(converted.mimeType) !== PDF_MIME) return fail("not_a_pdf", trace, started);

  const markdown = converted.markdown.trim();
  trace.markdownChars = markdown.length;
  if (markdown.length === 0) return fail("conversion_failed", trace, started);
  if (markdown.length < MIN_MARKDOWN_CHARS) return fail("sparse_text", trace, started);
  if (markdown.length > MAX_MARKDOWN_CHARS) return fail("menu_too_long", trace, started);

  trace.stage = "extract";
  const extractStarted = Date.now();
  const extracted = await ai.extractJson(markdown);
  trace.timings.extractMs = Date.now() - extractStarted;
  if (!extracted.ok) {
    if (extracted.errorClass) trace.aiErrorClass = extracted.errorClass;
    return fail(extracted.reason, trace, started);
  }

  trace.stage = "validate";
  const validateStarted = Date.now();
  const validated = validateExtraction(extracted.value, markdown);
  trace.timings.validateMs = Date.now() - validateStarted;
  trace.proposed = validated.slice.proposed;
  trace.kept = validated.slice.kept;
  trace.collapsedFrom = validated.slice.collapsedFrom;
  trace.drops = validated.slice.drops;
  trace.samples = validated.slice.samples;
  trace.varietyGain = validated.slice.varietyGain;
  trace.modelShape = validated.slice.modelShape;
  if (!validated.ok) return fail(validated.code, trace, started);

  trace.stage = "done";
  trace.timings.totalMs = Date.now() - started;
  return { ok: true, menu: validated.menu, trace };
}
