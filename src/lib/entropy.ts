import type { MenuItem, QuestionId } from "./types";

/* ---------- ID3 ENGINE (universe-aware) ---------- */
/* Ported from menu-compiler.jsx — see .cursor/rules/010-engine.mdc for the
   invariants this file must preserve. Pure functions, no React dependency. */

/* Cost of asking: a question must EARN its tap. Any question whose best-case
   information gain doesn't clear this bar is skipped and the tie-break
   resolves the rest. This is cost-sensitive induction — the same product
   philosophy as Cursor's Tab policy (suggest only when P(accept) > 25%),
   except our threshold is computed from the data, not learned from usage. */
export const ASK_COST = 0.5; // bits

export function H(n: number): number {
  return n <= 1 ? 0 : Math.log2(n);
}

/* Option ids for each filter question, mirroring QUESTIONS in
   menu-compiler.jsx. Only format/protein/style narrow the pool — heat and
   side are zero-gain settings, not products (see rule 010-engine.mdc). */
const FILTER_OPTIONS: Record<"format" | "protein" | "style", readonly string[]> = {
  format: ["burger", "pitta", "wrap", "plate", "bowl"],
  protein: ["breast", "thigh", "wings", "veg"],
  style: ["classic", "cheesy", "garlicky", "loaded", "fresh"],
};

export function subpool(pool: MenuItem[], qid: QuestionId, oid: string): MenuItem[] {
  if (qid === "format") return pool.filter((p) => p.format === oid);
  if (qid === "protein")
    return pool.filter((p) =>
      oid === "veg" ? p.vegetarian : !p.vegetarian && (p.proteins as readonly string[]).includes(oid)
    );
  if (qid === "style") return pool.filter((p) => (p.styles as readonly string[]).includes(oid));
  return pool; // heat & side never narrow the product set
}

export function gain(qid: QuestionId, pool: MenuItem[]): number {
  if (qid === "heat" || qid === "side") return 0;
  const options = FILTER_OPTIONS[qid];
  const sizes = options.map((oid) => subpool(pool, qid, oid).length).filter((n) => n > 0);
  if (sizes.length <= 1) return 0;
  const tot = sizes.reduce((a, b) => a + b, 0);
  const expected = sizes.reduce((s, n) => s + (n / tot) * H(n), 0);
  return Math.max(0, H(pool.length) - expected);
}
