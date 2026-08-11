import type { CompiledItem } from "../types";

/* ---------- SIZE VARIANTS -> PORTION SETTING ---------- */
/* Real menus list the same dish twice at two sizes. Two near-identical
   products is exactly the problem this tool exists to solve, so a residual
   pair collapses into one product with portion: true.

   Stripping a trailing or leading size word is the ONE permitted edit to an
   uploaded item's name: it is deterministic and inspectable, not a paraphrase
   (rule 000-project.mdc rule 6b). Fractions like "1/2" and "1/4" are
   deliberately absent — those can be genuinely different builds, not just
   more of the same thing. */
const SIZE_WORDS = [
  "single",
  "double",
  "triple",
  "small",
  "medium",
  "large",
  "regular",
  "standard",
  "mini",
  "junior",
  "kids",
  "half",
  "whole",
  "xl",
  "sm",
  "lg",
];

const SIZE_WORD_SET = new Set(SIZE_WORDS);

/* Strip parenthesised or bracketed groups made only of size words, then any
   leading/trailing size words. Casing and inner spacing are preserved. */
export function stripSizeQualifier(name: string): string {
  let out = name.replace(/[([]([^)\]]*)[)\]]/g, (whole, inner: string) => {
    const words = inner
      .toLowerCase()
      .split(/[\s/,|+&-]+/)
      .filter(Boolean);
    if (words.length > 0 && words.every((w) => SIZE_WORD_SET.has(w) || w === "or")) return " ";
    return whole;
  });

  out = out.replace(/[\s]*[-–—/|,]?[\s]*$/, "");

  let previous = "";
  while (previous !== out) {
    previous = out;
    out = out
      .replace(new RegExp(`^\\s*(${SIZE_WORDS.join("|")})\\b[\\s-–—/|,]*`, "i"), "")
      .replace(new RegExp(`[\\s-–—/|,]*\\b(${SIZE_WORDS.join("|")})\\s*$`, "i"), "");
  }

  const cleaned = out.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : name.trim();
}

function baseName(name: string): string {
  return stripSizeQualifier(name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/* Two entries are the same dish only if EVERYTHING the engine decides on
   agrees — not just the name with its size word removed. A matching base
   name on differing attributes means they are different products that happen
   to be named alike, and merging them would erase a real branch of the
   decision tree. */
function groupKey(item: CompiledItem): string {
  return [
    baseName(item.name),
    item.format,
    [...item.proteins].sort().join(","),
    [...item.styles].sort().join(","),
    item.vegetarian ? "veg" : "-",
    item.vegan ? "vegan" : "-",
    item.heat ? "heat" : "-",
  ].join("|");
}

/* Same dish at two sizes becomes one product with portion: true. An entry
   listed twice under the identical name is a duplicate, not a size variant:
   it collapses to one product without gaining a portion setting nobody
   offered. */
export function collapseSizeVariants(items: CompiledItem[]): CompiledItem[] {
  const order: string[] = [];
  const groups = new Map<string, CompiledItem[]>();

  for (const item of items) {
    const key = groupKey(item);
    const existing = groups.get(key);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(key, [item]);
      order.push(key);
    }
  }

  return order.map((key) => {
    const group = groups.get(key) ?? [];
    const first = group[0];
    if (group.length === 1) return first;

    const names = new Set(group.map((p) => p.name.toLowerCase()));
    if (names.size === 1) return first;

    return { ...first, name: stripSizeQualifier(first.name), portion: true };
  });
}
