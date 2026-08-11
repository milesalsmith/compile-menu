# compile.menu

**A decision compiler for restaurant menus.**

Live: https://compile.menu

Restaurants expose products. Customers make decisions. compile.menu decompiles
a menu into its underlying decision structure, measures the menu's entropy in
bits, and asks the highest-information question at each step until one order
remains.

It's built as a real ID3-style information-gain induction engine — not a
heuristic score, not a quiz with a scripted order. Question order is
*computed* from the dataset, re-ranked after every answer.

## How it works

1. **Measure.** Every item on the menu is tokenized into three fixed decision
   slots — format, protein, style — plus zero-gain settings (heat, portion,
   and sides when the menu has them). The pool's uncertainty is `H = log2(N)`
   bits under a uniform prior.
2. **Rank.** For every unanswered filter question, compute its information
   gain — how many bits the current entropy would drop if you answered it.
   Ask the highest-gain question first.
3. **Self-remove.** A question only gets asked if its gain clears an asking
   cost (`ASK_COST = 0.5` bits) — otherwise it removes itself and says why
   ("gain 0.33 < 0.50 asking cost — not worth a tap"). Heat, portion and
   sides normally carry *zero* bits of information about which product you
   get, so the math itself demotes them from questions to settings, asked
   last.
4. **Resolve.** Once no remaining question clears the bar, the flow leaves
   the *identify* phase (finding the product) and enters *configure*
   (settings that change the order, not which item it is). If more than one
   item is still indistinguishable on every asked dimension, a disclosed
   tie-break — never presented as the engine itself — picks one.

Dietary constraints (vegetarian / vegan) are applied *before* the flow starts:
they shrink the candidate universe and never compete in the gain ranking.

The three decision **slots** are fixed. Their **option values** are per-menu:
the shipped demo uses its closed chicken-shop vocabulary; an uploaded menu
supplies its own labels in the restaurant's words. The engine never coerces a
pizza or curry menu into burger / pitta / wrap.

## Try it

```bash
pnpm install
pnpm run dev       # http://localhost:5173 — Workers AI is remote in local dev
pnpm run test      # engine + extraction acceptance tests (vitest)
pnpm run build     # tsc -b + vite build
pnpm run deploy    # build + wrangler deploy
```

Requires Node 22.13+ (pinned via `.nvmrc` / `engines`).

## Compile your own menu (PDF)

From the landing page you can upload a restaurant menu PDF. The pipeline is
Cloudflare-native end to end — no third-party AI key:

```
PDF upload
  → Workers AI toMarkdown (document metadata suppressed)
  → Workers AI JSON Mode (structured extraction)
  → deterministic source grounding + validation
  → per-menu vocabulary
  → the same information-gain compiler as the demo
```

The model **interprets the document only**. It leaves the decision loop before
any recommendation: names, dietary flags and size variants are checked against
the converted markdown; invented attributes are dropped; a menu with too few
items or no attribute variety is refused. Recommendation, question order and
tie-breaks stay pure TypeScript.

Uploaded menus are **ephemeral**. They live in that browser tab's memory for
the session. Nothing is persisted, nothing is written to disk, and nothing is
hosted as a branded directory. Closing the tab forgets the menu.

Hard gates before any expensive work: platform rate limiting on
`POST /api/extract`, an 8 MB size cap, a `%PDF-` signature check (client MIME
is advisory), and an explicit refusal when converted text exceeds the reliable
extraction ceiling (~50k characters) — never a silent truncation.

## The engine, verified

The engine lives entirely in [`src/lib/entropy.ts`](src/lib/entropy.ts),
[`src/lib/flow.ts`](src/lib/flow.ts), and
[`src/lib/recommend.ts`](src/lib/recommend.ts) — pure functions, no React
dependency, unit-tested against the demo dataset's real numbers in
[`src/lib/entropy.test.ts`](src/lib/entropy.test.ts) and
[`src/lib/flow.test.ts`](src/lib/flow.test.ts):

- `H(21) ≈ 4.392` bits for the full demo menu (classic grilled single/double
  handhelds collapsed into portion settings).
- Opening gains: format ≈ 2.27 > style ≈ 1.63 > protein ≈ 1.34 bits — format
  is asked first.
- `format=plate` → `protein=thigh` drains style's gain to exactly 0; it
  self-removes.
- `format=burger` → `protein=veg` leaves no surviving item with heat; heat
  self-removes as not applicable.
- `format=wrap` → `protein=breast` resolves to one portion-configurable item;
  style is zero-gain.
- Vegan universe: 2 items, 1.00 bit, and protein/style both collapse to zero
  gain — the flow resolves in a single question.
- `ASK_COST` (0.5 bits) fires on exactly 1 of the 23 terminal answer paths
  (bowl→breast); worst-case survivors after all filter questions is 3;
  survivor distribution across every path is `{1: 17, 2: 4, 3: 2}`.

Extraction has its own synthetic-menu suite under
[`src/lib/extraction/`](src/lib/extraction/) (no real PDFs in the repo):
upload gates, conversion/model failures, source grounding, dietary markers,
portion collapse, and a walk that proves an extracted menu drives the same
`nextQuestion` / `gain` / `recommend` path twice with identical answers.

These are acceptance tests, not snapshots — see
[`.cursor/rules/010-engine.mdc`](.cursor/rules/010-engine.mdc) for the engine
invariants and [`.cursor/rules/020-worker-api.mdc`](.cursor/rules/020-worker-api.mdc)
for the extraction boundary. If a change breaks a verified number, the change
is wrong, not the number.

## Stack

- Vite + React + TypeScript (SPA)
- Cloudflare Workers via `@cloudflare/vite-plugin` (static assets +
  `POST /api/extract`)
- Workers AI (`env.AI`) for PDF → markdown and JSON Mode extraction
- Cloudflare Rate Limiting binding on the extraction route
- pnpm, Node 22+
- Vitest for the engine and extraction suites

## Structure

```
src/
├── lib/              # the engine + extraction fence — pure, tested, no React
│   ├── entropy.ts      # H, subpool, gain, ASK_COST
│   ├── flow.ts         # next-question selection, self-removal, entropy trace
│   ├── recommend.ts    # tie-break + final pick, side pairing
│   ├── stats.ts        # dietary filtering, menu stats
│   ├── menu.ts         # CompiledMenu, DEMO_MENU, buildQuestions(vocab)
│   ├── vocabulary.ts   # MenuVocabulary (Worker-safe, no demo dataset import)
│   └── extraction/     # schema, portion collapse, validate, pipeline + tests
├── data/             # the demo dataset (21 items) + UI question copy
├── components/       # Landing, MenuUpload, DecompileLog, QuestionCard, …
└── App.tsx           # owns state, wires components to the engine
worker/
├── index.ts          # POST /api/extract (rate-limited) + 404 elsewhere
└── ai.ts             # the only file that touches env.AI
```

## What's in / what's out

**In:** the demo compiler on a fixed 21-item dataset, plus PDF upload that
produces a validated in-memory menu and feeds the same engine. Extraction is
the project's *only* probabilistic step.

**Deliberately out of scope, not overlooked:**

- **No allergen or gluten-free filtering.** Menu text rarely carries
  complete, safety-critical allergen data, and an LLM should never be asked
  to infer it. If this is added later, it will be hand-verified data only.
- **No live URL scraping.** PDF upload only (no paste-text path in this
  release).
- **No "I know what I want" expert bypass.** It contradicts the point of a
  decision compiler.
- **Two postures on names.** The shipped demo dataset stays generic
  (components only, no branded product names). User-uploaded menus keep the
  item's real name verbatim from the source, with a component `plain`
  description beneath; nothing is persisted or published as a directory.
- **No agents, queues, R2, KV or D1** for menus. Ephemeral session state only.

Historical build notes (including earlier Anthropic-oriented plans) live in
[`BUILD.md`](BUILD.md) and are left as context, not current instructions.

## License

No license file yet — treat as all-rights-reserved until one is added.
