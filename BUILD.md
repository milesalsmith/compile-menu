# compile.menu — Build Plan (final, v0.3)

A decision compiler for restaurant menus. The engine is real ID3-style
information-gain induction — question order is computed, not designed.
Deployed on Cloudflare Workers at **compile.menu**.

**Thesis:** Restaurants expose products. Customers make decisions. This tool
decompiles a menu into its underlying decision structure, measures the menu's
entropy, and asks the highest-information question at every step until one
order remains.

**Stack:** Vite + React + TypeScript · Cloudflare Workers (static assets + one
API route) · Anthropic API (extraction only).

**Reference implementation:** `menu-compiler.jsx` from the Claude chat — a
complete, working, verified single-file version. Cursor's job is to PORT it
into a proper repo, not reinvent it. Keep it open in a tab throughout.

---

## Decisions already made (do not relitigate mid-build)

1. **Engine is ID3-style information gain, not heuristic scoring.**
   Entropy of the candidate pool = log2(N) under a uniform prior. Gain of a
   question = current entropy minus branch-size-weighted expected entropy.
   Always ask the argmax-gain question. Verified against the dataset:
   H(menu) = 4.585 bits; opening gains format 2.28 > style 1.61 > protein 1.32.
2. **Honest naming:** call it "ID3-style, generalised for multi-valued
   attributes" (breast|thigh items sit in two branches, so branches overlap
   and weights are normalised branch sizes). Do NOT claim C4.5 — gain ratio,
   continuous attributes and pruning are deliberately out of scope.
3. **Tie-breaks are disclosed as tie-breaks.** When survivors are identical on
   every asked dimension (worst case: 3 items), a small preference rule picks
   (exact-cut items, stronger style overlap). Labelled in the UI as a
   tie-break, never presented as the engine.
4. **Zero-gain questions remove themselves and say why.** Heat and sides have
   0 bits of gain about which product you get — the math derives that they're
   settings, not products. Filter questions that run dry mid-flow also
   self-remove with the reason shown.
5. **No expert / "I know what I want" path.** Contradicts the product.
6. **"Show working" is a first-class toggle**, not a buried panel: live gain
   ranking in bits, candidate pool, per-answer entropy trace, tie-break table.
7. **No real branded product names anywhere in the shipped product.** The
   dataset mirrors a real flame-grilled chicken menu item-for-item, but every
   name is generic and composition-based. The extraction feature enforces the
   same rule on uploaded menus. Nominative references to the real chain are
   fine in the LinkedIn post / write-up (commentary), but a per-item
   "(on menu as X)" mapping in the live product is an explicit NON-GOAL —
   systematic, persistent brand-name display is where nominative fair use
   stops being comfortable. Do not add it back during a polish pass.
8. **No live URL scraping.** Paste-text and PDF upload only. Fetching a
   restaurant's site on the user's behalf raises separate ToS questions; the
   user already has the content in hand when they paste or upload.
9. **Dietary requirements are constraints, not preferences.** Add a
   vegetarian/vegan toggle upfront, BEFORE the question flow — it shrinks the
   universe the entropy math operates on and never competes in the gain
   ranking. Data model: replace the `veg` boolean with
   `dietary: { vegetarian: boolean, vegan: boolean }` (halloumi/bean/feta
   items are vegetarian-not-vegan; plant fillet wrap and grain bowl are
   vegan). Bonus demo moment: toggling vegan visibly drops the starting
   entropy on the meter.
10. **Cost-of-asking threshold: ASK_COST = 0.5 bits.** A question is asked
   only if its information gain clears the bar; below-bar questions
   self-remove with the reason shown ("gain 0.33 < 0.50 asking cost — not
   worth a tap") and the tie-break resolves survivors. This is
   cost-sensitive decision-tree induction. Verified by exhaustive path
   simulation: fires on 2 of 23 terminal paths, worst-case survivors stays
   at 3, 15/23 paths still resolve to exactly one product. Structural
   parallel to Cursor's Tab policy (suggest only when P(accept) > 25%,
   per their online-RL blog post): both integrate "is this interruption
   worth it?" into the mechanism itself rather than bolting on a filter.
   The honest framing: their threshold is LEARNED from 400M daily requests;
   ours is COMPUTED because with a small discrete catalogue the entropy
   math is exact. Do not add RL — at portfolio traffic volumes it would be
   fitting to noise and would destroy the deterministic-engine story.
11. **Gluten-free and allergens are deliberately OUT of v1.** Menu text
   rarely carries complete allergen/cross-contamination info, and the upload
   feature's LLM extraction must never infer safety-critical fields —
   allergen status is explicitly excluded from the extraction schema. If
   added later: hand-verified datasets only, never AI-extracted ones, always
   with a "confirm with the restaurant" disclaimer, framed as a filter aid
   not a guarantee. (Interview answer: "extraction is probabilistic and
   allergens are safety-critical, so that field is excluded from the LLM's
   schema by design.")

---

## 0. Machine setup (Windows / ASUS G14)

Cursor is a VS Code fork with full native Windows support; Wrangler is a Node
CLI. PowerShell is sufficient for everything below (WSL2 optional, not needed).

1. Install **Node.js 20+** → `node --version`
2. Install **Git for Windows**
3. Install **Cursor**, sign in
4. **Cloudflare:** register `compile.menu` via Registrar (same-account custom
   domain binding later is one click)
5. **Anthropic API key** ready. Known gotcha from the Skilljar course: Warp
   can block `api.anthropic.com` — add a split-tunnel exception or work from
   the personal side. The key will live as a Wrangler secret, never in git.

---

## 1. Scaffold

```powershell
npm create vite@latest compile-menu -- --template react-ts
cd compile-menu
npm install
npm install -D wrangler
```

**Cursor prompt:**

> Create `wrangler.jsonc` for a Vite + React SPA on Cloudflare Workers with
> static assets: serve `dist`, single-page-application not-found handling,
> run the Worker first only for `/api/*`. Compatibility date today. Add
> `.assetsignore` for node_modules, .git, .DS_Store.

```jsonc
{
  "name": "compile-menu",
  "compatibility_date": "2026-07-14",
  "main": "./worker/index.ts",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application",
    "binding": "ASSETS",
    "run_worker_first": ["/api/*"]
  },
  "workers_dev": true
}
```

(Workers + static assets is Cloudflare's own current recommendation for new
projects, over Pages.)

---

## 2. Repo structure

```
compile-menu/
├── worker/
│   └── index.ts            # /api/extract → Anthropic; else ASSETS
├── src/
│   ├── data/
│   │   └── demo-menu.ts    # the 24-item generic dataset (paste from artifact)
│   ├── lib/
│   │   ├── types.ts        # MenuItem, Question, Answers
│   │   ├── entropy.ts      # H, subpool, gain  ← the ID3 engine
│   │   ├── flow.ts         # next-question selection, self-removal, trace
│   │   ├── recommend.ts    # tie-break + pick/alt
│   │   └── sides.ts
│   ├── components/
│   │   ├── Landing.tsx
│   │   ├── DecompileLog.tsx    # tokenizing animation, data-derived, tap-to-skip
│   │   ├── QuestionCard.tsx    # option cards with →N · bits badges
│   │   ├── WorkingPanel.tsx    # gains ranking, pool, entropy trace
│   │   ├── Results.tsx         # order card, alternative, trace, stats
│   │   └── MenuUpload.tsx      # paste / PDF → /api/extract
│   ├── App.tsx
│   └── main.tsx
├── wrangler.jsonc
└── BUILD.md
```

**Port order matters:** data → types → entropy.ts → flow.ts → components.
Get the deterministic demo running locally, then deployed, BEFORE touching
the API feature. A live deterministic site is the safety net.

---

## 3. The engine spec (what Cursor must implement in `entropy.ts` / `flow.ts`)

**Cursor prompt (give it the artifact as context too):**

> Implement the decision engine from the reference file. In `entropy.ts`:
> `H(n)` = 0 for n<=1 else log2(n); `subpool(pool, qid, oid)` applying hard
> filters for format/protein/style (veg handled as: veg option matches
> veg items, meat options exclude veg items); `gain(qid, pool)` = 0 for
> config questions (heat, side), else H(pool) minus the branch-size-weighted
> expected entropy over non-empty option branches (branches may overlap
> because some items support multiple proteins — weights are normalised
> branch sizes). Export `ASK_COST = 0.5` (bits). In `flow.ts`: the next
> question is the argmax-gain unanswered filter question if its gain >
> ASK_COST; otherwise heat (only if any
> remaining item has heat=true), then side, then done. Track which questions
> self-removed and why. Expose an entropy trace: for each answer, pool size
> and H before/after.

**Acceptance tests** (write these as actual Vitest tests — they're also your
interview evidence):

- `H(24) ≈ 4.585`
- Opening gains on the demo dataset: format ≈ 2.28, style ≈ 1.61,
  protein ≈ 1.32; format is asked first
- `format=plate` then `protein=thigh` → `gain(style) = 0` → style self-removes
- `format=burger` then `protein=veg` → no survivor has heat → heat self-removes
- Worst-case survivors after all filter answers = 3 (classic breast burgers);
  tie-break selects deterministically
- Every reachable answer path terminates (no empty pools shown — zero-count
  options are pruned before render)
- ASK_COST threshold: `format=wrap` then `protein=breast` → `gain(style) ≈
  0.33 < 0.5` → style never asked, tie-break resolves 2 survivors. Same for
  `format=bowl` then `protein=breast`. Exhaustive path walk: threshold fires
  on exactly 2/23 terminal paths; survivor distribution {1: 15, 2: 5, 3: 3}

---

## 4. Deploy the deterministic version

```powershell
npm run build
npx wrangler deploy
```

Test the full flow on the `*.workers.dev` URL, then bind the domain:
Worker → Settings → Domains & Routes → add `compile.menu`.

**Checkpoint: a real, live, mathematically verified product. Everything
after this is upside.**

---

## 5. The AI feature: "Compile your own menu"

The rule that makes this credible to an Anthropic reviewer: **the LLM does
extraction only; the engine stays deterministic.** One probabilistic step,
fenced, validated — not a recommendation chatbot.

### 5a. Worker route

**Cursor prompt:**

> In `worker/index.ts`: POST `/api/extract` reads `{ menuText: string }`,
> calls the Anthropic Messages API, returns the extracted JSON array. All
> other requests fall through to `env.ASSETS.fetch(request)`. Key from
> `env.ANTHROPIC_API_KEY`. Model `claude-haiku-4-5-20251001`, max_tokens
> 4096. Proper status codes on failure. Cap menuText length (~50k chars).

- Endpoint: `POST https://api.anthropic.com/v1/messages`
- Headers: `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`
- Haiku, not Opus: extraction is a scoped structured task — fast and cheap is
  correct here.

Extraction system prompt (verbatim, in the Worker):

```
You convert restaurant menu text into structured JSON. Output ONLY a JSON
array, no prose, no markdown fences. Each element:
{ "name": string, "format": one of ["burger","pitta","wrap","plate","bowl"],
  "proteins": array of ["breast","thigh","wings","veg"],
  "styles": array from ["classic","cheesy","garlicky","loaded","fresh"],
  "veg": boolean, "heat": boolean (true if the item is grilled/served in a
  selectable spice level),
  "plain": one sentence describing what the item actually is, using no
  branded product name — describe it by its components only }.
Ignore drinks, desserts and kids' menus. If a field is unknown, make the most
reasonable inference from the description.
```

The "no branded product name" instruction is the product thesis executing,
not a legal disclaimer: the extractor's job is to discard the marketing name
and surface the underlying decision.

### 5b. Secret

```powershell
npx wrangler secret put ANTHROPIC_API_KEY
```

### 5c. Upload component

**Cursor prompt:**

> Build `MenuUpload.tsx`: a textarea for pasted menu text plus a file input
> for .pdf/.txt. Extract PDF text client-side with pdf.js. POST to
> `/api/extract`, reuse the decompile-log loading style, then validate the
> response: JSON.parse defensively (strip accidental fences), check each
> element against MenuItem, drop malformed entries, require >= 4 valid items
> else show a friendly error. Feed valid items into the same entropy engine —
> the decompile animation, gains and question order are all data-derived, so
> they just work on the new dataset.

Let Cursor pull current pdf.js docs when it writes that integration — the API
surface may have moved.

---

## 6. Instrumentation hooks

Cursor's Tab threshold is learned from accept/reject signal at 400M
requests/day. We can't train at portfolio volume — but we CAN collect the
signal an adaptive threshold would need. Build the measurement, defer the
learning.

**Events to emit** (fire-and-forget beacon, no PII, no free text):

| event | payload |
|---|---|
| `flow_started` | `{ diet, universeSize, startBits }` |
| `question_answered` | `{ qid, oid, gainBits, bitsBefore, bitsAfter, qIndex }` |
| `question_self_removed` | `{ qid, gainBits, reason: "zero" \| "below_cost" \| "not_applicable" }` |
| `flow_completed` | `{ questionsAsked, survivors, tieBreakUsed }` |
| `flow_abandoned` | `{ lastQid, qIndex, bitsRemaining }` (fired via `visibilitychange`/`pagehide`) |
| `compile_again` | `{ previousPickId }` — the closest thing we have to a "reject" signal |
| `menu_extracted` | `{ itemsReturned, itemsDropped, sourceKind: "paste" \| "pdf" }` |

**Cursor prompt:**

> Create `src/lib/telemetry.ts` with a `track(event, payload)` function that
> POSTs to `/api/telemetry` using `navigator.sendBeacon` (fallback: fetch
> with keepalive). In `worker/index.ts`, handle POST `/api/telemetry` by
> writing to a Workers Analytics Engine dataset binding (add
> `analytics_engine_datasets` to wrangler.jsonc). No cookies, no user IDs,
> no IP storage — event name, numeric fields, and coarse timestamp only.
> Never block or delay the UI on telemetry; failures are silently dropped.

**What the data answers later:**
- Do people abandon at a particular question? (→ its real cost is higher
  than 0.5 bits: raise the bar or reword it)
- Does `compile_again` correlate with tie-break picks? (→ tie-break rule
  needs work)
- Is extraction dropping many malformed items? (→ tighten the prompt)

**Explicit non-goal:** no A/B testing, no online learning, no per-user
adaptation in v1. The instrumentation exists so the ASK_COST constant can be
justified or revised with evidence — a number chosen by judgment today,
auditable by data later. That sentence is also the interview answer.

---

## 7. Launch assets (post, not product)

- Record the 30-second demo on the phone: landing → decompile log →
  entropy meter dropping → a question self-removing → order. The veg-burger
  path (heat deletes itself) and the plate→thigh path (style deletes itself)
  are the two money moments.
- One-off clip pasting a genuinely huge real public menu into "compile your
  own" — dramatic compression number. Caption "tested against [chain]'s real
  public menu". Commentary reference only; never shipped as a site feature.
- Keep the Cursor chat history — "here's the conversation that built the
  engine" is stronger evidence than the claim.

**30-second VP script:**
"This menu is 4.6 bits of uncertainty. Every answer is the highest-information
question the algorithm can ask — watch the meter. Questions delete themselves
when they run out of information. Four taps, zero bits, one order. The engine
is ID3-style decision-tree induction; Cursor built it from a spec
conversation, and it runs on Cloudflare Workers."

**Positioning honesty:** don't claim novelty of guided configurators (Warby
Parker, car builders, insurance wizards exist). The contribution is naming
the pattern, making the compression measurable in bits, and generalising it.
"Isn't this just a quiz?" → "Yes — and that's the point. A good quiz already
compresses decisions; this makes why-it-works legible and portable."

---

## 8. Ship checklist

- [x] Vitest engine tests pass (Section 3 numbers)
- [ ] Deterministic demo live at compile.menu
- [ ] "Compile your own" works on pasted text and a PDF
- [x] API key absent from git history
- [x] No branded product names in dataset, UI, or extraction output
- [ ] Mobile-clean (the demo IS the phone), reduced-motion respected
- [ ] OG image + meta tags so the link unfurls on LinkedIn
- [ ] Demo clips recorded; Cursor chat history saved

---

*Not legal advice. The generic-composition approach and commentary-only brand
references are well-trodden defaults, but for a public project tagging
potential employers, a quick check with someone qualified is cheap insurance.*
