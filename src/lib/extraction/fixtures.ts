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
  vocabulary: { format: RawOption[]; protein: RawOption[]; style: RawOption[] };
  items: RawItem[];
}

const option = (id: string, label: string): RawOption => ({ id, label, note: "" });

export function rawItem(overrides: Partial<RawItem> = {}): RawItem {
  return {
    name: "Margherita Pizza",
    plain: "A thin base with tomato, mozzarella and basil.",
    format: "pizza",
    proteins: ["veg"],
    styles: ["classic"],
    vegetarian: true,
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
      rawItem(),
      rawItem({
        name: "Pepperoni Pizza",
        plain: "Tomato base with cured spiced sausage and mozzarella.",
        proteins: ["beef"],
        styles: ["spicy"],
        vegetarian: false,
        heat: true,
      }),
      rawItem({
        name: "Chicken Caesar Salad",
        plain: "Cos leaves, croutons and grilled chicken in a rich dressing.",
        format: "salad",
        proteins: ["chicken"],
        styles: ["creamy"],
        vegetarian: false,
      }),
      rawItem({
        name: "Steak Sandwich",
        plain: "Sliced steak with onions in a toasted roll.",
        format: "sandwich",
        proteins: ["beef"],
        styles: ["classic"],
        vegetarian: false,
      }),
      rawItem({
        name: "Falafel Salad",
        plain: "Chickpea fritters over leaves with a lemon dressing.",
        format: "salad",
        proteins: ["veg"],
        styles: ["classic"],
        vegetarian: true,
        vegan: true,
      }),
    ],
    ...overrides,
  };
}
