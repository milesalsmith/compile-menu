import { T } from "../theme";
import BetaBadge from "./BetaBadge";
import { ASK_COST } from "../lib/entropy";
import type { Stats } from "../lib/stats";
import { DIETS } from "../data/config";

interface LandingProps {
  stats: Stats;
  fullStats: Stats;
  diet: string;
  onDiet: (id: string) => void;
  onStart: () => void;
  /** The uploaded file's name, when the loaded menu came from an upload. */
  uploadLabel: string | null;
  onUpload: () => void;
  onUseDemo: () => void;
  showHow: boolean;
  onToggleHow: () => void;
}

export default function Landing({
  stats,
  fullStats,
  diet,
  onDiet,
  onStart,
  uploadLabel,
  onUpload,
  onUseDemo,
  showHow,
  onToggleHow,
}: LandingProps) {
  return (
    <div className="rise">
      <p className="mono" style={{ fontSize: 12, color: T.faint, marginBottom: 40 }}>
        $ ready
        <span className="cursor" style={{ color: T.gold }}>
          ▋
        </span>
      </p>
      <h1
        className="display"
        style={{
          fontSize: "clamp(38px, 8vw, 58px)",
          lineHeight: 1.06,
          fontWeight: 600,
          margin: "0 0 18px",
        }}
      >
        {stats.products} products.
        <br />
        {stats.totalBits.toFixed(2)} bits.
        <br />
        <span style={{ color: T.gold }}>One order.</span>
      </h1>
      <p
        style={{
          color: T.dim,
          fontSize: 15.5,
          lineHeight: 1.55,
          maxWidth: 430,
          marginBottom: 34,
        }}
      >
        {uploadLabel ? (
          <>
            Compiled from <span style={{ color: T.text }}>{uploadLabel}</span>, held in this tab
            only.
          </>
        ) : (
          "Modelled on a real, well-known flame-grilled chicken menu."
        )}
        <br />
        It compresses a complicated menu into as few questions as possible, so you land on exactly
        what to order.
      </p>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 26,
        }}
      >
        {DIETS.map((d) => (
          <button
            key={d.id}
            onClick={() => onDiet(d.id)}
            className="mono"
            style={{
              background: "none",
              border: `1px solid ${diet === d.id ? T.green : T.line}`,
              color: diet === d.id ? T.green : T.faint,
              fontSize: 12,
              padding: "7px 13px",
              borderRadius: 999,
            }}
          >
            {d.label.toLowerCase()}
          </button>
        ))}
        {diet !== "all" && (
          <span className="mono" style={{ fontSize: 11.5, color: T.green }}>
            {fullStats.totalBits.toFixed(2)} → {stats.totalBits.toFixed(2)} bits
          </span>
        )}
      </div>

      <button
        onClick={onStart}
        style={{
          background: T.ember,
          border: "none",
          color: "#1A0F08",
          fontWeight: 600,
          fontSize: 16,
          padding: "15px 28px",
          borderRadius: 8,
          display: "block",
          marginBottom: 12,
        }}
      >
        Decompile the menu
      </button>

      <button
        onClick={uploadLabel ? onUseDemo : onUpload}
        className="mono"
        style={{
          background: "none",
          border: `1px solid ${T.line}`,
          color: T.dim,
          fontSize: 12.5,
          padding: "11px 18px",
          borderRadius: 8,
          display: "block",
          marginBottom: 30,
        }}
      >
        {uploadLabel ? (
          "↺ back to the demo menu"
        ) : (
          <>
            ↑ compile your own menu PDF <BetaBadge />
          </>
        )}
      </button>

      <button
        onClick={onToggleHow}
        className="mono"
        style={{ background: "none", border: "none", color: T.faint, fontSize: 12.5, padding: 0 }}
      >
        {showHow ? "▾" : "▸"} how this tool works
      </button>
      {showHow && (
        <div
          className="mono rise"
          style={{
            marginTop: 12,
            borderLeft: `2px solid ${T.line}`,
            paddingLeft: 16,
            fontSize: 12.5,
            lineHeight: 1.9,
            color: T.dim,
            maxWidth: 470,
          }}
        >
          <p style={{ margin: 0 }}>
            1. every product is tokenized into attributes — format, protein, style.
          </p>
          <p style={{ margin: 0 }}>
            2. the menu's uncertainty is measured in bits: H = log2({stats.products}) ={" "}
            {stats.totalBits.toFixed(2)}.
          </p>
          <p style={{ margin: 0 }}>
            3. each answer you give, the engine asks whichever question removes the most bits (ID3
            information gain). order is computed, not designed.
          </p>
          <p style={{ margin: 0 }}>
            4. a question must earn its tap: below {ASK_COST.toFixed(2)} bits of gain, it skips
            itself.
          </p>
          <p style={{ margin: 0 }}>
            5. spice, portion and sides carry zero bits about which product you get — they're
            settings, asked last.
          </p>
          <p style={{ margin: "10px 0 0", color: T.faint }}>
            dietary toggles are hard constraints, applied before any question. no allergen or
            gluten-free filtering — safety-critical data shouldn't be inferred; always check with the
            restaurant.
          </p>
        </div>
      )}
    </div>
  );
}
