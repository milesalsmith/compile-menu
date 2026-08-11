import { describe, expect, it } from "vitest";
import type { Answers, QuestionId } from "../types";
import { ASK_COST, gain } from "../entropy";
import { filterProducts, nextQuestion } from "../flow";
import { recommend } from "../recommend";
import { uploadedMenu } from "../menu";
import { MENU } from "../../data/demo-menu";
import { validateExtraction } from "./validate";
import { rawExtraction, sourceFor } from "./fixtures";

/* An extracted menu is just another universe: once validated it goes through
   the same deterministic engine the demo dataset does, with no special
   casing anywhere in entropy.ts or flow.ts. */

function compiledUpload() {
  const extraction = rawExtraction();
  const result = validateExtraction(extraction, sourceFor(extraction));
  if (!result.ok) throw new Error(result.code);
  return uploadedMenu("menu.pdf", result.menu.items, result.menu.vocabulary);
}

/* Walk the flow answering the first available option every time. */
function walk(menu: ReturnType<typeof compiledUpload>) {
  const { filterOptions, vocabulary, questions } = menu;
  const hasSides = vocabulary.hasSides;
  let answers: Answers = {};
  const asked: QuestionId[] = [];

  for (let step = 0; step < 10; step++) {
    const pool = filterProducts(answers, menu.items);
    const flow = nextQuestion(answers, pool, { filterOptions, hasSides });
    if (!flow.currentId) break;
    const question = questions.find((q) => q.id === flow.currentId);
    if (!question) throw new Error(`no question defined for ${flow.currentId}`);
    const option =
      question.kind === "filter"
        ? question.options.find((o) => filterProducts({ ...answers, [question.id]: o.id }, menu.items).length > 0)
        : question.options[0];
    if (!option) throw new Error(`no answerable option for ${question.id}`);
    asked.push(question.id);
    answers = { ...answers, [question.id]: option.id };
  }

  return { answers, asked, result: recommend(answers, menu.items) };
}

describe("an extracted menu enters the existing compiler unchanged", () => {
  const menu = compiledUpload();

  it("opens on the highest-gain question, computed from the uploaded vocabulary", () => {
    const gains = (["format", "protein", "style"] as const).map((qid) => ({
      qid,
      g: gain(qid, menu.items, menu.filterOptions),
    }));
    const best = gains.reduce((a, b) => (b.g > a.g ? b : a));
    expect(best.g).toBeGreaterThan(ASK_COST);

    const flow = nextQuestion({}, menu.items, {
      filterOptions: menu.filterOptions,
      hasSides: menu.vocabulary.hasSides,
    });
    expect(flow.currentId).toBe(best.qid);
    expect(flow.phase).toBe("identify");
  });

  it("never asks about sides, because an uploaded menu has none", () => {
    const { asked } = walk(menu);
    expect(asked).not.toContain("side");
  });

  it("still treats spice and portion as zero-gain settings", () => {
    expect(gain("heat", menu.items, menu.filterOptions)).toBe(0);
    expect(gain("portion", menu.items, menu.filterOptions)).toBe(0);
    expect(gain("side", menu.items, menu.filterOptions)).toBe(0);
  });

  it("terminates and reaches a single recommendation", () => {
    const { result, asked } = walk(menu);
    expect(asked.length).toBeGreaterThan(0);
    expect(result.pick).toBeDefined();
    expect(menu.items).toContain(result.pick);
  });

  it("is deterministic: the same answers give the same pick every time", () => {
    const first = walk(menu);
    const second = walk(menu);
    expect(second.answers).toEqual(first.answers);
    expect(second.result.pick.id).toBe(first.result.pick.id);
    expect(second.result.ranked.map((p) => p.id)).toEqual(first.result.ranked.map((p) => p.id));
  });

  it("shows the real name and a component description on the pick", () => {
    const { result } = walk(menu);
    expect(result.pick.name.length).toBeGreaterThan(0);
    expect(result.pick.plain.length).toBeGreaterThan(0);
    expect(result.pick.plain.toLowerCase()).not.toBe(result.pick.name.toLowerCase());
  });

  it("leaves the demo dataset untouched", () => {
    expect(MENU).toHaveLength(21);
    expect(menu.items.some((i) => MENU.some((m) => m.id === i.id))).toBe(false);
  });
});
