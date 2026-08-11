import { describe, expect, it } from "vitest";
import { MAX_EVIDENCE_CHARS, validateExtraction } from "./validate";
import { stripSizeQualifier } from "./portion";
import type { RawExtraction } from "./fixtures";
import { rawExtraction, rawItem, sourceFor } from "./fixtures";

/* Validate against the document the extraction claims to come from, which is
   what every grounding check below is really about. */
function check(raw: RawExtraction, source = sourceFor(raw)) {
  return validateExtraction(raw, source);
}

function itemsOf(raw: RawExtraction, source = sourceFor(raw)) {
  const result = validateExtraction(raw, source);
  if (!result.ok) throw new Error(`expected a valid menu, got ${result.code}`);
  return result.menu.items;
}

describe("shape validation — model output is checked, never repaired", () => {
  it("accepts a well-formed extraction", () => {
    expect(check(rawExtraction()).ok).toBe(true);
  });

  it("rejects output that is not an object", () => {
    expect(validateExtraction("[]", "")).toEqual({ ok: false, code: "invalid_output" });
    expect(validateExtraction(null, "")).toEqual({ ok: false, code: "invalid_output" });
    expect(validateExtraction([rawItem()], "")).toEqual({ ok: false, code: "invalid_output" });
  });

  it("rejects output with no declared vocabulary", () => {
    const raw = rawExtraction();
    expect(validateExtraction({ items: raw.items }, sourceFor(raw))).toEqual({
      ok: false,
      code: "invalid_output",
    });
  });

  it("drops an item whose attribute value was never declared", () => {
    const raw = rawExtraction();
    raw.items.push(rawItem({ name: "Mystery Bowl", format: "bowl" }));
    const names = itemsOf(raw).map((i) => i.name);
    expect(names).not.toContain("Mystery Bowl");
    expect(names).toHaveLength(5);
  });

  it("drops an item carrying an unexpected field rather than stripping it", () => {
    const raw = rawExtraction();
    raw.items.push(rawItem({ name: "Extra Field Pizza", price: "9.50" }));
    expect(itemsOf(raw).map((i) => i.name)).not.toContain("Extra Field Pizza");
  });

  it("fails loudly when the model volunteers allergen data", () => {
    const raw = rawExtraction();
    raw.items[0] = rawItem({ allergens: ["milk"] });
    expect(check(raw)).toEqual({ ok: false, code: "unsafe_field" });
  });

  it("keeps vegetarian items on the veg protein id the engine assumes", () => {
    const raw = rawExtraction();
    raw.items.push(rawItem({ name: "Half-veg Pizza", vegetarian: true, proteins: ["veg", "beef"] }));
    expect(itemsOf(raw).map((i) => i.name)).not.toContain("Half-veg Pizza");
  });

  it("drops an item claiming vegan without vegetarian", () => {
    const raw = rawExtraction();
    raw.items.push(rawItem({ name: "Impossible Pizza", vegetarian: false, vegan: true }));
    expect(itemsOf(raw).map((i) => i.name)).not.toContain("Impossible Pizza");
  });
});

/* The model writes both the vocabulary and the attributes it fills in, so
   agreement between those two proves only that it is self-consistent. These
   check the one input it did not write: the converted document. */
describe("source grounding — the document is the authority, not the model", () => {
  it("drops an item whose name never appears in the document", () => {
    const raw = rawExtraction();
    raw.items.push(
      rawItem({ name: "Truffle Pizza", evidence: "Truffle Pizza 14.00" })
    );
    /* The document the extraction actually came from has no such line. */
    const source = sourceFor(rawExtraction());
    expect(itemsOf(raw, source).map((i) => i.name)).not.toContain("Truffle Pizza");
  });

  it("drops an item whose quoted evidence is not in the document", () => {
    const raw = rawExtraction();
    raw.items[1] = rawItem({
      name: "Pepperoni Pizza",
      evidence: "Pepperoni Pizza — served with a side of invention 11.00",
    });
    const names = itemsOf(raw, sourceFor(rawExtraction())).map((i) => i.name);
    expect(names).toContain("Margherita Pizza");
    expect(names).not.toContain("Pepperoni Pizza");
  });

  it("drops an item whose name is not inside its own evidence", () => {
    const raw = rawExtraction();
    raw.items.push(
      rawItem({
        name: "Steak Sandwich Deluxe",
        evidence: "Steak Sandwich — sliced steak, onions, toasted roll 12.00",
        format: "sandwich",
      })
    );
    expect(itemsOf(raw).map((i) => i.name)).not.toContain("Steak Sandwich Deluxe");
  });

  it("refuses evidence long enough to contain the whole document", () => {
    const raw = rawExtraction();
    const wholeDocument = sourceFor(rawExtraction());
    raw.items.push(
      rawItem({
        name: "Margherita Pizza",
        evidence: `${wholeDocument} ${"x".repeat(MAX_EVIDENCE_CHARS)}`,
      })
    );
    /* Quoting everything would make "the name is in the evidence" vacuous. */
    expect(itemsOf(raw)).toHaveLength(5);
  });

  it("still accepts evidence that spans markdown table punctuation", () => {
    const raw = rawExtraction();
    raw.items.push(
      rawItem({ name: "Nduja Pizza", evidence: "Nduja Pizza — spicy sausage 12.50" })
    );
    const source = `${sourceFor(rawExtraction())}\n| **Nduja Pizza** | _spicy sausage_ | 12.50 |\n`;
    expect(itemsOf(raw, source).map((i) => i.name)).toContain("Nduja Pizza");
  });
});

describe("dietary status is conservative and only ever quoted", () => {
  it("keeps a vegetarian item the menu actually marks", () => {
    const margherita = itemsOf(rawExtraction()).find((i) => i.name === "Margherita Pizza");
    expect(margherita?.vegetarian).toBe(true);
    expect(margherita?.vegan).toBe(false);
  });

  it("drops a vegetarian claim the document never made", () => {
    const raw = rawExtraction();
    raw.items.push(
      rawItem({
        name: "Garden Pizza",
        evidence: "Garden Pizza — tomato, courgette, red onion 10.00",
        proteins: ["veg"],
        vegetarian: true,
      })
    );
    /* Reads meat-free, but the menu never said so — and a dietary flag is a
       hard constraint on the universe, so a guess is not good enough. */
    expect(itemsOf(raw).map((i) => i.name)).not.toContain("Garden Pizza");
  });

  it("drops a vegan claim backed only by a vegetarian marker", () => {
    const raw = rawExtraction();
    raw.items.push(
      rawItem({
        name: "Bianca Pizza",
        evidence: "Bianca Pizza (V) — mozzarella, garlic, rosemary 10.00",
        proteins: ["veg"],
        vegetarian: true,
        vegan: true,
      })
    );
    expect(itemsOf(raw).map((i) => i.name)).not.toContain("Bianca Pizza");
  });

  it("accepts a vegan item the menu marks as vegan", () => {
    const falafel = itemsOf(rawExtraction()).find((i) => i.name === "Falafel Salad");
    expect(falafel?.vegan).toBe(true);
    expect(falafel?.vegetarian).toBe(true);
  });
});

describe("naming — verbatim, or not at all", () => {
  it("preserves the item name exactly as extracted", () => {
    const raw = rawExtraction();
    raw.items[0] = rawItem({ name: "  Nonna's WOOD-FIRED Margherita  " });
    expect(itemsOf(raw)[0].name).toBe("Nonna's WOOD-FIRED Margherita");
  });

  it("rejects an item with no discernible name rather than inventing one", () => {
    const raw = rawExtraction();
    raw.items.push(rawItem({ name: "Unknown", plain: "Something from the grill section." }));
    raw.items.push(rawItem({ name: "   ", plain: "Another unnamed thing." }));
    const items = itemsOf(raw);
    expect(items).toHaveLength(5);
    expect(items.every((i) => i.name.trim().length > 0)).toBe(true);
  });

  it("rejects an item whose plain description just repeats the name", () => {
    const raw = rawExtraction();
    raw.items.push(rawItem({ name: "Echo Pizza", plain: "echo pizza" }));
    expect(itemsOf(raw).map((i) => i.name)).not.toContain("Echo Pizza");
  });
});

describe("size variants collapse into a portion setting", () => {
  it("strips only the size qualifier from a name", () => {
    expect(stripSizeQualifier("Cheeseburger (Single)")).toBe("Cheeseburger");
    expect(stripSizeQualifier("Cheeseburger - Double")).toBe("Cheeseburger");
    expect(stripSizeQualifier("Large Pepperoni Pizza")).toBe("Pepperoni Pizza");
    expect(stripSizeQualifier("Chicken Caesar Salad")).toBe("Chicken Caesar Salad");
  });

  it("turns a single/double pair into one portion-configurable product", () => {
    const raw = rawExtraction();
    raw.items.push(
      rawItem({
        name: "Cheeseburger (Single)",
        plain: "A beef patty with cheese in a soft roll.",
        format: "sandwich",
      }),
      rawItem({
        name: "Cheeseburger (Double)",
        plain: "Two beef patties with cheese in a soft roll.",
        format: "sandwich",
      })
    );

    const burgers = itemsOf(raw).filter((i) => i.name.toLowerCase().includes("cheeseburger"));
    expect(burgers).toHaveLength(1);
    expect(burgers[0].name).toBe("Cheeseburger");
    expect(burgers[0].portion).toBe(true);
  });

  it("keeps same-named variants apart when the dish itself differs", () => {
    const raw = rawExtraction();
    raw.items.push(
      rawItem({
        name: "Large Caesar Salad",
        plain: "Cos leaves, croutons and grilled chicken in a rich dressing.",
        format: "salad",
        proteins: ["chicken"],
        styles: ["creamy"],
      }),
      rawItem({
        name: "Small Caesar Salad",
        plain: "Cos leaves and croutons in a rich dressing, no meat.",
        format: "salad",
        proteins: ["beef"],
        styles: ["creamy"],
      })
    );

    /* Same base name, different main component: two products, not one
       product with a size setting. */
    const caesars = itemsOf(raw).filter((i) => i.name.toLowerCase().includes("caesar salad"));
    expect(caesars).toHaveLength(3);
    expect(caesars.every((i) => i.portion === false)).toBe(true);
  });

  it("deduplicates a repeated listing without inventing a portion setting", () => {
    const raw = rawExtraction();
    raw.items.push(rawItem({ name: "Steak Sandwich", format: "sandwich" }));
    const steaks = itemsOf(raw).filter((i) => i.name === "Steak Sandwich");
    expect(steaks).toHaveLength(1);
    expect(steaks[0].portion).toBe(false);
  });

  it("leaves genuinely distinct products alone", () => {
    const items = itemsOf(rawExtraction());
    expect(items).toHaveLength(5);
    expect(items.every((i) => i.portion === false)).toBe(true);
  });
});

describe("gates on the extraction as a whole", () => {
  it("rejects a menu with too few valid items", () => {
    const raw = rawExtraction();
    raw.items = raw.items.slice(0, 3);
    expect(check(raw)).toEqual({ ok: false, code: "too_few_items" });
  });

  it("rejects a menu with no attribute variety for the engine to work on", () => {
    const raw = rawExtraction();
    raw.items = [
      rawItem({ name: "Margherita" }),
      rawItem({ name: "Marinara" }),
      rawItem({ name: "Bianca" }),
      rawItem({ name: "Ortolana" }),
    ];
    expect(check(raw)).toEqual({ ok: false, code: "no_variety" });
  });

  it("prunes vocabulary options no surviving item uses", () => {
    const raw = rawExtraction();
    raw.vocabulary.style.push({ id: "smoky", label: "Smoky", note: "" });
    const result = check(raw);
    if (!result.ok) throw new Error(result.code);
    expect(result.menu.vocabulary.style.map((o) => o.id)).not.toContain("smoky");
  });

  it("never reports sides on an uploaded menu", () => {
    const result = check(rawExtraction());
    if (!result.ok) throw new Error(result.code);
    expect(result.menu.vocabulary.hasSides).toBe(false);
  });
});
