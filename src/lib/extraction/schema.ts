/* ---------- EXTRACTION CONTRACT ---------- */
/* The one fenced probabilistic step in the app: menu text in, structured
   items out. Everything downstream of this file is deterministic.

   Deliberately absent, and never to be added: any allergen or gluten-free
   field. Safety-critical data must not be inferred (rule 000-project.mdc).

   The model emits a dish list only. Vocabulary is derived from surviving
   items; names are grounded against the converted markdown. Asking the
   model to also invent a closed option set + quoted evidence made JSON
   Mode too large for Workers AI (70B timed out; Scout returned a list
   we then rejected as invalid_output with proposed 0). */

const item = {
  type: "object",
  properties: {
    name: { type: "string" },
    plain: { type: "string" },
    format: { type: "string" },
    proteins: { type: "array", items: { type: "string" } },
    styles: { type: "array", items: { type: "string" } },
    vegetarian: { type: "boolean" },
    vegan: { type: "boolean" },
    heat: { type: "boolean" },
    portion: { type: "boolean" },
    /* Optional. If present it is still checked; if absent the name itself
       must appear in the converted markdown. */
    evidence: { type: "string" },
  },
  required: ["name", "plain", "format", "proteins", "styles"],
} as const;

/* Same posture as the shipped demo: a handful of mains, not every soup,
   starter and side. The compiler only needs ≥4 items with attribute variety;
   emitting a 15-page a la carte in one JSON Mode call times out. */
export const MAX_EXTRACTED_MAINS = 24;

export const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    items: { type: "array", items: item },
  },
  required: ["items"],
} as const;

export const EXTRACTION_SYSTEM_PROMPT = `You convert a restaurant menu into a JSON list of main dishes. You are an extractor, not a recommender: never rank, score, or suggest items.

Return ONLY a JSON object with one key, "items", whose value is an array of at most ${MAX_EXTRACTED_MAINS} mains. No markdown fences, no prose, no vocabulary object.

Each item:
- "name": copied exactly as printed. Never paraphrase, translate, tidy or invent. If there is no discernible name, omit the item.
- "plain": one sentence describing the components. Do not repeat the name. Do not use a brand name.
- "format": how it is served, a lowercase slug using the menu's own words (bowl, wrap, pizza, plate, taco, curry, ...).
- "proteins": array of lowercase slugs for the main component(s). Vegetarian dishes use ["veg"] only.
- "styles": array of 1–3 short lowercase slugs for the flavour family only (spicy, creamy, tomato, dry, tandoori, sweet, classic, ...). Never omit it. Never a full sentence or ingredient list. Use the key "styles", not "style".
- "vegetarian" / "vegan": true only if the menu itself marks that dish (V, VE, vegetarian, vegan). Otherwise omit or false. vegan implies vegetarian.
- "heat": true only if the customer can choose a spice level for that dish.

Rules:
1. MAINS ONLY. Skip soups, starters, sharing platters, sides, drinks, desserts, sauces, extras and kids' portions. If there are more than ${MAX_EXTRACTED_MAINS} mains, pick a spread across formats and proteins, not the first lines on the page.
2. Sizes are not separate products. Output one item for single/double or small/large variants, using the base name without the size word.
3. Never output allergen, gluten-free or any other safety information, in any field.
4. Do not invent dishes that are not on the menu. Every name must appear in the document.`;

export function extractionUserPrompt(markdown: string): string {
  return `Extract at most ${MAX_EXTRACTED_MAINS} main dishes as JSON { "items": [...] }. Skip soups, starters and sides.\n\nMenu document:\n\n${markdown}`;
}

/* Models sometimes wrap JSON in fences even when asked not to. The fence
   still validates the parsed object — this only unwraps the bytes. */
export function parseModelJson(raw: unknown): unknown | null {
  if (raw !== null && typeof raw === "object") return raw;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(unfenced.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}
