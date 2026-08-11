import { describe, expect, it } from "vitest";
import { ASK_COST, gain, H, subpool } from "./entropy";
import { MENU } from "../data/demo-menu";

/* Acceptance tests for .cursor/rules/010-engine.mdc — "Verified numbers".
   These numbers are the acceptance tests for the engine: if a future change
   to entropy.ts/demo-menu.ts breaks one of these, the change is wrong, not
   the number. Do not loosen a tolerance to make a regression pass.

   Universe is 21 items after collapsing classic grilled single/double
   handhelds into portion-configurable products. */

describe("H — entropy of a pool under a uniform prior", () => {
  it("H(21) ≈ 4.392 for the full demo menu", () => {
    expect(MENU.length).toBe(21);
    expect(H(MENU.length)).toBeCloseTo(4.392, 2);
  });

  it("is 0 for pools of size 0 or 1, per the H(n<=1)=0 definition", () => {
    expect(H(0)).toBe(0);
    expect(H(1)).toBe(0);
  });
});

describe("opening gains on the full 21-item universe", () => {
  const gFormat = gain("format", MENU);
  const gStyle = gain("style", MENU);
  const gProtein = gain("protein", MENU);

  it("gain(format) ≈ 2.27", () => {
    expect(gFormat).toBeCloseTo(2.27, 2);
  });

  it("gain(style) ≈ 1.63", () => {
    expect(gStyle).toBeCloseTo(1.63, 2);
  });

  it("gain(protein) ≈ 1.34", () => {
    expect(gProtein).toBeCloseTo(1.34, 2);
  });

  it("format has the highest opening gain and is asked first", () => {
    expect(gFormat).toBeGreaterThan(gStyle);
    expect(gFormat).toBeGreaterThan(gProtein);
  });
});

describe("self-removal paths", () => {
  it("format=plate then protein=thigh drains style to zero gain — it self-removes", () => {
    const pool = subpool(subpool(MENU, "format", "plate"), "protein", "thigh");
    expect(gain("style", pool)).toBe(0);
  });

  it("format=burger then protein=veg leaves no survivor with heat — heat self-removes", () => {
    const pool = subpool(subpool(MENU, "format", "burger"), "protein", "veg");
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((p) => !p.heat)).toBe(true);
  });

  it("format=wrap then protein=breast resolves to one portion-configurable item — style is zero-gain", () => {
    const pool = subpool(subpool(MENU, "format", "wrap"), "protein", "breast");
    expect(pool.length).toBe(1);
    expect(pool[0].portion).toBe(true);
    expect(gain("style", pool)).toBe(0);
  });
});

describe("dietary constraint universes (applied before the flow, never ranked)", () => {
  it("vegetarian universe is 7 items at 2.81 bits", () => {
    const vegetarian = MENU.filter((p) => p.vegetarian);
    expect(vegetarian.length).toBe(7);
    expect(H(vegetarian.length)).toBeCloseTo(2.81, 2);
  });

  it("vegan universe is 2 items at 1.00 bit", () => {
    const vegan = MENU.filter((p) => p.vegan);
    expect(vegan.length).toBe(2);
    expect(H(vegan.length)).toBeCloseTo(1.0, 2);
  });

  it("under the vegan universe, protein AND style both hit 0 gain — the flow collapses to one question", () => {
    const vegan = MENU.filter((p) => p.vegan);
    expect(gain("protein", vegan)).toBe(0);
    expect(gain("style", vegan)).toBe(0);
  });
});

describe("ASK_COST threshold — a question must earn its tap", () => {
  it("ASK_COST is 0.5 bits", () => {
    expect(ASK_COST).toBe(0.5);
  });

  it("format=bowl then protein=breast: gain(style) ≈ 0.33 < ASK_COST — never asked", () => {
    const pool = subpool(subpool(MENU, "format", "bowl"), "protein", "breast");
    const g = gain("style", pool);
    expect(g).toBeCloseTo(0.33, 2);
    expect(g).toBeLessThan(ASK_COST);
  });
});

describe("config questions never carry product information", () => {
  it("gain(heat), gain(portion) and gain(side) are always 0, regardless of pool", () => {
    expect(gain("heat", MENU)).toBe(0);
    expect(gain("portion", MENU)).toBe(0);
    expect(gain("side", MENU)).toBe(0);
    const pool = subpool(MENU, "format", "plate");
    expect(gain("heat", pool)).toBe(0);
    expect(gain("portion", pool)).toBe(0);
    expect(gain("side", pool)).toBe(0);
  });

  it("exactly three classic grilled handhelds are portion-configurable", () => {
    const portioned = MENU.filter((p) => p.portion);
    expect(portioned.map((p) => p.id).sort()).toEqual([
      "grilled-burger",
      "grilled-pitta",
      "grilled-wrap",
    ]);
  });
});
