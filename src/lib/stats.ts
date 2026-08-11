import type { CompiledItem } from "./types";
import { MENU } from "../data/demo-menu";
import { HEAT } from "../data/config";
import { SIDES } from "./recommend";
import { H } from "./entropy";

/* ---------- CONSTRAINTS & STATS (universe-aware) ---------- */
/* Ported from menu-compiler.jsx. Pure functions.

   dietFilter is a CONSTRAINT, not a preference: it shrinks the universe the
   entropy math operates on BEFORE the flow and never competes in the gain
   ranking (see .cursor/rules/000-project.mdc rule 4). */

export function dietFilter(diet: string, items: CompiledItem[] = MENU): CompiledItem[] {
  if (diet === "vegan") return items.filter((p) => p.vegan);
  if (diet === "vegetarian") return items.filter((p) => p.vegetarian);
  return items;
}

export interface Stats {
  products: number;
  formats: Record<string, number>;
  heatCount: number;
  components: number;
  totalBits: number;
}

/* `settings` defaults to the demo dataset's spice scale and side buckets;
   an uploaded menu passes its own counts (and has no sides). */
export interface SettingDimensions {
  heatLevels?: number;
  sideBuckets?: number;
}

export function statsOf(universe: CompiledItem[], settings: SettingDimensions = {}): Stats {
  const formats: Record<string, number> = {};
  universe.forEach((m) => (formats[m.format] = (formats[m.format] || 0) + 1));
  const proteins = new Set(universe.flatMap((m) => (m.vegetarian ? ["veg"] : m.proteins)));
  const styleSet = new Set(universe.flatMap((m) => m.styles));
  const heatCount = universe.filter((m) => m.heat).length;
  const components =
    Object.keys(formats).length +
    proteins.size +
    styleSet.size +
    (settings.heatLevels ?? HEAT.length) +
    (settings.sideBuckets ?? Object.keys(SIDES).length);
  return { products: universe.length, formats, heatCount, components, totalBits: H(universe.length) };
}
