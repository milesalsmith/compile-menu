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

function groupKey(item: CompiledItem): string {
  return [
    stripSizeQualifier(item.name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
    item.format,
    item.vegetarian ? "v" : "-",
    item.vegan ? "V" : "-",
  ].join("|");
}

function union(a: string[], b: string[]): string[] {
  const out = [...a];
  for (const value of b) if (!out.includes(value)) out.push(value);
  return out;
}

/* Items that describe the same dish at different sizes become one item with
   portion: true, keeping the earliest occurrence's name minus the size word. */
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
    const [first, ...rest] = group;
    if (rest.length === 0) return first;

    return {
      ...first,
      name: stripSizeQualifier(first.name),
      proteins: rest.reduce<string[]>((acc, p) => union(acc, p.proteins), first.proteins),
      styles: rest.reduce<string[]>((acc, p) => union(acc, p.styles), first.styles),
      heat: group.some((p) => p.heat),
      portion: true,
    };
  });
}
