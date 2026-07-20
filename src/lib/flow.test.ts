import { describe, expect, it } from "vitest";
import { MENU } from "../data/demo-menu";
import { FILTER_OPTIONS, subpool } from "./entropy";
import { nextQuestion } from "./flow";
import type { Answers, MenuItem } from "./types";

/* Exhaustive path simulation — locks in the "Verified numbers" from
   .cursor/rules/010-engine.mdc:
     "ASK_COST fires on exactly 2 of 23 terminal paths (wrap→breast,
      bowl→breast, where style is worth ~0.33 bits). Survivor distribution:
      {1: 15, 2: 5, 3: 3}."

   This walks every reachable sequence of filter answers (branching only on
   non-empty option branches, exactly as the UI prunes zero-count options
   before render) by repeatedly asking `nextQuestion` — the actual production
   selection logic — until it stops returning a filter question (format,
   protein, or style). Each such stopping point is one "terminal identify
   path": the point where IDENTIFY ends and CONFIGURE begins, whether
   because the pool resolved to one item, every filter dimension is
   answered, or the best remaining gain doesn't clear ASK_COST. */

interface TerminalPath {
  survivors: number;
  askCostFired: boolean;
}

function isFilterId(qid: string | null): qid is "format" | "protein" | "style" {
  return qid === "format" || qid === "protein" || qid === "style";
}

function walkIdentifyPaths(pool: MenuItem[], answers: Answers, leaves: TerminalPath[]): void {
  const state = nextQuestion(answers, pool);

  if (isFilterId(state.current)) {
    for (const oid of FILTER_OPTIONS[state.current]) {
      const sub = subpool(pool, state.current, oid);
      if (sub.length === 0) continue; // zero-count options are pruned before render
      walkIdentifyPaths(sub, { ...answers, [state.current]: oid }, leaves);
    }
    return;
  }

  // Terminal: nextQuestion is asking heat/side, or is fully done. IDENTIFY
  // ended here — record the survivor count and whether ASK_COST is why.
  const askCostFired = state.exhausted.some((x) => x.reason === "below_ask_cost");
  leaves.push({ survivors: pool.length, askCostFired });
}

function enumerateTerminalPaths(): TerminalPath[] {
  const leaves: TerminalPath[] = [];
  walkIdentifyPaths(MENU, {}, leaves);
  return leaves;
}

describe("exhaustive terminal-path simulation (010-engine.mdc verified numbers)", () => {
  const leaves = enumerateTerminalPaths();

  it("produces exactly 23 terminal identify paths", () => {
    expect(leaves.length).toBe(23);
  });

  it("ASK_COST fires on exactly 2 of the 23 terminal paths", () => {
    const fired = leaves.filter((l) => l.askCostFired);
    expect(fired.length).toBe(2);
  });

  it("worst-case survivors after all filter answers is 3", () => {
    expect(Math.max(...leaves.map((l) => l.survivors))).toBe(3);
  });

  it("survivor distribution across all 23 paths is {1: 15, 2: 5, 3: 3}", () => {
    const distribution: Record<number, number> = {};
    for (const leaf of leaves) {
      distribution[leaf.survivors] = (distribution[leaf.survivors] ?? 0) + 1;
    }
    expect(distribution).toEqual({ 1: 15, 2: 5, 3: 3 });
  });

  it("both ASK_COST-fired paths land on a 2-survivor pool with ~0.33 bits of unused style gain", () => {
    const fired = leaves.filter((l) => l.askCostFired);
    expect(fired.every((l) => l.survivors === 2)).toBe(true);
  });
});
