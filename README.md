# compile.menu

**A decision compiler for restaurant menus.**

Live: [compile-menu.milesalsmithrog.workers.dev](https://compile-menu.milesalsmithrog.workers.dev)

Restaurants expose products. Customers make decisions. compile.menu decompiles
a menu into its underlying decision structure, measures the menu's entropy in
bits, and asks the highest-information question at each step until one order
remains.

It's built as a real ID3-style information-gain induction engine — not a
heuristic score, not a quiz with a scripted order. Question order is
*computed* from the dataset, re-ranked after every answer.

## How it works

1. **Measure.** Every item on the menu is tokenized into attributes (format,
   protein, style, heat, side). The pool's uncertainty is `H = log2(N)` bits
   under a uniform prior.
2. **Rank.** For every unanswered question, compute its information gain —
   how many bits the current entropy would drop if you answered it. Ask the
   highest-gain question first.
3. **Self-remove.** A question only gets asked if its gain clears an asking
   cost (`ASK_COST = 0.5` bits) — otherwise it removes itself and says why
   ("gain 0.33 < 0.50 asking cost — not worth a tap"). Heat and sides
   normally carry *zero* bits of information about which product you get,
   so the math itself demotes them from questions to settings, asked last.
4. **Resolve.** Once no remaining question clears the bar, the flow leaves
   the *identify* phase (finding the product) and enters *configure*
   (heat, sides — things that change the order, not which item it is). If
   more than one item is still indistinguishable on every asked dimension,
   a disclosed tie-break — never presented as the engine itself — picks one.

Dietary constraints (vegetarian / vegan) are applied *before* the flow starts:
they shrink the candidate universe and never compete in the gain ranking.

## Try it

```bash
pnpm install
pnpm run dev       # http://localhost:5173
pnpm run test      # engine acceptance tests (vitest)
pnpm run build     # tsc -b + vite build
pnpm run deploy    # build + wrangler deploy
```

Requires Node 22.13+ (pinned via `.nvmrc` / `engines`).

## The engine, verified

The engine lives entirely in [`src/lib/entropy.ts`](src/lib/entropy.ts),
[`src/lib/flow.ts`](src/lib/flow.ts), and
[`src/lib/recommend.ts`](src/lib/recommend.ts) — pure functions, no React
dependency, unit-tested against the demo dataset's real numbers in
[`src/lib/entropy.test.ts`](src/lib/entropy.test.ts) and
[`src/lib/flow.test.ts`](src/lib/flow.test.ts):

- `H(24) ≈ 4.585` bits for the full 24-item demo menu.
- Opening gains: format ≈ 2.28 > style ≈ 1.61 > protein ≈ 1.32 bits — format
  is asked first.
- `format=plate` → `protein=thigh` drains style's gain to exactly 0; it
  self-removes.
- `format=burger` → `protein=veg` leaves no surviving item with heat; heat
  self-removes as not applicable.
- Vegan universe: 2 items, 1.00 bit, and protein/style both collapse to zero
  gain — the flow resolves in a single question.
- `ASK_COST` (0.5 bits) fires on exactly 2 of the 23 terminal answer paths;
  worst-case survivors after all filter questions is 3; survivor
  distribution across every path is `{1: 15, 2: 5, 3: 3}`.

These are acceptance tests, not snapshots — see
[`.cursor/rules/010-engine.mdc`](.cursor/rules/010-engine.mdc) for the full
invariant list. If a change breaks one of these numbers, the change is wrong,
not the number.

## Stack

- Vite + React + TypeScript (SPA)
- Cloudflare Workers via `@cloudflare/vite-plugin` (static assets today; one
  `/api/*` route reserved for menu extraction)
- pnpm, Node 22+
- Vitest for the engine test suite

## Structure

```
src/
├── lib/            # the engine — pure, tested, no React
│   ├── entropy.ts    # H, subpool, gain, ASK_COST
│   ├── flow.ts        # next-question selection, self-removal, entropy trace
│   ├── recommend.ts   # tie-break + final pick, side pairing
│   └── stats.ts       # dietary filtering, menu stats
├── data/            # the demo dataset (24 items) + UI question copy
├── components/      # Landing, DecompileLog, QuestionCard, WorkingPanel, Results
└── App.tsx          # owns state, wires components to the engine
worker/
└── index.ts         # Cloudflare Worker entry (static assets today)
```

## What's here vs. what's planned

This is currently a **deterministic demo on a fixed, hand-built 24-item
dataset** — the compiler itself is fully real and tested, but "compile your
own menu" (paste text or upload a PDF, extract structure via the Anthropic
API, run the same engine on it) is designed but not yet wired up. The
extraction endpoint would be the project's *only* probabilistic step — the
recommendation logic itself never touches an LLM. See
[`BUILD.md`](BUILD.md) for the full plan, including the extraction schema,
worker route, and instrumentation design.

Deliberately out of scope, not overlooked:

- **No allergen or gluten-free filtering.** Menu text rarely carries
  complete, safety-critical allergen data, and an LLM should never be asked
  to infer it. If this is added later, it will be hand-verified data only.
- **No live URL scraping.** Paste text or PDF only.
- **No "I know what I want" expert bypass.** It contradicts the point of a
  decision compiler.
- **No real branded product names**, anywhere — dataset, UI, or extraction
  output. Items are described generically, by their components.

## License

No license file yet — treat as all-rights-reserved until one is added.
