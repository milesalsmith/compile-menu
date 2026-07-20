import { useCallback, useMemo, useState } from "react";
import { T } from "./theme";
import type { Answers, QuestionId } from "./lib/types";
import { ASK_COST, H } from "./lib/entropy";
import { entropyTrace, filterProducts, nextQuestion } from "./lib/flow";
import { recommend, sidePair } from "./lib/recommend";
import { dietFilter, statsOf } from "./lib/stats";
import { MENU } from "./data/demo-menu";
import { HEAT, QUESTIONS } from "./data/config";
import Landing from "./components/Landing";
import DecompileLog from "./components/DecompileLog";
import QuestionCard from "./components/QuestionCard";
import WorkingPanel from "./components/WorkingPanel";
import Results from "./components/Results";

type Screen = "landing" | "compile" | "questions" | "results";

interface HistoryEntry {
  qid: QuestionId;
  oid: string;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [diet, setDiet] = useState("all");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [sideNames, setSideNames] = useState<string[] | null>(null);
  const [showWork, setShowWork] = useState(false);
  const [showHow, setShowHow] = useState(false);

  /* Dietary requirement shrinks the universe BEFORE the flow — it's a
     constraint, not a ranked preference (rule 000-project.mdc rule 4). */
  const universe = useMemo(() => dietFilter(diet), [diet]);
  const S = useMemo(() => statsOf(universe), [universe]);
  const fullStats = useMemo(() => statsOf(MENU), []);

  const answers = useMemo(
    () => Object.fromEntries(history.map((h) => [h.qid, h.oid])) as Answers,
    [history]
  );
  const pool = useMemo(() => filterProducts(answers, universe), [answers, universe]);
  const bits = H(pool.length);

  const flow = useMemo(() => nextQuestion(answers, pool), [answers, pool]);
  const currentQuestion = useMemo(
    () => (flow.currentId ? QUESTIONS.find((q) => q.id === flow.currentId) ?? null : null),
    [flow.currentId]
  );

  /* THE PHASE TRANSITION. IDENTIFY is entropy-driven; CONFIGURE is the
     zero-gain settings. The flip happens the moment no filter question can
     clear ASK_COST — i.e. the product is resolved (or narrowed to a
     tie-break set) and the only questions left are settings. The UI must
     show the entropy meter ONLY in identify, and the settings tracker ONLY
     in configure — never a full meter while still asking (rule 030-ui.mdc). */
  const phase = flow.phase;
  const resolved = pool.length === 1 ? pool[0] : null;

  const configQs = useMemo<QuestionId[]>(() => {
    const list: QuestionId[] = [];
    if (pool.some((p) => p.heat)) list.push("heat");
    list.push("side");
    return list;
  }, [pool]);
  const configDone = configQs.filter((q) => answers[q] !== undefined).length;
  const identifyCount = history.filter(
    (h) => QUESTIONS.find((q) => q.id === h.qid)?.kind === "filter"
  ).length;

  const trace = useMemo(() => entropyTrace(history, universe), [history, universe]);

  const result = useMemo(
    () => (screen === "results" ? recommend(answers, universe) : null),
    [screen, answers, universe]
  );
  const heatMeta = HEAT.find((h) => h.id === answers.heat);

  /* Answering is the only action that can complete the flow, so we detect
     completion here (in the event handler) rather than in an effect: apply
     the answer, recompute the flow, and if nothing is left to ask, freeze
     the sides and move to results. This keeps the sidePair() roll from
     re-rolling on every render, and avoids a setState-in-effect cascade. */
  const answer = useCallback(
    (qid: QuestionId, oid: string) => {
      const nextAnswers = { ...answers, [qid]: oid };
      const nextPool = filterProducts(nextAnswers, universe);
      const nextFlow = nextQuestion(nextAnswers, nextPool);
      setHistory((h) => [...h, { qid, oid }]);
      if (!nextFlow.currentId) {
        setSideNames(sidePair(nextAnswers.side));
        setScreen("results");
      }
    },
    [answers, universe]
  );
  const back = useCallback(() => setHistory((h) => h.slice(0, -1)), []);
  const restart = useCallback(() => {
    setHistory([]);
    setSideNames(null);
    setScreen("landing");
  }, []);
  const onCompileDone = useCallback(() => setScreen("questions"), []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        color: T.text,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; } button { cursor: pointer; font: inherit; }
        button:focus-visible { outline: 2px solid ${T.gold}; outline-offset: 3px; }
        @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
        .rise { animation: rise .35s ease both; }
        .cursor { animation: blink 1s step-end infinite; }
        @media (prefers-reduced-motion: reduce) { .rise, .cursor { animation: none; } }
        .opt:hover:not(:disabled) { border-color: ${T.ember} !important; background: ${T.surface2} !important; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .display { font-family: 'Fraunces', serif; }
      `}</style>

      <div style={{ maxWidth: 660, margin: "0 auto", padding: "28px 20px 60px" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 32,
            gap: 10,
          }}
        >
          <button
            onClick={restart}
            className="mono"
            style={{
              background: "none",
              border: "none",
              color: T.text,
              fontSize: 13,
              letterSpacing: "0.08em",
              padding: 0,
            }}
          >
            menu<span style={{ color: T.ember }}>_</span>compiler
          </button>
          {(screen === "questions" || screen === "results") && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {screen === "questions" && (
                <span className="mono" style={{ fontSize: 12, color: T.dim }}>
                  <span style={{ color: T.gold }}>{bits.toFixed(2)}</span> bits ·{" "}
                  <span style={{ color: T.green }}>{pool.length}</span> valid
                </span>
              )}
              <button
                onClick={() => setShowWork((w) => !w)}
                className="mono"
                style={{
                  background: showWork ? T.surface2 : "none",
                  border: `1px solid ${T.line}`,
                  color: showWork ? T.green : T.dim,
                  fontSize: 12,
                  padding: "7px 12px",
                  borderRadius: 7,
                }}
              >
                {showWork ? "◉" : "○"} show working
              </button>
            </div>
          )}
        </header>

        {screen === "landing" && (
          <Landing
            stats={S}
            fullStats={fullStats}
            diet={diet}
            onDiet={setDiet}
            onStart={() => setScreen("compile")}
            showHow={showHow}
            onToggleHow={() => setShowHow((h) => !h)}
          />
        )}

        {screen === "compile" && (
          <DecompileLog universe={universe} diet={diet} stats={S} onComplete={onCompileDone} />
        )}

        {screen === "questions" && currentQuestion && (
          <div className="rise" key={currentQuestion.id + history.length}>
            {phase === "identify" ? (
              <div style={{ marginBottom: 8 }}>
                <div style={{ height: 4, borderRadius: 2, background: T.line, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${S.totalBits > 0 ? Math.round((1 - bits / S.totalBits) * 100) : 100}%`,
                      background: `linear-gradient(90deg, ${T.gold}, ${T.ember})`,
                      transition: "width .4s ease",
                    }}
                  />
                </div>
                <p className="mono" style={{ fontSize: 11, color: T.faint, margin: "6px 0 0" }}>
                  identifying · entropy removed: {(S.totalBits - bits).toFixed(2)} /{" "}
                  {S.totalBits.toFixed(2)} bits
                  {diet !== "all" && <span> · universe: {diet}</span>}
                </p>
              </div>
            ) : (
              <div
                className="rise"
                style={{
                  background: T.surface,
                  border: `1px solid ${T.line}`,
                  borderLeft: `3px solid ${T.green}`,
                  borderRadius: 8,
                  padding: "14px 16px",
                  marginBottom: 18,
                }}
              >
                <p
                  className="mono"
                  style={{ fontSize: 11, color: T.green, letterSpacing: "0.1em", margin: 0 }}
                >
                  ✓ {resolved ? "PRODUCT IDENTIFIED" : `NARROWED TO ${pool.length} CANDIDATES`} IN{" "}
                  {identifyCount} QUESTION{identifyCount === 1 ? "" : "S"} · 0.00 BITS REMAIN
                </p>
                {resolved && (
                  <p
                    className="display"
                    style={{ fontSize: 20, fontWeight: 600, margin: "6px 0 0" }}
                  >
                    {resolved.name}
                  </p>
                )}
                <p
                  className="mono"
                  style={{ fontSize: 11.5, color: T.faint, margin: "8px 0 0", lineHeight: 1.65 }}
                >
                  {resolved
                    ? "no remaining question carries information about which item you get."
                    : "no remaining question clears the asking cost — the tie-break will resolve these."}
                  <br />
                  what's left are settings. they change your order, not which product it is.
                </p>
                <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
                  {configQs.map((q, i) => (
                    <div
                      key={q}
                      style={{
                        height: 3,
                        flex: 1,
                        borderRadius: 2,
                        background: i < configDone ? T.green : i === configDone ? T.gold : T.line,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {flow.exhausted.length > 0 && (
              <div
                className="mono"
                style={{ fontSize: 12, color: T.faint, margin: "14px 0 0", lineHeight: 1.7 }}
              >
                {flow.exhausted.map(({ qid, gain: g, reason }) => (
                  <p key={qid} style={{ margin: 0 }}>
                    <span style={{ color: T.chili }}>−</span> “{qid}” removed itself —{" "}
                    {reason === "not_applicable"
                      ? "not a setting on any remaining item"
                      : reason === "zero_gain"
                        ? "0.00 bits of gain against remaining items"
                        : `gain ${g.toFixed(2)} bits < ${ASK_COST.toFixed(2)} asking cost — not worth a tap`}
                  </p>
                ))}
              </div>
            )}

            <p
              className="mono"
              style={{ fontSize: 12, color: T.dim, letterSpacing: "0.1em", margin: "20px 0 10px" }}
            >
              {phase === "configure"
                ? `SETTING ${configDone + 1} / ${configQs.length} · 0.00 BITS OF PRODUCT INFORMATION`
                : `QUESTION ${identifyCount + 1} · HIGHEST GAIN: ${flow.gains[0]?.gain.toFixed(2)} BITS`}
            </p>
            <h2
              className="display"
              style={{
                fontSize: "clamp(26px, 5vw, 34px)",
                fontWeight: 600,
                margin: "0 0 8px",
                lineHeight: 1.15,
              }}
            >
              {currentQuestion.prompt}
            </h2>
            <p style={{ color: T.dim, fontSize: 14.5, marginBottom: 22 }}>{currentQuestion.sub}</p>

            <QuestionCard
              question={currentQuestion}
              pool={pool}
              showWork={showWork}
              onAnswer={answer}
            />

            {showWork && (
              <WorkingPanel
                variant="flow"
                gains={flow.gains}
                currentQid={flow.currentId}
                pool={pool}
                bits={bits}
                trace={trace}
              />
            )}

            {history.length > 0 && (
              <button
                onClick={back}
                style={{
                  marginTop: 20,
                  background: "none",
                  border: "none",
                  color: T.dim,
                  fontSize: 13,
                  padding: 0,
                }}
              >
                ← Back
              </button>
            )}
          </div>
        )}

        {screen === "results" && result && (
          <Results
            result={result}
            answers={answers}
            heatMeta={heatMeta}
            sideNames={sideNames}
            identifyCount={identifyCount}
            configDone={configDone}
            diet={diet}
            stats={S}
            pool={pool}
            trace={trace}
            showWork={showWork}
            onShowWork={() => setShowWork(true)}
            onRestart={restart}
          />
        )}
      </div>
    </div>
  );
}
