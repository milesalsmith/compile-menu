import type { Answers, CompiledItem } from "./types";
import { filterProducts } from "./flow";

/* ---------- RECOMMEND (tie-break + pick/alt) & SIDES ---------- */
/* Ported from menu-compiler.jsx — see .cursor/rules/010-engine.mdc. Pure
   functions, no React dependency.

   Tie-break ONLY — disclosed as such, never presented as the engine. It
   only ever runs on survivors that are already identical on every asked
   dimension (0 bits of remaining gain), so it can't override the entropy
   ranking; it just needs to pick deterministically among ties. */
export function tieBreak(p: CompiledItem, answers: Answers): number {
  let t = 0;
  if (answers.protein && answers.protein !== "veg" && p.proteins.length === 1) t += 1;
  if (answers.style) t += p.styles.filter((s) => s === answers.style).length;
  return t;
}

export interface RecommendResult<T extends CompiledItem = CompiledItem> {
  pick: T;
  alt: T | undefined;
  ranked: T[];
}

/* Callers always pass a non-empty universe: dietFilter never empties the demo
   menu, and extraction rejects any menu under four items. */
export function recommend<T extends CompiledItem>(
  answers: Answers,
  universe: T[]
): RecommendResult<T> {
  const pool = filterProducts(answers, universe);
  const ranked = [...pool].sort((a, b) => tieBreak(b, answers) - tieBreak(a, answers));
  const pick = ranked[0] || universe[0];
  const alt = ranked[1] || universe.find((p) => p.id !== pick.id);
  return { pick, alt, ranked: ranked.length ? ranked : [pick] };
}

/* Sides are a zero-gain setting (see 010-engine.mdc) — identical on every
   main, so the pair is just read off the chosen bucket (or a "surprise"
   spin across buckets), never derived from the pool. */
export const SIDES = {
  crispy: ["Salted Chips", "Garlic Bread"],
  filling: ["Spicy Rice", "Creamy Mash"],
  fresh: ["Crunchy Slaw", "Corn on the Cob"],
} as const;

type SideKey = keyof typeof SIDES;

export function sidePair(choice?: string): [string, string] {
  if (!choice || choice === "surprise") {
    const keys = Object.keys(SIDES) as SideKey[];
    const a = keys[Math.floor(Math.random() * keys.length)];
    return [SIDES[a][0], SIDES[keys[(keys.indexOf(a) + 1) % keys.length]][0]];
  }
  const other: SideKey = choice === "fresh" ? "crispy" : "fresh";
  return [SIDES[choice as SideKey][0], SIDES[other][0]];
}
