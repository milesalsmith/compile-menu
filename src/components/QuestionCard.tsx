import { T } from "../theme";
import type { MenuItem, Question, QuestionId } from "../lib/types";
import { H, subpool } from "../lib/entropy";

interface QuestionCardProps {
  question: Question;
  pool: MenuItem[];
  showWork: boolean;
  onAnswer: (qid: QuestionId, oid: string) => void;
}

/* Option cards for the current question. Zero-count filter options are
   pruned before render (no dead ends). In "show working" mode each filter
   option shows the pool it would leave and that pool's entropy — derived
   live via subpool/H, never precomputed. */
export default function QuestionCard({ question, pool, showWork, onAnswer }: QuestionCardProps) {
  const isFilter = question.kind === "filter";
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {question.options.map((o) => {
        const sub = isFilter ? subpool(pool, question.id, o.id) : pool;
        if (isFilter && sub.length === 0) return null;
        return (
          <button
            key={o.id}
            className="opt"
            onClick={() => onAnswer(question.id, o.id)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: T.surface,
              border: `1px solid ${T.line}`,
              borderRadius: 10,
              padding: "15px 18px",
              color: T.text,
              textAlign: "left",
              transition: "border-color .15s, background .15s",
              borderLeft: o.color ? `4px solid ${o.color}` : `1px solid ${T.line}`,
            }}
          >
            <span style={{ fontWeight: 500, fontSize: 15.5 }}>{o.label}</span>
            <span
              className="mono"
              style={{ fontSize: 12, color: T.dim, display: "flex", gap: 10, alignItems: "center" }}
            >
              {showWork && isFilter && (
                <span style={{ color: T.green }}>
                  →{sub.length} · {H(sub.length).toFixed(1)}b
                </span>
              )}
              {o.note}
            </span>
          </button>
        );
      })}
    </div>
  );
}
