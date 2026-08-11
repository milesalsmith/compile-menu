import { T } from "../theme";
import type {
  Answers,
  CompiledItem,
  FilterOptions,
  Question,
  QuestionId,
} from "../lib/types";
import { ASK_COST, FILTER_QUESTION_IDS, gain } from "../lib/entropy";
import type { EntropyTraceRow, QuestionGain } from "../lib/flow";
import { tieBreak, type RecommendResult } from "../lib/recommend";
import type { Stats } from "../lib/stats";

/* The "show working" transparency layer — a first-class feature, not debug
   chrome (rule 030-ui.mdc). Two variants:
   - "flow": the live gain ranking vs ASK_COST, current candidate pool, and
     the last answer's entropy delta, shown mid-flow.
   - "results": the full entropy trace, never-asked reasons, the tie-break
     table, and why the menu compressed.
   Every number is derived live from the engine functions. */

interface FlowVariantProps {
  variant: "flow";
  gains: QuestionGain[];
  currentQid: QuestionId | null;
  pool: CompiledItem[];
  bits: number;
  trace: EntropyTraceRow[];
}

interface ResultsVariantProps {
  variant: "results";
  pool: CompiledItem[];
  diet: string;
  stats: Stats;
  trace: EntropyTraceRow[];
  answers: Answers;
  result: RecommendResult;
  questions: Question[];
  filterOptions: FilterOptions;
  hasSides: boolean;
  /** Menu size before the dietary constraint is applied. */
  total: number;
}

type WorkingPanelProps = FlowVariantProps | ResultsVariantProps;

const FILTER_DIMENSIONS = FILTER_QUESTION_IDS.length;

export default function WorkingPanel(props: WorkingPanelProps) {
  if (props.variant === "flow") return <FlowPanel {...props} />;
  return <ResultsPanel {...props} />;
}

function FlowPanel({ gains, currentQid, pool, bits, trace }: FlowVariantProps) {
  const last = trace[trace.length - 1];
  return (
    <div
      className="mono rise"
      style={{
        marginTop: 16,
        background: "#12100D",
        border: `1px solid ${T.line}`,
        borderRadius: 10,
        padding: "14px 18px",
        fontSize: 12,
        lineHeight: 1.85,
        color: T.dim,
      }}
    >
      <p style={{ margin: "0 0 4px", color: T.faint }}>
        // question ranking by information gain · asking cost = {ASK_COST.toFixed(2)} bits (a
        question must earn its tap)
      </p>
      {gains.map((x) => (
        <p key={x.qid} style={{ margin: 0 }}>
          gain(<span style={{ color: T.text }}>{x.qid}</span>) ={" "}
          <span style={{ color: x.gain > ASK_COST ? T.green : T.chili }}>
            {x.gain.toFixed(2)} bits
          </span>
          <span style={{ color: T.faint }}>
            {" "}
            {x.gain > ASK_COST
              ? `> ${ASK_COST.toFixed(2)} ✓ worth asking`
              : `≤ ${ASK_COST.toFixed(2)} ✗ skipped`}
          </span>
          {x.qid === currentQid && <span style={{ color: T.gold }}> ← asking this</span>}
        </p>
      ))}
      <p style={{ margin: "10px 0 4px", color: T.faint }}>
        // candidate pool ({pool.length}) · H = {bits.toFixed(2)} bits
      </p>
      <p style={{ margin: 0, overflowWrap: "break-word" }}>
        {pool.map((p, i) => (
          <span key={p.id}>
            <span style={{ color: T.text }}>{p.name}</span>
            <span style={{ color: T.faint }}>{i < pool.length - 1 ? " · " : ""}</span>
          </span>
        ))}
      </p>
      {trace.length > 0 && (
        <p style={{ margin: "10px 0 0", color: T.faint }}>
          last answer: {last.qid}={last.oid} → {last.hBefore.toFixed(2)} → {last.hAfter.toFixed(2)}{" "}
          bits (<span style={{ color: T.chili }}>−{(last.hBefore - last.hAfter).toFixed(2)}</span>)
        </p>
      )}
      <p style={{ margin: "8px 0 0", color: T.faint }}>
        // dietary requirement applied as a hard constraint before the flow — it never competes in
        this ranking
      </p>
    </div>
  );
}

function ResultsPanel({
  pool,
  diet,
  stats,
  trace,
  answers,
  result,
  questions,
  filterOptions,
  hasSides,
  total,
}: ResultsVariantProps) {
  const configDimensions = questions.filter((q) => q.kind === "config").length;
  return (
    <div
      className="mono rise"
      style={{
        background: "#12100D",
        border: `1px solid ${T.line}`,
        borderRadius: 10,
        padding: "18px 20px",
        fontSize: 12.5,
        lineHeight: 1.9,
        color: T.dim,
        marginBottom: 14,
      }}
    >
      <p style={{ margin: "0 0 4px", color: T.faint }}>
        // 1. entropy trace (question order was computed, not fixed)
      </p>
      {diet !== "all" && (
        <p style={{ margin: 0 }}>
          constraint: <span style={{ color: T.chili }}>{diet}</span> → universe {total} →{" "}
          {stats.products} products
        </p>
      )}
      <p style={{ margin: 0 }}>
        start: {stats.products} products · H = {stats.totalBits.toFixed(2)} bits
      </p>
      {trace.map((r, i) => (
        <p key={i} style={{ margin: 0 }}>
          {r.qid}=<span style={{ color: T.gold }}>{r.oid}</span>: {r.hBefore.toFixed(2)} →{" "}
          {r.hAfter.toFixed(2)} bits
          {r.hBefore - r.hAfter > 1e-9 ? (
            <span style={{ color: T.green }}> (−{(r.hBefore - r.hAfter).toFixed(2)})</span>
          ) : (
            <span style={{ color: T.faint }}> (configuration — 0 gain by design)</span>
          )}
        </p>
      ))}
      {questions.filter((q) => q.kind === "filter" && answers[q.id] === undefined).map((q) => {
        const g = gain(q.id, pool, filterOptions);
        return (
          <p key={q.id} style={{ margin: 0, color: T.faint }}>
            <span style={{ color: T.chili }}>−</span> {q.id}: never asked —{" "}
            {g <= 1e-9
              ? `0.00 bits of gain${diet !== "all" ? " (your constraint already resolved it)" : ""}`
              : `gain ${g.toFixed(2)} < ${ASK_COST.toFixed(2)} asking cost`}
          </p>
        );
      })}

      {result.ranked.length > 1 && (
        <>
          <p style={{ margin: "12px 0 4px", color: T.faint }}>
            // 2. {result.ranked.length} survivors are identical on every asked dimension — tie-break
          </p>
          {result.ranked.slice(0, 4).map((p) => (
            <p key={p.id} style={{ margin: 0 }}>
              <span style={{ color: p.id === result.pick.id ? T.green : T.text }}>{p.name}</span>
              <span style={{ color: T.faint }}> tie-break = </span>
              <span style={{ color: T.gold }}>{tieBreak(p, answers)}</span>
              {p.id === result.pick.id && <span style={{ color: T.green }}> ✓</span>}
            </p>
          ))}
        </>
      )}
      {result.ranked.length === 1 && (
        <p style={{ margin: "12px 0 0" }}>
          // 2. entropy reached 0 — exactly one product satisfies your answers. no scoring needed.
        </p>
      )}

      <p style={{ margin: "12px 0 4px", color: T.faint }}>// 3. why the menu compressed</p>
      <p style={{ margin: 0 }}>
        {stats.products} products · {stats.components} unique components · {FILTER_DIMENSIONS}{" "}
        product dimensions + {configDimensions} settings.
      </p>
      <p style={{ margin: 0 }}>
        heat: selectable on {stats.heatCount}/{stats.products} items → 0 bits of product information.
      </p>
      {hasSides && (
        <p style={{ margin: 0 }}>
          sides: identical on every main → 0 bits. the math lifts both out automatically.
        </p>
      )}
      <p style={{ margin: "6px 0 0", color: T.faint }}>
        // allergens deliberately excluded — safety-critical fields are never inferred.
      </p>
    </div>
  );
}
