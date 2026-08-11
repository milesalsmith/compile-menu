import type { ConversionOutcome, ConvertibleFile, MenuAiPort, ModelOutcome } from "../src/lib/extraction/pipeline";
import { PDF_MIME } from "../src/lib/extraction/pipeline";
import {
  EXTRACTION_JSON_SCHEMA,
  EXTRACTION_SYSTEM_PROMPT,
  extractionUserPrompt,
} from "../src/lib/extraction/schema";

/* The only file that touches env.AI. Everything else in the extraction path
   is typed against MenuAiPort, so the provider and the model below can change
   without any other file knowing (rule 020-worker-api.mdc). */

export const EXTRACTION_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

/* Workers AI does not guarantee schema compliance — when the model can't
   produce output matching the schema it says so explicitly. */
const JSON_MODE_FAILURE = /json mode/i;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function menuAi(ai: Ai): MenuAiPort {
  return {
    async toMarkdown(file: ConvertibleFile): Promise<ConversionOutcome> {
      try {
        const blob = new Blob([file.bytes], { type: PDF_MIME });
        /* Document metadata is token noise for extraction. */
        const converted = await ai.toMarkdown(
          { name: file.name, blob },
          { conversionOptions: { pdf: { metadata: false } } }
        );
        if (converted.format === "error") return { ok: false, reason: "conversion_failed" };
        /* The detected type travels back with the text: the caller decides
           whether it matches what was claimed. */
        return { ok: true, markdown: converted.data, mimeType: converted.mimeType };
      } catch {
        return { ok: false, reason: "ai_unavailable" };
      }
    },

    async extractJson(markdown: string): Promise<ModelOutcome> {
      let raw: unknown;
      try {
        const result = await ai.run(EXTRACTION_MODEL, {
          messages: [
            { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
            { role: "user", content: extractionUserPrompt(markdown) },
          ],
          response_format: { type: "json_schema", json_schema: EXTRACTION_JSON_SCHEMA },
          temperature: 0.1,
          max_tokens: 8192,
        });
        raw = (result as { response?: unknown }).response;
      } catch (error) {
        const reason = JSON_MODE_FAILURE.test(messageOf(error)) ? "schema_not_met" : "ai_unavailable";
        return { ok: false, reason };
      }

      if (typeof raw === "string") {
        try {
          return { ok: true, value: JSON.parse(raw) };
        } catch {
          return { ok: false, reason: "schema_not_met" };
        }
      }
      if (raw === null || raw === undefined) return { ok: false, reason: "schema_not_met" };
      return { ok: true, value: raw };
    },
  };
}
