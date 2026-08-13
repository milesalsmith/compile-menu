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
    expect(validateExtraction("[]", "")).toMatchObject({ ok: false, code: "invalid_output" });
    expect(validateExtraction(null, "")).toMatchObject({ ok: false, code: "invalid_output" });
    expect(validateExtraction([rawItem()], "")).toMatchObject({ ok: false, code: "invalid_output" });
  });

  it("accepts a dish list without a model-declared vocabulary and derives one", () => {
    const raw = rawExtraction();
    const result = validateExtraction({ items: raw.items }, sourceFor(raw));
    if (!result.ok) throw new Error(result.code);
    expect(result.menu.vocabulary.format.map((o) => o.id).sort()).toEqual(
      ["pizza", "salad", "sandwich"].sort()
    );
    expect(result.slice.modelShape).toMatchObject({
      kind: "object",
      itemsKey: "items",
      itemCount: 5,
    });
  });

  it("treats a dishes/mains wrapper as the items list, without repairing contents", () => {
    const raw = rawExtraction();
    const result = validateExtraction({ dishes: raw.items }, sourceFor(raw));
    if (!result.ok) throw new Error(result.code);
    expect(result.menu.items).toHaveLength(5);
    expect(result.slice.modelShape?.itemsKey).toBe("dishes");
  });

  it("records the model shape when there is no items array", () => {
    const result = validateExtraction({ menu: "tacos", count: 12 }, "");
    expect(result).toMatchObject({ ok: false, code: "invalid_output" });
    expect(result.slice.modelShape).toMatchObject({
      kind: "object",
      keys: ["menu", "count"],
      itemsKey: null,
      itemCount: null,
    });
    expect(result.slice.proposed).toBe(0);
  });

  it("accepts singular style/protein strings without inventing values", () => {
    const extraction = rawExtraction();
    const items = [
      ...extraction.items.map(({ evidence: _ignored, ...item }) => item),
      {
        name: "Galouti kebab",
        plain: "Minced lamb patties with warming spices.",
        format: "plate",
        protein: "lamb",
        style: "spicy",
      },
    ];
    const source = `${sourceFor(extraction)}\nGalouti kebab — minced lamb, warming spices 12.50\n`;
    const result = validateExtraction({ items }, source);
    if (!result.ok) throw new Error(result.code);
    const galouti = result.menu.items.find((i) => i.name === "Galouti kebab");
    expect(galouti?.proteins).toEqual(["lamb"]);
    expect(galouti?.styles).toEqual(["spicy"]);
  });

  it("rejects a style that is a recipe sentence rather than a flavour family", () => {
    const raw = rawExtraction();
    raw.items.push(
      rawItem({
        name: "Nandu Pillow",
        styles: "sweet chilli fenugreek paprika with pakora and chat puri",
      })
    );
    const result = validateExtraction(raw, sourceFor(raw));
    if (!result.ok) throw new Error(result.code);
    expect(result.menu.items.map((i) => i.name)).not.toContain("Nandu Pillow");
    expect(result.slice.drops.unknown_style).toBeGreaterThanOrEqual(1);
  });

  it("drops an item whose format is not a usable slug", () => {
    const raw = rawExtraction();
    raw.items.push(rawItem({ name: "Mystery Bowl", format: "" }));
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
    expect(check(raw)).toMatchObject({ ok: false, code: "unsafe_field" });
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

/* Attribute slugs and a model-declared vocabulary only prove the model
   agrees with itself. These check the one input it did not write: the
   converted document. */
describe("source grounding — the document is the authority, not the model", () => {
  it("records why an ungrounded item was dropped without failing the whole menu", () => {
    const raw = rawExtraction();
    raw.items.push(rawItem({ name: "Truffle Pizza", evidence: "Truffle Pizza 14.00" }));
    const result = validateExtraction(raw, sourceFor(rawExtraction()));
    if (!result.ok) throw new Error(result.code);
    expect(result.slice.drops.evidence_not_in_source).toBeGreaterThanOrEqual(1);
    expect(result.slice.samples.some((s) => s.name === "Truffle Pizza")).toBe(true);
    expect(result.menu.items.map((i) => i.name)).not.toContain("Truffle Pizza");
  });

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

  it("grounds by name alone when evidence is omitted", () => {
    const extraction = rawExtraction();
    const items = extraction.items.map(({ evidence: _ignored, ...item }) => item);
    const result = validateExtraction({ items }, sourceFor(extraction));
    if (!result.ok) throw new Error(result.code);
    expect(result.menu.items).toHaveLength(5);
  });

  it("folds apostrophes so Cinco's and CINCOS are the same printed name", () => {
    const extraction = rawExtraction();
    const items = [
      ...extraction.items.map(({ evidence: _ignored, ...item }) => item),
      {
        name: "CINCO'S NACHOS",
        plain: "Tortilla chips with cheese, salsa and jalapenos.",
        format: "plate",
        proteins: ["veg"],
        styles: ["classic"],
        vegetarian: true,
      },
    ];
    const source = `${sourceFor(extraction)}\nCinco Nachos (V) — chips, cheese, salsa 8.50\n`;
    const result = validateExtraction({ items }, source);
    if (!result.ok) throw new Error(result.code);
    expect(result.menu.items.map((i) => i.name)).toContain("CINCO'S NACHOS");
  });

  it("folds diacritics and compound words without renaming the dish", () => {
    const extraction = rawExtraction();
    const items = [
      ...extraction.items.map(({ evidence: _ignored, ...item }) => item),
      {
        name: "FIRE CRACKER JALAPEÑOS",
        plain: "Battered jalapenos with a chilli dip.",
        format: "plate",
        proteins: ["veg"],
        styles: ["spicy"],
        vegetarian: true,
      },
    ];
    const source = `${sourceFor(extraction)}\nFirecracker Jalapenos (V) 6.50\n`;
    const result = validateExtraction({ items }, source);
    if (!result.ok) throw new Error(result.code);
    expect(result.menu.items.map((i) => i.name)).toContain("FIRE CRACKER JALAPEÑOS");
  });

  it("drops an item whose name never appears in the document when evidence is omitted", () => {
    const extraction = rawExtraction();
    const items = [
      ...extraction.items.map(({ evidence: _ignored, ...item }) => item),
      {
        name: "Truffle Pizza",
        plain: "A thin base with mushroom and mozzarella.",
        format: "pizza",
        proteins: ["beef"],
        styles: ["classic"],
      },
    ];
    const result = validateExtraction({ items }, sourceFor(extraction));
    if (!result.ok) throw new Error(result.code);
    expect(result.slice.drops.name_not_in_source).toBeGreaterThanOrEqual(1);
    expect(result.menu.items.map((i) => i.name)).not.toContain("Truffle Pizza");
  });

  it("defaults omitted dietary and settings flags to false", () => {
    const raw = rawExtraction();
    raw.items.push({
      name: "Calzone",
      evidence: "Calzone — folded pizza 11.00",
      plain: "A folded pizza with tomato and mozzarella.",
      format: "pizza",
      proteins: ["beef"],
      styles: ["classic"],
    });
    const calzone = itemsOf(raw).find((i) => i.name === "Calzone");
    expect(calzone?.vegetarian).toBe(false);
    expect(calzone?.vegan).toBe(false);
    expect(calzone?.heat).toBe(false);
    expect(calzone?.portion).toBe(false);
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

  it("grounds a vegetarian claim from the line around the name when evidence is omitted", () => {
    const extraction = rawExtraction();
    const items = [
      ...extraction.items.map(({ evidence: _ignored, ...item }) => item),
      {
        name: "Garden Pizza",
        plain: "Tomato, courgette and red onion on a thin base.",
        format: "pizza",
        proteins: ["veg"],
        styles: ["classic"],
        vegetarian: true,
      },
    ];
    const source = `${sourceFor(extraction)}\nGarden Pizza (V) — tomato, courgette, red onion 10.00\n`;
    const result = validateExtraction({ items }, source);
    if (!result.ok) throw new Error(result.code);
    expect(result.menu.items.find((i) => i.name === "Garden Pizza")?.vegetarian).toBe(true);
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
    expect(check(raw)).toMatchObject({ ok: false, code: "too_few_items" });
  });

  it("rejects a menu with no attribute variety for the engine to work on", () => {
    const raw = rawExtraction();
    raw.items = [
      rawItem({ name: "Margherita" }),
      rawItem({ name: "Marinara" }),
      rawItem({ name: "Bianca" }),
      rawItem({ name: "Ortolana" }),
    ];
    expect(check(raw)).toMatchObject({ ok: false, code: "no_variety" });
  });

  it("derives vocabulary only from surviving items, ignoring a model option list", () => {
    const raw = rawExtraction();
    raw.vocabulary = {
      format: raw.vocabulary?.format ?? [],
      protein: raw.vocabulary?.protein ?? [],
      style: [
        ...(raw.vocabulary?.style ?? []),
        { id: "smoky", label: "Smoky", note: "" },
      ],
    };
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
