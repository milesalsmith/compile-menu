import type { ReactNode } from "react";
import { T } from "../theme";
import type { Answers, MenuItem } from "../lib/types";
import type { EntropyTraceRow } from "../lib/flow";
import type { RecommendResult } from "../lib/recommend";
import type { Stats } from "../lib/stats";
import type { HeatLevel } from "../data/config";
import WorkingPanel from "./WorkingPanel";

interface ResultsProps {
  result: RecommendResult;
  answers: Answers;
  heatMeta?: HeatLevel;
  portionLabel: string | null;
  sideNames: string[] | null;
  identifyCount: number;
  configDone: number;
  diet: string;
  stats: Stats;
  pool: MenuItem[];
  trace: EntropyTraceRow[];
  showWork: boolean;
  onShowWork: () => void;
  onRestart: () => void;
}

export default function Results({
  result,
  answers,
  heatMeta,
  portionLabel,
  sideNames,
  identifyCount,
  configDone,
  diet,
  stats,
  pool,
  trace,
  showWork,
  onShowWork,
  onRestart,
}: ResultsProps) {
  const cut = result.pick.vegan
    ? "Plant-based"
    : result.pick.vegetarian
      ? "Vegetarian"
      : answers.protein === "thigh"
        ? "Chicken thighs"
        : answers.protein === "wings"
          ? "Wings"
          : answers.protein === "breast"
            ? "Chicken breast"
            : "Chef's choice of cut";

  const stat: [ReactNode, string][] = [
    [stats.products, "products in universe"],
    [`${stats.totalBits.toFixed(2)}b`, "starting entropy"],
    [identifyCount, "questions to identify"],
    [configDone, "settings configured"],
  ];

  return (
    <div className="rise">
      <p
        className="mono"
        style={{ fontSize: 12, color: T.green, letterSpacing: "0.1em", marginBottom: 14 }}
      >
        ✓ COMPILED · {stats.totalBits.toFixed(2)} BITS RESOLVED IN {identifyCount} QUESTION
        {identifyCount === 1 ? "" : "S"} + {configDone} SETTING{configDone === 1 ? "" : "S"}
        {diet !== "all" ? ` · ${diet.toUpperCase()} UNIVERSE` : ""}
      </p>

      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.line}`,
          borderTop: `4px solid ${(result.pick.heat && heatMeta?.color) || T.ember}`,
          borderRadius: 12,
          padding: "24px 24px 20px",
          marginBottom: 14,
        }}
      >
        <p
          className="mono"
          style={{ fontSize: 11, color: T.dim, letterSpacing: "0.12em", margin: "0 0 6px" }}
        >
          YOUR ORDER
        </p>
        <h2
          className="display"
          style={{
            fontSize: "clamp(28px, 6vw, 38px)",
            fontWeight: 700,
            margin: "0 0 4px",
            lineHeight: 1.1,
          }}
        >
          {result.pick.heat && heatMeta && heatMeta.id !== "none" ? `${heatMeta.label} ` : ""}
          {result.pick.name}
        </h2>
        <p style={{ color: T.dim, fontSize: 14, margin: "0 0 6px" }}>{cut}</p>
        {result.pick.heat && heatMeta ? (
          <p
            style={{
              fontSize: 14,
              margin: "0 0 8px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: heatMeta.color,
                flexShrink: 0,
              }}
            />
            <span>
              <span style={{ color: T.text, fontWeight: 600 }}>Spice: {heatMeta.label}</span>
              <span style={{ color: T.dim }}> — {heatMeta.note.toLowerCase()}</span>
            </span>
          </p>
        ) : (
          <p style={{ fontSize: 13, color: T.faint, margin: "0 0 8px" }}>
            {answers.heat ? "Spice isn't a setting on this item" : ""}
          </p>
        )}
        {result.pick.portion && portionLabel ? (
          <p style={{ fontSize: 14, margin: "0 0 18px", color: T.text }}>
            <span style={{ fontWeight: 600 }}>Portion: {portionLabel}</span>
            <span style={{ color: T.dim }}>
              {" "}
              — {portionLabel === "Double" ? "two breasts" : "one breast"}
            </span>
          </p>
        ) : (
          <p style={{ fontSize: 13, color: T.faint, margin: "0 0 18px" }}>
            {answers.portion ? "Portion isn't a setting on this item" : ""}
          </p>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {(sideNames || []).map((s) => (
            <span
              key={s}
              className="mono"
              style={{
                fontSize: 12.5,
                background: T.surface2,
                border: `1px solid ${T.line}`,
                borderRadius: 999,
                padding: "6px 12px",
              }}
            >
              + {s}
            </span>
          ))}
        </div>
        <p
          style={{
            fontSize: 14.5,
            lineHeight: 1.6,
            margin: 0,
            borderTop: `1px solid ${T.line}`,
            paddingTop: 16,
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: T.dim,
              letterSpacing: "0.12em",
              display: "block",
              marginBottom: 6,
            }}
          >
            IN PLAIN ENGLISH
          </span>
          {result.pick.plain}
        </p>
      </div>

      {result.alt && (
        <div
          style={{
            background: T.surface,
            border: `1px dashed ${T.line}`,
            borderRadius: 12,
            padding: "16px 22px",
            marginBottom: 14,
          }}
        >
          <p
            className="mono"
            style={{ fontSize: 11, color: T.dim, letterSpacing: "0.12em", margin: "0 0 6px" }}
          >
            NEAREST ALTERNATIVE
          </p>
          <p style={{ fontSize: 14.5, margin: "0 0 4px", fontWeight: 600 }}>{result.alt.name}</p>
          <p style={{ fontSize: 13.5, color: T.dim, margin: 0, lineHeight: 1.55 }}>
            {result.alt.plain}
          </p>
        </div>
      )}

      {!showWork && (
        <button
          onClick={onShowWork}
          className="mono"
          style={{
            background: "none",
            border: `1px solid ${T.line}`,
            color: T.dim,
            fontSize: 12.5,
            padding: "10px 16px",
            borderRadius: 8,
            width: "100%",
            textAlign: "left",
            marginBottom: 14,
          }}
        >
          ▸ show the working — entropy trace, gains, tie-breaks
        </button>
      )}
      {showWork && (
        <WorkingPanel
          variant="results"
          pool={pool}
          diet={diet}
          stats={stats}
          trace={trace}
          answers={answers}
          result={result}
        />
      )}

      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.line}`,
          borderRadius: 12,
          padding: "18px 22px",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {stat.map(([v, l]) => (
            <div key={l}>
              <p className="display" style={{ fontSize: 28, fontWeight: 700, margin: 0, color: T.gold }}>
                {v}
              </p>
              <p className="mono" style={{ fontSize: 11, color: T.dim, margin: 0 }}>
                {l}
              </p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onRestart}
        style={{
          background: T.ember,
          border: "none",
          color: "#1A0F08",
          fontWeight: 600,
          fontSize: 15,
          padding: "13px 24px",
          borderRadius: 8,
        }}
      >
        Compile again
      </button>
    </div>
  );
}
