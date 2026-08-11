import { describe, expect, it } from "vitest";
import { MENU } from "../data/demo-menu";
import { FILTER_OPTIONS, subpool } from "./entropy";
import { nextQuestion } from "./flow";
import type { Answers, MenuItem } from "./types";

/* Exhaustive path simulation — locks in the verified numbers from
   .cursor/rules/010-engine.mdc after the portion-as-config dataset change:
     ASK_COST fires on exactly 1 of 23 terminal paths (bowl→breast, where
     style is worth ~0.33 bits). Survivor distribution: {1: 17, 2: 4, 3: 2}.

   wrap→breast no longer trips ASK_COST: collapsing single/double wrap into
   one portion-configurable product leaves a single survivor, so style is
   zero-gain rather than below-cost. */

interface TerminalPath {
  survivors: number;
  askCostFired: boolean;
}

function isFilterId(qid: string | null): qid is "format" | "protein" | "style" {
  return qid === "format" || qid === "protein" || qid === "style";
}

function walkIdentifyPaths(pool: MenuItem[], answers: Answers, leaves: TerminalPath[]): void {
  const state = nextQuestion(answers, pool);

  if (isFilterId(state.currentId)) {
    for (const oid of FILTER_OPTIONS[state.currentId]) {
      const sub = subpool(pool, state.currentId, oid);
      if (sub.length === 0) continue;
      walkIdentifyPaths(sub, { ...answers, [state.currentId]: oid }, leaves);
    }
    return;
  }

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

  it("ASK_COST fires on exactly 1 of the 23 terminal paths", () => {
    const fired = leaves.filter((l) => l.askCostFired);
    expect(fired.length).toBe(1);
  });

  it("worst-case survivors after all filter answers is 3", () => {
    expect(Math.max(...leaves.map((l) => l.survivors))).toBe(3);
  });

  it("survivor distribution across all 23 paths is {1: 17, 2: 4, 3: 2}", () => {
    const distribution: Record<number, number> = {};
    for (const leaf of leaves) {
      distribution[leaf.survivors] = (distribution[leaf.survivors] ?? 0) + 1;
    }
    expect(distribution).toEqual({ 1: 17, 2: 4, 3: 2 });
  });

  it("the ASK_COST-fired path lands on a 2-survivor pool (bowl→breast)", () => {
    const fired = leaves.filter((l) => l.askCostFired);
    expect(fired).toHaveLength(1);
    expect(fired[0].survivors).toBe(2);
  });
});
