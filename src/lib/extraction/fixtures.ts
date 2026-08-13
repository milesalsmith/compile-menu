/* Synthetic model output used by the extraction tests. Deliberately not a
   real menu: nothing uploaded is ever written into this repository, so the
   test corpus is constructed here in code (rule 020-worker-api.mdc). */

export interface RawOption {
  id: string;
  label: string;
  note: string;
}

export type RawItem = Record<string, unknown>;

export interface RawExtraction {
  vocabulary?: { format: RawOption[]; protein: RawOption[]; style: RawOption[] };
  items: RawItem[];
}

const option = (id: string, label: string): RawOption => ({ id, label, note: "" });

export function rawItem(overrides: Partial<RawItem> = {}): RawItem {
  const name = typeof overrides.name === "string" ? overrides.name : "House Pizza";
  return {
    name,
    evidence: `${name} 9.50`,
    plain: "A thin base with tomato, mozzarella and oregano.",
    format: "pizza",
    proteins: ["beef"],
    styles: ["classic"],
    vegetarian: false,
    vegan: false,
    heat: false,
    portion: false,
    ...overrides,
  };
}

/* A five-item deli-style menu with genuine spread across all three slots, so
   the variety gate passes and the engine has something to compile. */
export function rawExtraction(overrides: Partial<RawExtraction> = {}): RawExtraction {
  return {
    vocabulary: {
      format: [option("pizza", "Pizza"), option("salad", "Salad"), option("sandwich", "Sandwich")],
      protein: [option("chicken", "Chicken"), option("beef", "Beef"), option("veg", "Vegetarian")],
      style: [option("classic", "Classic"), option("spicy", "Spicy"), option("creamy", "Creamy")],
    },
    items: [
      rawItem({
        name: "Margherita Pizza",
        evidence: "Margherita Pizza (V) — tomato, mozzarella, basil 9.50",
        plain: "A thin base with tomato, mozzarella and basil.",
        proteins: ["veg"],
        vegetarian: true,
      }),
      rawItem({
        name: "Pepperoni Pizza",
        evidence: "Pepperoni Pizza — tomato, mozzarella, spiced sausage 11.00",
        plain: "Tomato base with cured spiced sausage and mozzarella.",
        styles: ["spicy"],
        heat: true,
      }),
      rawItem({
        name: "Chicken Caesar Salad",
        evidence: "Chicken Caesar Salad — cos, croutons, parmesan dressing 10.50",
        plain: "Cos leaves, croutons and grilled chicken in a rich dressing.",
        format: "salad",
        proteins: ["chicken"],
        styles: ["creamy"],
      }),
      rawItem({
        name: "Steak Sandwich",
        evidence: "Steak Sandwich — sliced steak, onions, toasted roll 12.00",
        plain: "Sliced steak with onions in a toasted roll.",
        format: "sandwich",
      }),
      rawItem({
        name: "Falafel Salad",
        evidence: "Falafel Salad (VE) — chickpea fritters, leaves, lemon dressing 9.00",
        plain: "Chickpea fritters over leaves with a lemon dressing.",
        format: "salad",
        proteins: ["veg"],
        vegetarian: true,
        vegan: true,
      }),
    ],
    ...overrides,
  };
}

/* The converted markdown an extraction claims to have come from. Built from
   the items' own quoted evidence, so a test that adds an item gets a
   document containing it and only has to think about the gate it's probing. */
export function sourceFor(extraction: RawExtraction): string {
  const lines = extraction.items
    .map((item) => {
      if (typeof item.evidence === "string" && item.evidence.length > 0) return item.evidence;
      return typeof item.name === "string" ? item.name : "";
    })
    .filter((line) => line.length > 0);
  return ["# Menu", "", "## Mains", "", ...lines, ""].join("\n");
}
