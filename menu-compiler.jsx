import { useState, useEffect, useMemo, useRef } from "react";

/* ============================================================
   MENU COMPILER — v0.4 · ID3 engine + dietary constraints
   Restaurants expose products. Customers make decisions.

   Engine: ID3-style information gain, generalised for
   multi-valued attributes (overlapping branches, weights are
   normalised branch sizes). Question order is COMPUTED, not
   designed, and re-ranked after every answer. Zero-gain
   questions remove themselves and say why.

   Dietary requirements are CONSTRAINTS, not preferences: the
   vegetarian/vegan toggle shrinks the universe BEFORE the flow
   starts and never competes in the gain ranking. Requirements
   constrain the space; preferences resolve the entropy within it.
   Watch the protein question delete itself under a vegetarian
   universe — no special case, the math handles it.

   Allergens/gluten-free are deliberately absent: safety-critical
   fields must never be inferred by probabilistic extraction.

   Dataset: structure modelled on a real flame-grilled chicken
   menu; every item named generically by its components.
   ============================================================ */

/* ---------- DATA ---------- */

const MENU = [
  // Burgers (7)
  { id: "butterfly-burger", name: "Butterfly Burger", format: "burger", proteins: ["breast"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, plain: "Two chicken breasts joined by crispy skin, in a rustic roll with tomato relish, lettuce and a tangy house sauce." },
  { id: "cheese-chutney-burger", name: "Cheese & Chutney Burger", format: "burger", proteins: ["breast", "thigh"], styles: ["cheesy", "loaded"], vegetarian: false, vegan: false, heat: true, plain: "Breast or juicier thighs with melting cheddar, smoky red pepper chutney, lettuce and herb mayo. It's messy." },
  { id: "garlic-bread-burger", name: "Garlic Bread Burger", format: "burger", proteins: ["breast", "thigh"], styles: ["garlicky", "loaded"], vegetarian: false, vegan: false, heat: true, plain: "Breast or thighs with pink pickled onions, salad leaves and garlic mayo — served in a garlic-bread bun instead of a plain roll." },
  { id: "grilled-burger", name: "Grilled Chicken Burger", format: "burger", proteins: ["breast"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, plain: "A single grilled breast in a rustic roll with tomato relish, herb mayo, lettuce and tomato." },
  { id: "double-burger", name: "Double Chicken Burger", format: "burger", proteins: ["breast"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, plain: "Two grilled breasts in one roll — the classic build, more of it." },
  { id: "halloumi-salsa-burger", name: "Halloumi & Salsa Burger", format: "burger", proteins: ["veg"], styles: ["cheesy", "fresh"], vegetarian: true, vegan: false, heat: false, plain: "Grilled halloumi topped with pepper-and-pineapple salsa, sliced avocado and garlic mayo, in a rustic roll. Vegetarian." },
  { id: "bean-burger", name: "Bean Patty Burger", format: "burger", proteins: ["veg"], styles: ["classic"], vegetarian: true, vegan: false, heat: false, plain: "A patty of cheddar, chickpeas, sweetcorn, lentils and pumpkin seeds, with tomato relish, herb mayo, lettuce and tomato. Vegetarian." },

  // Pittas (4)
  { id: "loaded-halloumi-pitta", name: "Loaded Halloumi Pitta", format: "pitta", proteins: ["breast", "thigh"], styles: ["loaded", "cheesy", "garlicky"], vegetarian: false, vegan: false, heat: true, plain: "A toasted pitta with breast or thighs plus grilled halloumi, caramelised red onion relish, garlic aioli and lettuce." },
  { id: "grilled-pitta", name: "Grilled Chicken Pitta", format: "pitta", proteins: ["breast"], styles: ["classic", "fresh"], vegetarian: false, vegan: false, heat: true, plain: "A grilled breast in a toasted pitta with herb mayo and crunchy, tangy slaw. The lighter handheld." },
  { id: "double-pitta", name: "Double Chicken Pitta", format: "pitta", proteins: ["breast"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, plain: "Two grilled breasts in a toasted pitta with herb mayo and slaw." },
  { id: "bean-pitta", name: "Bean Patty Pitta", format: "pitta", proteins: ["veg"], styles: ["classic"], vegetarian: true, vegan: false, heat: false, plain: "A bean-and-cheese patty in a toasted pitta with herb mayo and slaw. Vegetarian." },

  // Wraps (4)
  { id: "grilled-wrap", name: "Grilled Chicken Wrap", format: "wrap", proteins: ["breast"], styles: ["classic", "fresh"], vegetarian: false, vegan: false, heat: true, plain: "A grilled breast in a soft wrap with lettuce, lightly spiced yoghurt mayo and chilli jam." },
  { id: "double-wrap", name: "Double Chicken Wrap", format: "wrap", proteins: ["breast"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, plain: "Two grilled breasts wrapped with lettuce, yoghurt mayo and chilli jam." },
  { id: "plant-wrap", name: "Plant Fillet Wrap", format: "wrap", proteins: ["veg"], styles: ["fresh"], vegetarian: true, vegan: true, heat: true, plain: "A plant-based fillet grilled in your chosen heat, sliced, with garlic mayo, lettuce and chilli jam. Fully plant-based." },
  { id: "bean-wrap", name: "Bean Patty Wrap", format: "wrap", proteins: ["veg"], styles: ["classic"], vegetarian: true, vegan: false, heat: false, plain: "A bean-and-cheese patty wrapped with lettuce, yoghurt mayo and chilli jam. Vegetarian." },

  // Plates (5)
  { id: "quarter-chicken", name: "1/4 Chicken", format: "plate", proteins: ["breast", "thigh"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, plain: "A breast or a leg on the bone, flame-grilled with crispy skin in your chosen heat. The original order." },
  { id: "half-chicken", name: "1/2 Chicken", format: "plate", proteins: ["breast", "thigh"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, plain: "A breast and a leg on the bone, flame-grilled with crispy skin. The serious-appetite plate." },
  { id: "boneless-thighs", name: "Boneless Thighs Plate", format: "plate", proteins: ["thigh"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, plain: "Four boneless thighs with crispy skin — the juiciest cut, no bun, no bone." },
  { id: "butterfly-plate", name: "Butterfly Breast Plate", format: "plate", proteins: ["breast"], styles: ["classic"], vegetarian: false, vegan: false, heat: true, plain: "Two breasts joined by crispy flame-grilled skin. Lean, and a lot of it." },
  { id: "wings-plate", name: "Wings Plate", format: "plate", proteins: ["wings"], styles: ["loaded"], vegetarian: false, vegan: false, heat: true, plain: "Flame-grilled wings in your chosen heat, with the option of an extra-saucy glaze and creamy drizzle. Napkins required." },

  // Bowls & salads (4)
  { id: "spicy-rice-bowl", name: "Spicy Rice Bowl", format: "bowl", proteins: ["breast", "thigh"], styles: ["fresh"], vegetarian: false, vegan: false, heat: true, plain: "Spicy rice with charred broccoli, crunchy slaw, pickles and houmous, topped with your choice of grilled chicken." },
  { id: "pulled-caesar", name: "Pulled Chicken Caesar", format: "bowl", proteins: ["breast"], styles: ["fresh", "cheesy"], vegetarian: false, vegan: false, heat: true, plain: "Chilled pulled chicken, crunchy cos, garlic croutons and pickled onions tossed in a rich Caesar dressing, finished in your chosen heat." },
  { id: "mediterranean-salad", name: "Mediterranean Salad", format: "bowl", proteins: ["veg"], styles: ["fresh"], vegetarian: true, vegan: false, heat: false, plain: "Mixed leaves, two kinds of tomato, olives, feta, cucumber and pickled onions in a light vinegar-and-oil dressing. Vegetarian." },
  { id: "grain-bowl", name: "Hearty Grain Bowl", format: "bowl", proteins: ["veg"], styles: ["fresh"], vegetarian: true, vegan: true, heat: false, plain: "Warm mixed grains with slaw, charred corn, herby pickles and leafy greens. Fully plant-based." },
];

const DIETS = [
  { id: "all", label: "No requirements" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
];
const dietFilter = (diet) =>
  diet === "vegan" ? MENU.filter((p) => p.vegan)
  : diet === "vegetarian" ? MENU.filter((p) => p.vegetarian)
  : MENU;

const SIDES = {
  crispy: ["Salted Chips", "Garlic Bread"],
  filling: ["Spicy Rice", "Creamy Mash"],
  fresh: ["Crunchy Slaw", "Corn on the Cob"],
};

const HEAT = [
  { id: "none", label: "No real heat", note: "Herby, zero burn", color: "#D9C46B" },
  { id: "mild", label: "Mild", note: "Fruity warmth", color: "#DFA13F" },
  { id: "medium", label: "Medium", note: "Proper flavour, gentle burn", color: "#D96B2B" },
  { id: "hot", label: "Hot", note: "You'll feel it", color: "#C43A1E" },
  { id: "xhot", label: "Extra hot", note: "Sign the waiver", color: "#8E1A1A" },
];

const QUESTIONS = [
  { id: "format", kind: "filter", prompt: "How do you want to eat it?", sub: "Asked when it's the highest-information question — usually first.",
    options: [
      { id: "burger", label: "Burger", note: "Soft roll, both hands" },
      { id: "pitta", label: "Pitta", note: "Lighter handheld" },
      { id: "wrap", label: "Wrap", note: "Neat and rolled" },
      { id: "plate", label: "Plate", note: "Chicken, no bread" },
      { id: "bowl", label: "Bowl / salad", note: "Grains and greens" },
    ] },
  { id: "protein", kind: "filter", prompt: "What should the main protein be?", sub: "Thigh is juicier, breast is leaner. Wings are wings.",
    options: [
      { id: "breast", label: "Chicken breast", note: "Lean and classic" },
      { id: "thigh", label: "Chicken thighs", note: "Juicier cut" },
      { id: "wings", label: "Wings", note: "On the bone" },
      { id: "veg", label: "Vegetarian", note: "No meat" },
    ] },
  { id: "style", kind: "filter", prompt: "What style sounds best?", sub: "The flavour family, not a specific product.",
    options: [
      { id: "classic", label: "Classic", note: "Just great chicken" },
      { id: "cheesy", label: "Cheesy", note: "Melted on top" },
      { id: "garlicky", label: "Garlicky", note: "Bold and savoury" },
      { id: "loaded", label: "Loaded", note: "Everything on it" },
      { id: "fresh", label: "Fresh & light", note: "Salad-leaning" },
    ] },
  { id: "heat", kind: "config", prompt: "How spicy?", sub: "Zero information gain about which product — pure setting. The math is why this comes last.",
    options: HEAT.map((h) => ({ id: h.id, label: h.label, note: h.note, color: h.color })) },
  { id: "side", kind: "config", prompt: "What does the meal need?", sub: "Also zero-gain: sides repeat identically on every main.",
    options: [
      { id: "crispy", label: "Something crispy", note: "Chips territory" },
      { id: "filling", label: "Something filling", note: "Rice, mash" },
      { id: "fresh", label: "Something fresh", note: "Slaw, corn" },
      { id: "surprise", label: "Surprise me", note: "Dealer's choice" },
    ] },
];

/* ---------- ID3 ENGINE (universe-aware) ---------- */

/* Cost of asking: a question must EARN its tap. Any question whose best-case
   information gain doesn't clear this bar is skipped and the tie-break
   resolves the rest. This is cost-sensitive induction — the same product
   philosophy as Cursor's Tab policy (suggest only when P(accept) > 25%),
   except our threshold is computed from the data, not learned from usage. */
const ASK_COST = 0.5; // bits

const H = (n) => (n <= 1 ? 0 : Math.log2(n));

function subpool(pool, qid, oid) {
  if (qid === "format") return pool.filter((p) => p.format === oid);
  if (qid === "protein") return pool.filter((p) => (oid === "veg" ? p.vegetarian : !p.vegetarian && p.proteins.includes(oid)));
  if (qid === "style") return pool.filter((p) => p.styles.includes(oid));
  return pool; // heat & side never narrow the product set
}

function gain(qid, pool) {
  const q = QUESTIONS.find((x) => x.id === qid);
  if (q.kind === "config") return 0;
  const sizes = q.options.map((o) => subpool(pool, qid, o.id).length).filter((n) => n > 0);
  if (sizes.length <= 1) return 0;
  const tot = sizes.reduce((a, b) => a + b, 0);
  const expected = sizes.reduce((s, n) => s + (n / tot) * H(n), 0);
  return Math.max(0, H(pool.length) - expected);
}

function filterProducts(answers, universe) {
  let pool = universe;
  for (const [qid, oid] of Object.entries(answers)) {
    if (QUESTIONS.find((q) => q.id === qid)?.kind === "filter") pool = subpool(pool, qid, oid);
  }
  return pool;
}

/* Tie-break ONLY — disclosed as such, never presented as the engine. */
function tieBreak(p, answers) {
  let t = 0;
  if (answers.protein && answers.protein !== "veg" && p.proteins.length === 1) t += 1;
  if (answers.style) t += p.styles.filter((s) => s === answers.style).length;
  return t;
}

function recommend(answers, universe) {
  const pool = filterProducts(answers, universe);
  const ranked = [...pool].sort((a, b) => tieBreak(b, answers) - tieBreak(a, answers));
  const pick = ranked[0] || universe[0] || MENU[0];
  const alt = ranked[1] || universe.find((p) => p.id !== pick.id);
  return { pick, alt, ranked: ranked.length ? ranked : [pick] };
}

function sidePair(choice) {
  if (!choice || choice === "surprise") {
    const keys = Object.keys(SIDES);
    const a = keys[Math.floor(Math.random() * keys.length)];
    return [SIDES[a][0], SIDES[keys[(keys.indexOf(a) + 1) % keys.length]][0]];
  }
  const other = choice === "fresh" ? "crispy" : "fresh";
  return [SIDES[choice][0], SIDES[other][0]];
}

/* ---------- STATS (universe-aware) ---------- */

function statsOf(universe) {
  const formats = {};
  universe.forEach((m) => (formats[m.format] = (formats[m.format] || 0) + 1));
  const proteins = new Set(universe.flatMap((m) => (m.vegetarian ? ["veg"] : m.proteins)));
  const styleSet = new Set(universe.flatMap((m) => m.styles));
  const heatCount = universe.filter((m) => m.heat).length;
  const components = Object.keys(formats).length + proteins.size + styleSet.size + HEAT.length + Object.keys(SIDES).length;
  return { products: universe.length, formats, heatCount, components, totalBits: H(universe.length) };
}

/* ---------- THEME ---------- */

const T = {
  bg: "#161210", surface: "#211B15", surface2: "#2A2119", line: "#3D3126",
  text: "#F2EAE0", dim: "#A89680", faint: "#6E5F4E",
  gold: "#DFA13F", ember: "#D96B2B", chili: "#C43A1E", green: "#8FBC6B",
};

/* ---------- DECOMPILE LOG (built from the constrained universe) ---------- */

const sp = (t, c) => ({ t, c });

function buildLog(universe, diet, st) {
  const gains = QUESTIONS.filter((q) => q.kind === "filter")
    .map((q) => ({ id: q.id, g: gain(q.id, universe) }))
    .sort((a, b) => b.g - a.g);
  const live = gains.filter((x) => x.g > ASK_COST);
  const dead = gains.filter((x) => x.g <= ASK_COST);
  const ex = universe[1] || universe[0];
  const stage = (n, label) => [sp(`[${n}/4] `, T.gold), sp(label, T.text)];
  const gap = { d: 220, spans: [sp(" ", null)] };
  return [
    { d: 450, spans: stage(1, "READ") },
    { d: 500, spans: [sp("      ", null), sp(`${MENU.length} products on the menu`, T.dim)] },
    ...(diet !== "all" ? [{ d: 550, spans: [sp("      ", null), sp(`constraint "${diet}": `, T.dim), sp(`${MENU.length} → ${universe.length} products`, T.chili)] }] : []),
    gap,
    { d: 500, spans: stage(2, "TOKENIZE — every product becomes attributes") },
    { d: 550, spans: [sp("      ", null), sp(`"${ex.name}"`, T.text)] },
    { d: 550, spans: [sp("        → ", T.faint), sp(`format:${ex.format}`, T.gold), sp("  ", null), sp(`protein:${ex.vegetarian ? "veg" : ex.proteins.join("|")}`, T.ember), sp("  ", null), sp(`style:${ex.styles.join(",")}`, T.green)] },
    { d: 450, spans: [sp("      ", null), sp(`...same for the other ${universe.length - 1}`, T.faint)] },
    gap,
    { d: 500, spans: stage(3, "MEASURE — how much decision is really here?") },
    { d: 550, spans: [sp("      ", null), sp("uncertainty: ", T.dim), sp(`H = log2(${universe.length}) = ${st.totalBits.toFixed(2)} bits`, T.gold)] },
    { d: 500, spans: [sp("      ", null), sp("what each question is worth:", T.dim)] },
    ...live.map((x) => ({ d: 430, spans: [sp("        ", null), sp(x.id.padEnd(8), T.text), sp(`${x.g.toFixed(2)} bits`, T.green), sp("  ✓ worth asking", T.faint)] })),
    ...dead.map((x) => ({ d: 430, spans: [sp("        ", null), sp(x.id.padEnd(8), T.text), sp(`${x.g.toFixed(2)} bits`, T.chili), sp(x.g <= 1e-9 ? "  ✗ your constraint resolved it" : `  ✗ under the ${ASK_COST.toFixed(2)} asking cost`, T.faint)] })),
    { d: 430, spans: [sp("        ", null), sp("spice   ", T.text), sp("0.00 bits", T.chili), sp("  ✗ a setting, not a product", T.faint)] },
    { d: 430, spans: [sp("        ", null), sp("sides   ", T.text), sp("0.00 bits", T.chili), sp("  ✗ same on every main", T.faint)] },
    gap,
    { d: 500, spans: stage(4, "BUILD") },
    { d: 500, spans: [sp("      ", null), sp("ask the highest-value question first · re-rank after every answer", T.dim)] },
    gap,
    { d: 500, spans: [sp("✓ ", T.green), sp(`${universe.length} products → a few questions + your settings`, T.green)] },
  ];
}

/* ---------- APP ---------- */

export default function MenuCompiler() {
  const [screen, setScreen] = useState("landing");
  const [diet, setDiet] = useState("all");
  const [logIndex, setLogIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [sideNames, setSideNames] = useState(null);
  const [showWork, setShowWork] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const reducedMotion = useRef(
    typeof window !== "undefined" && window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ).current;

  const universe = useMemo(() => dietFilter(diet), [diet]);
  const S = useMemo(() => statsOf(universe), [universe]);
  const LOG = useMemo(() => buildLog(universe, diet, S), [universe, diet, S]);

  const answers = useMemo(() => Object.fromEntries(history.map((h) => [h.qid, h.oid])), [history]);
  const pool = useMemo(() => filterProducts(answers, universe), [answers, universe]);
  const bits = H(pool.length);

  const flow = useMemo(() => {
    const gains = QUESTIONS.filter((q) => q.kind === "filter" && answers[q.id] === undefined)
      .map((q) => ({ q, g: gain(q.id, pool) }))
      .sort((a, b) => b.g - a.g);
    /* a question is asked only if its gain clears the asking cost */
    const exhausted = gains.filter((x) => x.g <= ASK_COST).map((x) => ({ qid: x.q.id, g: x.g }));
    if (gains.length && gains[0].g > ASK_COST) return { current: gains[0].q, gains, exhausted: [] };
    const heatApplies = pool.some((p) => p.heat);
    if (answers.heat === undefined && heatApplies)
      return { current: QUESTIONS.find((q) => q.id === "heat"), gains, exhausted };
    if (answers.side === undefined)
      return { current: QUESTIONS.find((q) => q.id === "side"), gains,
        exhausted: answers.heat === undefined && !heatApplies ? [...exhausted, { qid: "heat", g: 0 }] : exhausted };
    return { current: null, gains, exhausted };
  }, [answers, pool]);

  /* Two phases: IDENTIFY (entropy-driven) then CONFIGURE (zero-gain settings).
     The transition is the thesis made visible — the moment the product is
     determined, we stop asking about it and start configuring it. */
  const phase = flow.current?.kind === "config" ? "configure" : "identify";
  const resolved = pool.length === 1 ? pool[0] : null;
  const configQs = useMemo(() => {
    const list = [];
    if (pool.some((p) => p.heat)) list.push("heat");
    list.push("side");
    return list;
  }, [pool]);
  const configDone = configQs.filter((q) => answers[q] !== undefined).length;
  const identifyCount = history.filter((h) => QUESTIONS.find((q) => q.id === h.qid)?.kind === "filter").length;

  useEffect(() => {
    if (screen !== "compile") return;
    if (reducedMotion) { const t = setTimeout(() => setScreen("questions"), 700); return () => clearTimeout(t); }
    if (logIndex < LOG.length) {
      const t = setTimeout(() => setLogIndex((i) => i + 1), LOG[logIndex].d);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setScreen("questions"), 1000);
    return () => clearTimeout(t);
  }, [screen, logIndex, reducedMotion, LOG]);

  useEffect(() => {
    if (screen === "questions" && !flow.current) {
      setSideNames(sidePair(answers.side));
      setScreen("results");
    }
  }, [screen, flow, answers.side]);

  const result = useMemo(() => (screen === "results" ? recommend(answers, universe) : null), [screen, answers, universe]);
  const heatMeta = HEAT.find((h) => h.id === answers.heat);

  function answer(qid, oid) { setHistory((h) => [...h, { qid, oid }]); }
  function back() { setHistory((h) => h.slice(0, -1)); }
  function restart() { setHistory([]); setLogIndex(0); setSideNames(null); setScreen("landing"); }

  const trace = useMemo(() => {
    const rows = [];
    let acc = {}, prevPool = universe;
    for (const h of history) {
      acc = { ...acc, [h.qid]: h.oid };
      const next = filterProducts(acc, universe);
      rows.push({ qid: h.qid, oid: h.oid, hBefore: H(prevPool.length), hAfter: H(next.length) });
      prevPool = next;
    }
    return rows;
  }, [history, universe]);

  const WorkToggle = () => (
    <button onClick={() => setShowWork(!showWork)} className="mono"
      style={{ background: showWork ? T.surface2 : "none", border: `1px solid ${T.line}`, color: showWork ? T.green : T.dim, fontSize: 12, padding: "7px 12px", borderRadius: 7 }}>
      {showWork ? "◉" : "○"} show working
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif" }}>
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
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, gap: 10 }}>
          <button onClick={restart} className="mono" style={{ background: "none", border: "none", color: T.text, fontSize: 13, letterSpacing: "0.08em", padding: 0 }}>
            menu<span style={{ color: T.ember }}>_</span>compiler
          </button>
          {(screen === "questions" || screen === "results") && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {screen === "questions" && (
                <span className="mono" style={{ fontSize: 12, color: T.dim }}>
                  <span style={{ color: T.gold }}>{bits.toFixed(2)}</span> bits · <span style={{ color: T.green }}>{pool.length}</span> valid
                </span>
              )}
              <WorkToggle />
            </div>
          )}
        </header>

        {/* LANDING */}
        {screen === "landing" && (
          <div className="rise">
            <p className="mono" style={{ fontSize: 12, color: T.faint, marginBottom: 40 }}>
              $ ready<span className="cursor" style={{ color: T.gold }}>▋</span>
            </p>
            <h1 className="display" style={{ fontSize: "clamp(38px, 8vw, 58px)", lineHeight: 1.06, fontWeight: 600, margin: "0 0 18px" }}>
              {S.products} products.<br />{S.totalBits.toFixed(2)} bits.<br /><span style={{ color: T.gold }}>One order.</span>
            </h1>
            <p style={{ color: T.dim, fontSize: 15.5, lineHeight: 1.55, maxWidth: 430, marginBottom: 34 }}>
              A decompiler for restaurant menus. It finds the decisions hiding
              under the products — then asks you those instead.
            </p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 26 }}>
              {DIETS.map((d) => (
                <button key={d.id} onClick={() => setDiet(d.id)} className="mono"
                  style={{ background: "none", border: `1px solid ${diet === d.id ? T.green : T.line}`,
                    color: diet === d.id ? T.green : T.faint, fontSize: 12, padding: "7px 13px", borderRadius: 999 }}>
                  {d.label.toLowerCase()}
                </button>
              ))}
              {diet !== "all" && (
                <span className="mono" style={{ fontSize: 11.5, color: T.green }}>
                  {statsOf(MENU).totalBits.toFixed(2)} → {S.totalBits.toFixed(2)} bits
                </span>
              )}
            </div>

            <button onClick={() => setScreen("compile")}
              style={{ background: T.ember, border: "none", color: "#1A0F08", fontWeight: 600, fontSize: 16, padding: "15px 28px", borderRadius: 8, display: "block", marginBottom: 30 }}>
              Decompile the menu
            </button>

            <button onClick={() => setShowHow(!showHow)} className="mono"
              style={{ background: "none", border: "none", color: T.faint, fontSize: 12.5, padding: 0 }}>
              {showHow ? "▾" : "▸"} how this tool works
            </button>
            {showHow && (
              <div className="mono rise" style={{ marginTop: 12, borderLeft: `2px solid ${T.line}`, paddingLeft: 16, fontSize: 12.5, lineHeight: 1.9, color: T.dim, maxWidth: 470 }}>
                <p style={{ margin: 0 }}>1. every product is tokenized into attributes — format, protein, style.</p>
                <p style={{ margin: 0 }}>2. the menu's uncertainty is measured in bits: H = log2({S.products}) = {S.totalBits.toFixed(2)}.</p>
                <p style={{ margin: 0 }}>3. each answer you give, the engine asks whichever question removes the most bits (ID3 information gain). order is computed, not designed.</p>
                <p style={{ margin: 0 }}>4. a question must earn its tap: below {ASK_COST.toFixed(2)} bits of gain, it skips itself.</p>
                <p style={{ margin: 0 }}>5. spice and sides carry zero bits about which product you get — they're settings, asked last.</p>
                <p style={{ margin: "10px 0 0", color: T.faint }}>dietary toggles are hard constraints, applied before any question. no allergen or gluten-free filtering — safety-critical data shouldn't be inferred; always check with the restaurant.</p>
              </div>
            )}
          </div>
        )}

        {/* DECOMPILE */}
        {screen === "compile" && (
          <button onClick={() => setScreen("questions")} aria-label="Skip animation"
            className="mono rise"
            style={{ display: "block", width: "100%", textAlign: "left", background: "#12100D", border: `1px solid ${T.line}`, borderRadius: 10, padding: "20px 22px", fontSize: 13, lineHeight: 1.95, color: T.text }}>
            <p style={{ margin: "0 0 8px", color: T.dim }}>$ decompile ./menu{diet !== "all" ? ` --require ${diet}` : ""} <span style={{ color: T.faint }}>— tap to skip</span></p>
            {LOG.slice(0, logIndex).map((l, i) => (
              <p key={i} style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>
                {l.spans.map((s, j) => <span key={j} style={{ color: s.c || T.text }}>{s.t}</span>)}
              </p>
            ))}
            {logIndex < LOG.length && <span className="cursor" style={{ color: T.gold }}>▋</span>}
          </button>
        )}

        {/* QUESTIONS */}
        {screen === "questions" && flow.current && (
          <div className="rise" key={flow.current.id + history.length}>
            {phase === "identify" ? (
              <div style={{ marginBottom: 8 }}>
                <div style={{ height: 4, borderRadius: 2, background: T.line, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${S.totalBits > 0 ? Math.round((1 - bits / S.totalBits) * 100) : 100}%`, background: `linear-gradient(90deg, ${T.gold}, ${T.ember})`, transition: "width .4s ease" }} />
                </div>
                <p className="mono" style={{ fontSize: 11, color: T.faint, margin: "6px 0 0" }}>
                  identifying · entropy removed: {(S.totalBits - bits).toFixed(2)} / {S.totalBits.toFixed(2)} bits
                  {diet !== "all" && <span> · universe: {diet}</span>}
                </p>
              </div>
            ) : (
              <div className="rise" style={{ background: T.surface, border: `1px solid ${T.line}`, borderLeft: `3px solid ${T.green}`, borderRadius: 8, padding: "14px 16px", marginBottom: 18 }}>
                <p className="mono" style={{ fontSize: 11, color: T.green, letterSpacing: "0.1em", margin: 0 }}>
                  ✓ {resolved ? "PRODUCT IDENTIFIED" : `NARROWED TO ${pool.length} CANDIDATES`} IN {identifyCount} QUESTION{identifyCount === 1 ? "" : "S"} · 0.00 BITS REMAIN
                </p>
                {resolved && (
                  <p className="display" style={{ fontSize: 20, fontWeight: 600, margin: "6px 0 0" }}>{resolved.name}</p>
                )}
                <p className="mono" style={{ fontSize: 11.5, color: T.faint, margin: "8px 0 0", lineHeight: 1.65 }}>
                  {resolved
                    ? "no remaining question carries information about which item you get."
                    : "no remaining question clears the asking cost — the tie-break will resolve these."}
                  <br />what's left are settings. they change your order, not which product it is.
                </p>
                <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
                  {configQs.map((q, i) => (
                    <div key={q} style={{ height: 3, flex: 1, borderRadius: 2, background: i < configDone ? T.green : i === configDone ? T.gold : T.line }} />
                  ))}
                </div>
              </div>
            )}

            {flow.exhausted.length > 0 && (
              <div className="mono" style={{ fontSize: 12, color: T.faint, margin: "14px 0 0", lineHeight: 1.7 }}>
                {flow.exhausted.map(({ qid, g }) => (
                  <p key={qid} style={{ margin: 0 }}>
                    <span style={{ color: T.chili }}>−</span> “{qid}” removed itself — {qid === "heat"
                      ? "not a setting on any remaining item"
                      : g <= 1e-9
                        ? "0.00 bits of gain against remaining items"
                        : `gain ${g.toFixed(2)} bits < ${ASK_COST.toFixed(2)} asking cost — not worth a tap`}
                  </p>
                ))}
              </div>
            )}

            <p className="mono" style={{ fontSize: 12, color: T.dim, letterSpacing: "0.1em", margin: "20px 0 10px" }}>
              {phase === "configure"
                ? `SETTING ${configDone + 1} / ${configQs.length} · 0.00 BITS OF PRODUCT INFORMATION`
                : `QUESTION ${identifyCount + 1} · HIGHEST GAIN: ${flow.gains[0]?.g.toFixed(2)} BITS`}
            </p>
            <h2 className="display" style={{ fontSize: "clamp(26px, 5vw, 34px)", fontWeight: 600, margin: "0 0 8px", lineHeight: 1.15 }}>
              {flow.current.prompt}
            </h2>
            <p style={{ color: T.dim, fontSize: 14.5, marginBottom: 22 }}>{flow.current.sub}</p>

            <div style={{ display: "grid", gap: 10 }}>
              {flow.current.options.map((o) => {
                const isFilter = flow.current.kind === "filter";
                const sub = isFilter ? subpool(pool, flow.current.id, o.id) : pool;
                if (isFilter && sub.length === 0) return null;
                return (
                  <button key={o.id} className="opt" onClick={() => answer(flow.current.id, o.id)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                      background: T.surface, border: `1px solid ${T.line}`, borderRadius: 10, padding: "15px 18px",
                      color: T.text, textAlign: "left", transition: "border-color .15s, background .15s",
                      borderLeft: o.color ? `4px solid ${o.color}` : `1px solid ${T.line}` }}>
                    <span style={{ fontWeight: 500, fontSize: 15.5 }}>{o.label}</span>
                    <span className="mono" style={{ fontSize: 12, color: T.dim, display: "flex", gap: 10, alignItems: "center" }}>
                      {showWork && isFilter && <span style={{ color: T.green }}>→{sub.length} · {H(sub.length).toFixed(1)}b</span>}
                      {o.note}
                    </span>
                  </button>
                );
              })}
            </div>

            {showWork && (
              <div className="mono rise" style={{ marginTop: 16, background: "#12100D", border: `1px solid ${T.line}`, borderRadius: 10, padding: "14px 18px", fontSize: 12, lineHeight: 1.85, color: T.dim }}>
                <p style={{ margin: "0 0 4px", color: T.faint }}>// question ranking by information gain · asking cost = {ASK_COST.toFixed(2)} bits (a question must earn its tap)</p>
                {flow.gains.map((x) => (
                  <p key={x.q.id} style={{ margin: 0 }}>
                    gain(<span style={{ color: T.text }}>{x.q.id}</span>) = <span style={{ color: x.g > ASK_COST ? T.green : T.chili }}>{x.g.toFixed(2)} bits</span>
                    <span style={{ color: T.faint }}> {x.g > ASK_COST ? `> ${ASK_COST.toFixed(2)} ✓ worth asking` : `≤ ${ASK_COST.toFixed(2)} ✗ skipped`}</span>
                    {x.q.id === flow.current.id && <span style={{ color: T.gold }}>  ← asking this</span>}
                  </p>
                ))}
                <p style={{ margin: "10px 0 4px", color: T.faint }}>// candidate pool ({pool.length}) · H = {bits.toFixed(2)} bits</p>
                <p style={{ margin: 0, overflowWrap: "break-word" }}>
                  {pool.map((p, i) => (
                    <span key={p.id}><span style={{ color: T.text }}>{p.name}</span><span style={{ color: T.faint }}>{i < pool.length - 1 ? " · " : ""}</span></span>
                  ))}
                </p>
                {trace.length > 0 && (
                  <p style={{ margin: "10px 0 0", color: T.faint }}>
                    last answer: {trace[trace.length - 1].qid}={trace[trace.length - 1].oid} → {trace[trace.length - 1].hBefore.toFixed(2)} → {trace[trace.length - 1].hAfter.toFixed(2)} bits
                    {" "}(<span style={{ color: T.chili }}>−{(trace[trace.length - 1].hBefore - trace[trace.length - 1].hAfter).toFixed(2)}</span>)
                  </p>
                )}
                <p style={{ margin: "8px 0 0", color: T.faint }}>// dietary requirement applied as a hard constraint before the flow — it never competes in this ranking</p>
              </div>
            )}

            {history.length > 0 && (
              <button onClick={back} style={{ marginTop: 20, background: "none", border: "none", color: T.dim, fontSize: 13, padding: 0 }}>← Back</button>
            )}
          </div>
        )}

        {/* RESULTS */}
        {screen === "results" && result && (
          <div className="rise">
            <p className="mono" style={{ fontSize: 12, color: T.green, letterSpacing: "0.1em", marginBottom: 14 }}>
              ✓ COMPILED · {S.totalBits.toFixed(2)} BITS RESOLVED IN {identifyCount} QUESTION{identifyCount === 1 ? "" : "S"} + {configDone} SETTING{configDone === 1 ? "" : "S"}{diet !== "all" ? ` · ${diet.toUpperCase()} UNIVERSE` : ""}
            </p>

            <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderTop: `4px solid ${(result.pick.heat && heatMeta?.color) || T.ember}`, borderRadius: 12, padding: "24px 24px 20px", marginBottom: 14 }}>
              <p className="mono" style={{ fontSize: 11, color: T.dim, letterSpacing: "0.12em", margin: "0 0 6px" }}>YOUR ORDER</p>
              <h2 className="display" style={{ fontSize: "clamp(28px, 6vw, 38px)", fontWeight: 700, margin: "0 0 4px", lineHeight: 1.1 }}>
                {result.pick.heat && heatMeta && heatMeta.id !== "none" ? `${heatMeta.label} ` : ""}{result.pick.name}
              </h2>
              <p style={{ color: T.dim, fontSize: 14, margin: "0 0 6px" }}>
                {result.pick.vegan ? "Plant-based" : result.pick.vegetarian ? "Vegetarian" : answers.protein === "thigh" ? "Chicken thighs" : answers.protein === "wings" ? "Wings" : answers.protein === "breast" ? "Chicken breast" : "Chef's choice of cut"}
              </p>
              {result.pick.heat && heatMeta ? (
                <p style={{ fontSize: 14, margin: "0 0 18px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: heatMeta.color, flexShrink: 0 }} />
                  <span><span style={{ color: T.text, fontWeight: 600 }}>Spice: {heatMeta.label}</span><span style={{ color: T.dim }}> — {heatMeta.note.toLowerCase()}</span></span>
                </p>
              ) : (
                <p style={{ fontSize: 13, color: T.faint, margin: "0 0 18px" }}>{answers.heat ? "Spice isn't a setting on this item" : ""}</p>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
                {(sideNames || []).map((s) => (
                  <span key={s} className="mono" style={{ fontSize: 12.5, background: T.surface2, border: `1px solid ${T.line}`, borderRadius: 999, padding: "6px 12px" }}>+ {s}</span>
                ))}
              </div>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, margin: 0, borderTop: `1px solid ${T.line}`, paddingTop: 16 }}>
                <span className="mono" style={{ fontSize: 11, color: T.dim, letterSpacing: "0.12em", display: "block", marginBottom: 6 }}>IN PLAIN ENGLISH</span>
                {result.pick.plain}
              </p>
            </div>

            {result.alt && (
              <div style={{ background: T.surface, border: `1px dashed ${T.line}`, borderRadius: 12, padding: "16px 22px", marginBottom: 14 }}>
                <p className="mono" style={{ fontSize: 11, color: T.dim, letterSpacing: "0.12em", margin: "0 0 6px" }}>NEAREST ALTERNATIVE</p>
                <p style={{ fontSize: 14.5, margin: "0 0 4px", fontWeight: 600 }}>{result.alt.name}</p>
                <p style={{ fontSize: 13.5, color: T.dim, margin: 0, lineHeight: 1.55 }}>{result.alt.plain}</p>
              </div>
            )}

            {!showWork && (
              <button onClick={() => setShowWork(true)} className="mono"
                style={{ background: "none", border: `1px solid ${T.line}`, color: T.dim, fontSize: 12.5, padding: "10px 16px", borderRadius: 8, width: "100%", textAlign: "left", marginBottom: 14 }}>
                ▸ show the working — entropy trace, gains, tie-breaks
              </button>
            )}
            {showWork && (
              <div className="mono rise" style={{ background: "#12100D", border: `1px solid ${T.line}`, borderRadius: 10, padding: "18px 20px", fontSize: 12.5, lineHeight: 1.9, color: T.dim, marginBottom: 14 }}>
                <p style={{ margin: "0 0 4px", color: T.faint }}>// 1. entropy trace (question order was computed, not fixed)</p>
                {diet !== "all" && (
                  <p style={{ margin: 0 }}>constraint: <span style={{ color: T.chili }}>{diet}</span> → universe {MENU.length} → {S.products} products</p>
                )}
                <p style={{ margin: 0 }}>start: {S.products} products · H = {S.totalBits.toFixed(2)} bits</p>
                {trace.map((r, i) => (
                  <p key={i} style={{ margin: 0 }}>
                    {r.qid}=<span style={{ color: T.gold }}>{r.oid}</span>: {r.hBefore.toFixed(2)} → {r.hAfter.toFixed(2)} bits
                    {r.hBefore - r.hAfter > 1e-9
                      ? <span style={{ color: T.green }}> (−{(r.hBefore - r.hAfter).toFixed(2)})</span>
                      : <span style={{ color: T.faint }}> (configuration — 0 gain by design)</span>}
                  </p>
                ))}
                {QUESTIONS.filter((q) => q.kind === "filter" && answers[q.id] === undefined).map((q) => {
                  const g = gain(q.id, pool);
                  return (
                    <p key={q.id} style={{ margin: 0, color: T.faint }}>
                      <span style={{ color: T.chili }}>−</span> {q.id}: never asked — {g <= 1e-9
                        ? `0.00 bits of gain${diet !== "all" ? " (your constraint already resolved it)" : ""}`
                        : `gain ${g.toFixed(2)} < ${ASK_COST.toFixed(2)} asking cost`}
                    </p>
                  );
                })}

                {result.ranked.length > 1 && (
                  <>
                    <p style={{ margin: "12px 0 4px", color: T.faint }}>// 2. {result.ranked.length} survivors are identical on every asked dimension — tie-break</p>
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
                  <p style={{ margin: "12px 0 0" }}>// 2. entropy reached 0 — exactly one product satisfies your answers. no scoring needed.</p>
                )}

                <p style={{ margin: "12px 0 4px", color: T.faint }}>// 3. why the menu compressed</p>
                <p style={{ margin: 0 }}>{S.products} products · {S.components} unique components · 3 product dimensions + 2 settings.</p>
                <p style={{ margin: 0 }}>heat: selectable on {S.heatCount}/{S.products} items → 0 bits of product information.</p>
                <p style={{ margin: 0 }}>sides: identical on every main → 0 bits. the math lifts both out automatically.</p>
                <p style={{ margin: "6px 0 0", color: T.faint }}>// allergens deliberately excluded — safety-critical fields are never inferred.</p>
              </div>
            )}

            <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 12, padding: "18px 22px", marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
                {[[S.products, "products in universe"], [`${S.totalBits.toFixed(2)}b`, "starting entropy"], [identifyCount, "questions to identify"], [configDone, "settings configured"]].map(([v, l]) => (
                  <div key={l}>
                    <p className="display" style={{ fontSize: 28, fontWeight: 700, margin: 0, color: T.gold }}>{v}</p>
                    <p className="mono" style={{ fontSize: 11, color: T.dim, margin: 0 }}>{l}</p>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={restart} style={{ background: T.ember, border: "none", color: "#1A0F08", fontWeight: 600, fontSize: 15, padding: "13px 24px", borderRadius: 8 }}>
              Compile again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
