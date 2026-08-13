import { describe, expect, it } from "vitest";
import {
  EXTRACTION_SYSTEM_PROMPT,
  MAX_EXTRACTED_MAINS,
  extractionUserPrompt,
  parseModelJson,
} from "./schema";

describe("extraction contract — mains only, same posture as the demo", () => {
  it("caps how many mains the model may emit", () => {
    expect(MAX_EXTRACTED_MAINS).toBe(24);
    expect(EXTRACTION_SYSTEM_PROMPT).toContain(String(MAX_EXTRACTED_MAINS));
    expect(extractionUserPrompt("x")).toContain(String(MAX_EXTRACTED_MAINS));
  });

  it("tells the model to skip soups, starters and sides, not just drinks", () => {
    expect(EXTRACTION_SYSTEM_PROMPT.toLowerCase()).toMatch(/soups/);
    expect(EXTRACTION_SYSTEM_PROMPT.toLowerCase()).toMatch(/starters/);
    expect(EXTRACTION_SYSTEM_PROMPT.toLowerCase()).toMatch(/spread across/);
  });

  it("asks for an items list only — vocabulary is derived downstream", () => {
    expect(EXTRACTION_SYSTEM_PROMPT).toMatch(/one key, "items"/);
    expect(EXTRACTION_SYSTEM_PROMPT.toLowerCase()).toMatch(/no vocabulary object/);
  });

  it("unwraps fenced JSON without repairing the payload", () => {
    expect(parseModelJson('```json\n{"items":[]}\n```')).toEqual({ items: [] });
    expect(parseModelJson({ items: [] })).toEqual({ items: [] });
    expect(parseModelJson("not json")).toBeNull();
  });
});
