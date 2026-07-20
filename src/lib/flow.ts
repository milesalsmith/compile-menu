import type { Answers, MenuItem, QuestionId } from "./types";
import { ASK_COST, FILTER_QUESTION_IDS, gain, H, subpool } from "./entropy";

/* ---------- FLOW (universe-aware, argmax-gain question selection) ---------- */
/* Ported from menu-compiler.jsx's `flow`/`filterProducts`/`trace` useMemos —
   see .cursor/rules/010-engine.mdc for the invariants this file must
   preserve. Pure functions, no React dependency. */

export type FilterQuestionId = (typeof FILTER_QUESTION_IDS)[number];

function isFilterQuestion(qid: QuestionId): qid is FilterQuestionId {
  return (FILTER_QUESTION_IDS as readonly QuestionId[]).includes(qid);
}

/* Apply each answered FILTER question's subpool in turn. Heat/side answers
   are present in `answers` too but never narrow the pool — subpool()
   already no-ops for them, this guard just skips the call entirely. */
export function filterProducts(answers: Answers, universe: MenuItem[]): MenuItem[] {
  let pool = universe;
  for (const [qid, oid] of Object.entries(answers)) {
    if (oid === undefined) continue;
    if (isFilterQuestion(qid as QuestionId)) pool = subpool(pool, qid as QuestionId, oid);
  }
  return pool;
}

export interface QuestionGain {
  qid: FilterQuestionId;
  gain: number;
}

/* Why a question removed itself, disclosed in the UI rather than hidden:
   - "zero_gain": the pool already carries no information on this dimension
     (e.g. every survivor shares the same style) — the math resolved it.
   - "below_ask_cost": there IS gain, but it doesn't clear ASK_COST — the tap
     isn't worth it.
   - "not_applicable": heat only, when no remaining item is heat-configurable. */
export type ExhaustReason = "zero_gain" | "below_ask_cost" | "not_applicable";

export interface ExhaustedQuestion {
  qid: QuestionId;
  gain: number;
  reason: ExhaustReason;
}

function exhaustReason(qid: QuestionId, g: number): ExhaustReason {
  if (qid === "heat") return "not_applicable";
  return g <= 1e-9 ? "zero_gain" : "below_ask_cost";
}

export type Phase = "identify" | "configure";

/* Mirrors the reference's `phase = flow.current?.kind === "config" ?
   "configure" : "identify"` exactly, including for `current === null`
   (where the reference's optional-chain also evaluates to "identify" — that
   state is dead in the UI, since it immediately routes to the results
   screen, but this keeps the derivation identical rather than inventing a
   third value). */
function phaseFor(current: QuestionId | null): Phase {
  return current === "heat" || current === "side" ? "configure" : "identify";
}

export interface FlowState {
  /* The next question to ask, or null when the flow is complete. Named
     `currentId` (not `current`) deliberately: React Compiler's lint treats
     any `.current` member access as a ref access. */
  currentId: QuestionId | null;
  phase: Phase;
  gains: QuestionGain[];
  exhausted: ExhaustedQuestion[];
}

/* Next-question selection. Argmax-gain unanswered filter question if its
   gain clears ASK_COST; else heat (only if a survivor still has heat), then
   side, then done. Ports the reference's `flow` useMemo exactly, including
   the "heat wasn't applicable" backfill into `exhausted` when we fall
   through straight to side. */
export function nextQuestion(answers: Answers, pool: MenuItem[]): FlowState {
  const gains: QuestionGain[] = FILTER_QUESTION_IDS.filter((qid) => answers[qid] === undefined)
    .map((qid) => ({ qid, gain: gain(qid, pool) }))
    .sort((a, b) => b.gain - a.gain);

  const exhausted: ExhaustedQuestion[] = gains
    .filter((x) => x.gain <= ASK_COST)
    .map((x) => ({ qid: x.qid, gain: x.gain, reason: exhaustReason(x.qid, x.gain) }));

  if (gains.length && gains[0].gain > ASK_COST) {
    return { currentId: gains[0].qid, phase: phaseFor(gains[0].qid), gains, exhausted: [] };
  }

  const heatApplies = pool.some((p) => p.heat);
  if (answers.heat === undefined && heatApplies) {
    return { currentId: "heat", phase: phaseFor("heat"), gains, exhausted };
  }

  if (answers.side === undefined) {
    const finalExhausted: ExhaustedQuestion[] =
      answers.heat === undefined && !heatApplies
        ? [...exhausted, { qid: "heat", gain: 0, reason: "not_applicable" }]
        : exhausted;
    return { currentId: "side", phase: phaseFor("side"), gains, exhausted: finalExhausted };
  }

  return { currentId: null, phase: phaseFor(null), gains, exhausted };
}

export interface HistoryEntry {
  qid: QuestionId;
  oid: string;
}

export interface EntropyTraceRow {
  qid: QuestionId;
  oid: string;
  hBefore: number;
  hAfter: number;
}

/* Per-answer entropy trace: pool size and H before/after each answer, in
   the order answered. Ports the reference's `trace` useMemo exactly. */
export function entropyTrace(history: HistoryEntry[], universe: MenuItem[]): EntropyTraceRow[] {
  const rows: EntropyTraceRow[] = [];
  let acc: Answers = {};
  let prevPool = universe;
  for (const h of history) {
    acc = { ...acc, [h.qid]: h.oid };
    const next = filterProducts(acc, universe);
    rows.push({ qid: h.qid, oid: h.oid, hBefore: H(prevPool.length), hAfter: H(next.length) });
    prevPool = next;
  }
  return rows;
}
