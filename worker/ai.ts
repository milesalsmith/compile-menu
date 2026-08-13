import type { ConversionOutcome, ConvertibleFile, MenuAiPort, ModelOutcome } from "../src/lib/extraction/pipeline";
import { PDF_MIME } from "../src/lib/extraction/pipeline";
import { classifyAiError } from "../src/lib/extraction/ai-error";
import {
  EXTRACTION_SYSTEM_PROMPT,
  extractionUserPrompt,
  parseModelJson,
} from "../src/lib/extraction/schema";

/* The only file that touches env.AI. Everything else in the extraction path
   is typed against MenuAiPort, so the provider and the model below can change
   without any other file knowing (rule 020-worker-api.mdc). */

/* 70B + json_schema timed out (~120s). Scout 17B + json_object finishes but
   still failed when we demanded a nested vocabulary+evidence object — the
   fence rejected a dish list as invalid_output with proposed 0. The model
   now emits items only; validateExtraction is the schema. Swap this constant only. */
export const EXTRACTION_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";

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
      } catch (error) {
        const { reason, errorClass } = classifyAiError(error);
        if (reason === "schema_not_met") {
          return { ok: false, reason: "ai_unavailable", errorClass };
        }
        return { ok: false, reason, errorClass };
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
          /* json_object, not json_schema: constrained decoding against a
             nested vocabulary schema burned 120s on 70B. Shape is enforced
             downstream by validateExtraction. */
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 4096,
        });
        raw = (result as { response?: unknown }).response;
      } catch (error) {
        const { reason, errorClass } = classifyAiError(error);
        return { ok: false, reason, errorClass };
      }

      const value = parseModelJson(raw);
      if (value === null) {
        return { ok: false, reason: "schema_not_met", errorClass: "EmptyResponse" };
      }
      return { ok: true, value };
    },
  };
}
