import { describe, expect, it } from "vitest";
import { validateExtraction } from "./validate";
import { stripSizeQualifier } from "./portion";
import { rawExtraction, rawItem } from "./fixtures";

function itemsOf(raw: unknown) {
  const result = validateExtraction(raw);
  if (!result.ok) throw new Error(`expected a valid menu, got ${result.code}`);
  return result.menu.items;
}

describe("shape validation — model output is checked, never repaired", () => {
  it("accepts a well-formed extraction", () => {
    const result = validateExtraction(rawExtraction());
    expect(result.ok).toBe(true);
  });

  it("rejects output that is not an object", () => {
    expect(validateExtraction("[]")).toEqual({ ok: false, code: "invalid_output" });
    expect(validateExtraction(null)).toEqual({ ok: false, code: "invalid_output" });
    expect(validateExtraction([rawItem()])).toEqual({ ok: false, code: "invalid_output" });
  });

  it("rejects output with no declared vocabulary", () => {
    const raw = rawExtraction();
    expect(validateExtraction({ items: raw.items })).toEqual({ ok: false, code: "invalid_output" });
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
    expect(validateExtraction(raw)).toEqual({ ok: false, code: "unsafe_field" });
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
        proteins: ["beef"],
        styles: ["classic"],
        vegetarian: false,
      }),
      rawItem({
        name: "Cheeseburger (Double)",
        plain: "Two beef patties with cheese in a soft roll.",
        format: "sandwich",
        proteins: ["beef"],
        styles: ["classic"],
        vegetarian: false,
      })
    );

    const items = itemsOf(raw);
    const burgers = items.filter((i) => i.name.toLowerCase().includes("cheeseburger"));
    expect(burgers).toHaveLength(1);
    expect(burgers[0].name).toBe("Cheeseburger");
    expect(burgers[0].portion).toBe(true);
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
    expect(validateExtraction(raw)).toEqual({ ok: false, code: "too_few_items" });
  });

  it("rejects a menu with no attribute variety for the engine to work on", () => {
    const raw = rawExtraction();
    raw.items = [
      rawItem({ name: "Margherita" }),
      rawItem({ name: "Marinara" }),
      rawItem({ name: "Bianca" }),
      rawItem({ name: "Ortolana" }),
    ];
    expect(validateExtraction(raw)).toEqual({ ok: false, code: "no_variety" });
  });

  it("prunes vocabulary options no surviving item uses", () => {
    const raw = rawExtraction();
    raw.vocabulary.style.push({ id: "smoky", label: "Smoky", note: "" });
    const result = validateExtraction(raw);
    if (!result.ok) throw new Error(result.code);
    expect(result.menu.vocabulary.style.map((o) => o.id)).not.toContain("smoky");
  });

  it("never reports sides on an uploaded menu", () => {
    const result = validateExtraction(rawExtraction());
    if (!result.ok) throw new Error(result.code);
    expect(result.menu.vocabulary.hasSides).toBe(false);
  });
});
