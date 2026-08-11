/* ---------- EXTRACTION CONTRACT ---------- */
/* The one fenced probabilistic step in the app: menu text in, structured
   items out. Everything downstream of this file is deterministic.

   Deliberately absent, and never to be added: any allergen or gluten-free
   field. Safety-critical data must not be inferred (rule 000-project.mdc). */

const option = {
  type: "object",
  properties: {
    id: { type: "string" },
    label: { type: "string" },
    note: { type: "string" },
  },
  required: ["id", "label", "note"],
} as const;

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
  },
  required: [
    "name",
    "plain",
    "format",
    "proteins",
    "styles",
    "vegetarian",
    "vegan",
    "heat",
    "portion",
  ],
} as const;

export const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    vocabulary: {
      type: "object",
      properties: {
        format: { type: "array", items: option },
        protein: { type: "array", items: option },
        style: { type: "array", items: option },
      },
      required: ["format", "protein", "style"],
    },
    items: { type: "array", items: item },
  },
  required: ["vocabulary", "items"],
} as const;

export const EXTRACTION_SYSTEM_PROMPT = `You convert a restaurant menu into a decision structure. You are an extractor, not a recommender: never rank, score, or suggest items.

Describe the menu on exactly three dimensions, using the menu's own words:
- format: how the dish is served (for example bowl, wrap, plate, pizza, curry).
- protein: the main component it is built around.
- style: the flavour family (for example classic, creamy, spicy, fresh).

Rules:
1. First list the option values for each dimension in "vocabulary". Use short lowercase ids (a-z and hyphens), a human label, and a very short note. Prefer 2 to 6 options per dimension. Every option must apply to at least one item.
2. Every item's format, proteins and styles must use ids you declared in the vocabulary. Never use an id you did not declare.
3. "name" must be the item's name copied exactly as printed on the menu. Never paraphrase, translate, tidy or invent a name. If an item has no discernible name, omit that item entirely.
4. "plain" is one sentence describing what the item actually is, by its components. Do not repeat the item's name inside it and do not use a brand name.
5. Sizes are not separate products. If the menu lists the same dish as single/double, small/large or regular/large, output ONE item with "portion": true and the base name without the size word. Never output two near-identical items that differ only by size.
6. "heat" is true only when the menu lets the customer choose a spice level for that item.
7. "vegetarian" items must use the protein id "veg" and nothing else. "vegan" implies "vegetarian".
8. Include main dishes only. Skip drinks, desserts, sides, sauces and extras.
9. Never output allergen, gluten-free or any other safety information, in any field.

Return only the structured object.`;

export function extractionUserPrompt(markdown: string): string {
  return `Menu document:\n\n${markdown}`;
}
