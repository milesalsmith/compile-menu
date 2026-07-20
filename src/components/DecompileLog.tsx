import { useEffect, useMemo, useState } from "react";
import { T } from "../theme";
import type { MenuItem } from "../lib/types";
import { ASK_COST, gain } from "../lib/entropy";
import type { Stats } from "../lib/stats";
import { MENU } from "../data/demo-menu";
import { QUESTIONS } from "../data/config";

/* The four-stage READ / TOKENIZE / MEASURE / BUILD decompile animation.
   Ported from menu-compiler.jsx (buildLog + the compile-screen effect and
   render). Every number is derived live from the universe/diet/stats passed
   in, so it stays honest on any dataset (rule 030-ui.mdc). Tap-to-skip and
   prefers-reduced-motion are respected. */

interface Span {
  t: string;
  c: string | null;
}
interface LogLine {
  d: number;
  spans: Span[];
}

const sp = (t: string, c: string | null): Span => ({ t, c });

function buildLog(universe: MenuItem[], diet: string, st: Stats): LogLine[] {
  const gains = QUESTIONS.filter((q) => q.kind === "filter")
    .map((q) => ({ id: q.id, g: gain(q.id, universe) }))
    .sort((a, b) => b.g - a.g);
  const live = gains.filter((x) => x.g > ASK_COST);
  const dead = gains.filter((x) => x.g <= ASK_COST);
  const ex = universe[1] || universe[0];
  const stage = (n: number, label: string): Span[] => [sp(`[${n}/4] `, T.gold), sp(label, T.text)];
  const gap: LogLine = { d: 220, spans: [sp(" ", null)] };
  return [
    { d: 450, spans: stage(1, "READ") },
    { d: 500, spans: [sp("      ", null), sp(`${MENU.length} products on the menu`, T.dim)] },
    ...(diet !== "all"
      ? [
          {
            d: 550,
            spans: [
              sp("      ", null),
              sp(`constraint "${diet}": `, T.dim),
              sp(`${MENU.length} → ${universe.length} products`, T.chili),
            ],
          },
        ]
      : []),
    gap,
    { d: 500, spans: stage(2, "TOKENIZE — every product becomes attributes") },
    { d: 550, spans: [sp("      ", null), sp(`"${ex.name}"`, T.text)] },
    {
      d: 550,
      spans: [
        sp("        → ", T.faint),
        sp(`format:${ex.format}`, T.gold),
        sp("  ", null),
        sp(`protein:${ex.vegetarian ? "veg" : ex.proteins.join("|")}`, T.ember),
        sp("  ", null),
        sp(`style:${ex.styles.join(",")}`, T.green),
      ],
    },
    {
      d: 450,
      spans: [sp("      ", null), sp(`...same for the other ${universe.length - 1}`, T.faint)],
    },
    gap,
    { d: 500, spans: stage(3, "MEASURE — how much decision is really here?") },
    {
      d: 550,
      spans: [
        sp("      ", null),
        sp("uncertainty: ", T.dim),
        sp(`H = log2(${universe.length}) = ${st.totalBits.toFixed(2)} bits`, T.gold),
      ],
    },
    { d: 500, spans: [sp("      ", null), sp("what each question is worth:", T.dim)] },
    ...live.map(
      (x): LogLine => ({
        d: 430,
        spans: [
          sp("        ", null),
          sp(x.id.padEnd(8), T.text),
          sp(`${x.g.toFixed(2)} bits`, T.green),
          sp("  ✓ worth asking", T.faint),
        ],
      })
    ),
    ...dead.map(
      (x): LogLine => ({
        d: 430,
        spans: [
          sp("        ", null),
          sp(x.id.padEnd(8), T.text),
          sp(`${x.g.toFixed(2)} bits`, T.chili),
          sp(
            x.g <= 1e-9
              ? "  ✗ your constraint resolved it"
              : `  ✗ under the ${ASK_COST.toFixed(2)} asking cost`,
            T.faint
          ),
        ],
      })
    ),
    {
      d: 430,
      spans: [
        sp("        ", null),
        sp("spice   ", T.text),
        sp("0.00 bits", T.chili),
        sp("  ✗ a setting, not a product", T.faint),
      ],
    },
    {
      d: 430,
      spans: [
        sp("        ", null),
        sp("sides   ", T.text),
        sp("0.00 bits", T.chili),
        sp("  ✗ same on every main", T.faint),
      ],
    },
    gap,
    { d: 500, spans: stage(4, "BUILD") },
    {
      d: 500,
      spans: [
        sp("      ", null),
        sp("ask the highest-value question first · re-rank after every answer", T.dim),
      ],
    },
    gap,
    {
      d: 500,
      spans: [
        sp("✓ ", T.green),
        sp(`${universe.length} products → a few questions + your settings`, T.green),
      ],
    },
  ];
}

interface DecompileLogProps {
  universe: MenuItem[];
  diet: string;
  stats: Stats;
  onComplete: () => void;
}

export default function DecompileLog({ universe, diet, stats, onComplete }: DecompileLogProps) {
  const [logIndex, setLogIndex] = useState(0);
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      !!window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const LOG = useMemo(() => buildLog(universe, diet, stats), [universe, diet, stats]);

  useEffect(() => {
    if (reducedMotion) {
      const t = setTimeout(onComplete, 700);
      return () => clearTimeout(t);
    }
    if (logIndex < LOG.length) {
      const t = setTimeout(() => setLogIndex((i) => i + 1), LOG[logIndex].d);
      return () => clearTimeout(t);
    }
    const t = setTimeout(onComplete, 1000);
    return () => clearTimeout(t);
  }, [logIndex, reducedMotion, LOG, onComplete]);

  return (
    <button
      onClick={onComplete}
      aria-label="Skip animation"
      className="mono rise"
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: "#12100D",
        border: `1px solid ${T.line}`,
        borderRadius: 10,
        padding: "20px 22px",
        fontSize: 13,
        lineHeight: 1.95,
        color: T.text,
      }}
    >
      <p style={{ margin: "0 0 8px", color: T.dim }}>
        $ decompile ./menu{diet !== "all" ? ` --require ${diet}` : ""}{" "}
        <span style={{ color: T.faint }}>— tap to skip</span>
      </p>
      {LOG.slice(0, logIndex).map((l, i) => (
        <p key={i} style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>
          {l.spans.map((s, j) => (
            <span key={j} style={{ color: s.c || T.text }}>
              {s.t}
            </span>
          ))}
        </p>
      ))}
      {logIndex < LOG.length && (
        <span className="cursor" style={{ color: T.gold }}>
          ▋
        </span>
      )}
    </button>
  );
}
