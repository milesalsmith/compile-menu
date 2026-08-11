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

/* Apply each answered FILTER question's subpool in turn. Config answers
   (heat/portion/side) are present in `answers` too but never narrow the
   pool — subpool() already no-ops for them; this guard skips the call. */
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
   - "not_applicable": heat/portion, when no remaining item is configurable. */
export type ExhaustReason = "zero_gain" | "below_ask_cost" | "not_applicable";

export interface ExhaustedQuestion {
  qid: QuestionId;
  gain: number;
  reason: ExhaustReason;
}

function exhaustReason(qid: QuestionId, g: number): ExhaustReason {
  if (qid === "heat" || qid === "portion") return "not_applicable";
  return g <= 1e-9 ? "zero_gain" : "below_ask_cost";
}

export type Phase = "identify" | "configure";

function isConfigQuestion(qid: QuestionId | null): boolean {
  return qid === "heat" || qid === "portion" || qid === "side";
}

function phaseFor(current: QuestionId | null): Phase {
  return isConfigQuestion(current) ? "configure" : "identify";
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
   gain clears ASK_COST; else heat (if applicable), then portion (if any
   survivor is portion-configurable), then side, then done. Config
   not-applicable backfills into `exhausted` when we skip past them. */
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

  const portionApplies = pool.some((p) => p.portion);
  if (answers.portion === undefined && portionApplies) {
    const withHeat: ExhaustedQuestion[] =
      answers.heat === undefined && !heatApplies
        ? [...exhausted, { qid: "heat", gain: 0, reason: "not_applicable" }]
        : exhausted;
    return { currentId: "portion", phase: phaseFor("portion"), gains, exhausted: withHeat };
  }

  if (answers.side === undefined) {
    let finalExhausted = exhausted;
    if (answers.heat === undefined && !heatApplies) {
      finalExhausted = [...finalExhausted, { qid: "heat", gain: 0, reason: "not_applicable" }];
    }
    if (answers.portion === undefined && !portionApplies) {
      finalExhausted = [...finalExhausted, { qid: "portion", gain: 0, reason: "not_applicable" }];
    }
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
