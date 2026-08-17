# Cursor tool mapping — [compile.menu](http://compile.menu)

When we use a **distinct Cursor capability** in a meaningful way, we log it here: the name as Cursor ships it, what we actually did, how to use it, and the one-line description. Rule **040** is what appends to this file. Ordinary Agent edits, greps, and commits stay out.

**This git file is the source of truth.** A throwaway subagent does not persist. A rule + a file does.

Obsidian pointer (legacy note title): `compile.menu / Cursor Interview Log`.

**How to demo** = what you actually click or run. Don’t wait on a cloud agent as the proof.

**Freeze:** no more Cursor product demos (Cloud Agents, Skills, Security Review, a second canvas, JSON eval fixtures). This is a **capability catalogue**, not a feature brochure. Do not run every row.

## Two chapters (the spine — say this first)


| Chapter             | When           | What shipped                                                                       | Live proof                                              |
| ------------------- | -------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **1. Typed engine** | ~1 Aug 2026    | Single-file JSX prototype → Vite/React/TS SPA, Vitest, Cloudflare. **No PDF yet.** | Demo chicken: 21 products, **4.39 bits**, generic names |
| **2. PDF beta**     | 11–13 Aug 2026 | One fenced AI step: PDF → dish list → same compiler. Scans refused.                | Imperial upload; gold **BETA** on compile.menu          |


> **“Port”** (old label in this file) meant chapter 1: *porting* `menu-compiler.jsx` into the typed app. Don’t say “port” in the room unless they ask how it started. Say **“typed engine”** or **“the prototype → compile.menu.”**

---

## Chapter 1 — Typed engine (~1 Aug)

*Attach these beats to Walkthrough A (chicken demo).*


| Story beat         | Cursor capability                   | What we did                                                                                        | Line to say                                                                       | How to demo                                              |                                                                                                                                                                                  |
| ------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Before code moved  | **Project rules** (`.cursor/rules`) | 000 / 010 / 030: ID3 not C4.5, allergens out, demo names generic                                   | “I wrote the thesis as rules so the agent couldn’t ‘improve’ the maths.”          | Open `.cursor/rules/000-project.mdc`. Don’t re-litigate. |                                                                                                                                                                                  |
| Lock the maths     | **Vitest acceptance numbers**       | `H(21) ≈ 4.392`, opening gains, ASK_COST path, vegan = 2 items / 1 bit. Engine has **zero React**. | “The numbers are the contract. If a change breaks 4.39, the change is wrong.”     |                                                          | `pnpm vitest run src/lib/entropy.test.ts src/lib/flow.test.ts` — or tap Burger → Veg on compile.menu (4.39 on screen). These are the engine tests, **not** the 16 redline tests. |
| Structure the repo | **Agent mode + small commits**      | JSX → `entropy` / `flow` / `recommend` / components. Real commit messages.                         | “The git history is the build story, not one giant diff.”                         | `git log --oneline` on the port commits.                 |                                                                                                                                                                                  |
| Check it works     | **Agent ran tests + build**         | Vitest + `tsc` + Vite in the same session                                                          | “Not ‘it should work’ — it ran the suite.”                                        | Same Vitest run; site is already live.                   |                                                                                                                                                                                  |
| Check the screen   | **Browser tooling**                 | Agent drove landing → decompile → questions → result, confirmed “show working” rendered            | “Tests pass *and* the screen is right — it clicked through the demo path itself.” | compile.menu: decompile → questions → Working panel.     |                                                                                                                                                                                  |
| Go live            | **Deploy from chat**                | Wrangler → Cloudflare Workers                                                                      | “Idea → URL without leaving the editor.”                                          | Open compile.menu.                                       |                                                                                                                                                                                  |


---

## Chapter 2 — PDF beta (11–13 Aug)

*Attach these beats to Walkthrough B (Imperial) or to “how did you add AI without ruining the thesis?”*


| Story beat                    | Cursor capability                                            | What we did                                                                                                                                                  | Line to say                                                                                                        | How to demo                                                                             |
| ----------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Design before code            | **Plan mode + attached plan**                                | `pdf_menu_extraction_*.plan.md`. Agent implemented **without editing the plan**.                                                                             | “The critical path stayed inspectable before anything moved.”                                                      | Open the attached plan file; don’t live-plan.                                           |
| Redline the fence             | **Rules 000 / 010 / 020**                                    | Workers AI not Anthropic; upload names verbatim; demo stays generic; no allergens                                                                            | “Settled decisions, written down, so the agent couldn’t blur the fence.”                                           | `000-project.mdc` item 5–6 + Imperial upload names stay verbatim.                       |
| Don’t break demo maths        | **Optional `filterOptions`**                                 | Per-menu vocab; original entropy/flow tests stayed byte-identical                                                                                            | “Uploaded menus bring their own words. Demo numbers didn’t move.”                                                  | After Imperial, chicken demo still 4.39 / 21 items.                                     |
| Split the work                | **Concern-split commits**                                    | rules → engine → extraction → worker → UI                                                                                                                    | “Same discipline as chapter 1.”                                                                                    | `git log` on the PDF branch.                                                            |
| Debug real PDFs               | **Extraction trace in the UI**                               | Timings, proposed → kept, drop reasons, model keys. Timer is real elapsed time.                                                                              | “Same thesis as the compiler: show working, don’t fake a ‘validating’ stage.”                                      | Imperial upload → Working / trace panel.                                                |
| Review the debug diff         | **Bugbot**                                                   | 13 Aug, `/review-bugbot` on **uncommitted** `feature/pdf-menu-extraction` (trace diff). Medium: `classifyAiError` regexed the full error message (`/cancel/`). Workers AI can echo the extract **prompt** (instructions + converted menu) into `error.message`, so “cancellation policy” looked like a timeout. Fix: `Error.name` + first 48 characters. Locked in `ai-error.test.ts`. Not a GitHub comment. | “Don’t trust the error body — it might be the menu talking.”                                                       | Open `src/lib/extraction/ai-error.test.ts`. See **Bugbot demo** below. Not PR #1.        |
| Don’t guess Cloudflare        | **Cloudflare docs MCP**                                      | `toMarkdown`, JSON Mode vs `json_schema`, inference limits                                                                                                   | “Paid plan does **not** raise the ~120s inference wall. MCP, not vibes.”                                           | Say the number; don’t live-query docs.                                                  |
| Prove scan vs text            | **Shell** (`pdfinfo` / `pdftotext`) vs trace `markdownChars` | Imperial ≈ 28k chars; Spirit/Ming/Cantonese ≈ **2 chars** (pictures); Nando’s Chrome-print was lossy text                                                    | “`markdownChars` predicts success. File size doesn’t.”                                                             | **No scan file staged** — branded menus stay ephemeral, so this cannot be re-run live. Show `pipeline.test.ts` (`sparse_text`) or the canvas rows instead. |
| Leave the field table open    | **Canvas**                                                   | Planted 16 Aug: `extraction-field-board.canvas.tsx`. Inlined 13 Aug field rows (not live Workers AI, not a vault fetch). Claim: `markdownChars` predicts; file size does not. Two clusters: scans ~60 chars vs fence. | “Same thesis as the compiler — show working. This is the field table, not a slide.”                                | Tab already open. See **Canvas demo** below. Do not generate it in the 90-second spine.  |
| Swap the model, not the fence | `**MenuAiPort` + `EXTRACTION_MODEL**`                        | 70B + `json_schema` timed out → Scout 17B + `json_object`. Fence still TypeScript.                                                                           | “The model is a pinned constant. Gain maths never changed.” *(“Port” here = TypeScript interface, not chapter 1.)* | Show `EXTRACTION_MODEL` in worker code.                                                 |
| Remember across chats         | **Rule 040 + this mapping**                                  | Git file instead of a throwaway subagent diary. We log a capability when we actually use it — not a feature brochure.                                        | “Subagents don’t persist. A rule + a file does.”                                                                   | `.cursor/rules/040-cursor-tool-mapping.mdc` + this file. Lead with `000-project.mdc` for the thesis; this file if they ask how tool-use survives chats. |
| Ship                          | **Wrangler skill + deploy from Agent**                       | Fast-forward merge to `main`; deploy compile.menu. Never from the feature branch.                                                                            | “`main` stays live. Beta is labelled.”                                                                             | Gold BETA on compile.menu.                                                              |
| Write it down off-repo        | **Obsidian Build Diary via Agent**                           | [[13.08.26 - PDF extraction field testing]] in **MilesOS** (not the OneDrive copy)                                                                           | Optional; skip unless they ask how you journal.                                                                    | Skip in the room.                                                                       |


### Bugbot demo (~20s — untrusted input / “how do you review agent code?”)

Local `/review-bugbot` on the extraction-trace diff, 13 Aug. **Not** a GitHub Bugbot comment. Different job from the PR #1 Automation (thesis enforcement, refuse-don’t-fix).

The PDF is converted to markdown, then stuffed into the extract **prompt** (`extractionUserPrompt`). If `ai.run` throws, `error.message` can echo that prompt — including footer copy like “cancellation policy.” The first classifier regexed `/cancel/` on the whole body, so a non-timeout could be labelled `ai_timeout`. The model did not “fail to parse legal text.” The compiler never sees this.

**How to demo:** open [`src/lib/extraction/ai-error.test.ts`](src/lib/extraction/ai-error.test.ts) — `does not classify from menu wording echoed in the error body`. Optional: the comment in `ai-error.ts`. Do not run Bugbot live. Do not open PR #1 for this beat.

**Line to say:** “The upload becomes the prompt. If the API throws, the error string can be the menu talking. Bugbot caught us classifying from that string. We only trust `Error.name` and the first 48 characters now — and there’s a test for it.”

---

### Canvas demo (planted 16 Aug — after Imperial, ~30s)

The board is a **receipt of the 13 Aug loop**, not the extractor. compile.menu stays Walkthrough B (Imperial upload → trace). Open the canvas only if they ask how you knew scans were pictures, or if you have 30 seconds after Imperial.

**How to demo**

1. Tab already open beside chat: [extraction field board](/home/miles/.cursor/projects/home-miles-projects-compile-menu/canvases/extraction-field-board.canvas.tsx). Command Palette → Open Canvas if it isn’t. Do **not** wait on the agent to generate it.
2. Point at the claim, then Beefeater vs scans: 8.1 MB still 21 kept; 4–8 MB pictures → ~60 `markdownChars` → 0→0.
3. **Nudge (the Cursor beat, one sentence):** *“Sort by markdownChars ascending and mark the ~60-char rows as scans.”* Layout change in place. Backup: the planted board already makes the claim if the nudge is slow.
4. Back to compile.menu if needed.

**Line to say:** “We ran real PDFs, recorded the traces, this board is that table. `markdownChars` is the operator metric. File size isn’t. If it’s ~60, it’s a scan. If it’s 10k+ and kept is low, it’s the fence.”

**Do not say:** that it pulls live from Obsidian or from Workers AI (rows are inlined); that more markdown means more dishes kept (`curry-menu` is 35k → 2); that the restaurant PDFs are in the repo (they’re not — traces only, branded menus stay ephemeral); that we built a JSON eval fixture (we didn’t — `pipeline.test.ts` already locks `sparse_text`).

---

## Chapter 3 — Hooks (13 Aug evening)

*Attach to “how do you make this safe across a team?” Three surfaces, one rule — not Cursor’s three headline products.*

Systems map (what each layer does, why merge still works, why a real org would not use the cloud agent as the lock): Obsidian `03-reference/compile.menu/Build Diary` → [[16.08.26 - Rules Hooks Automation]]. Git talking points stay in this file.


| Story beat                    | Cursor capability                                       | What we did                                                                                                                                                                                                                                               | Line to say                                                                                                                                              | How to demo                                                                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Agent refused a schema change | **Project rules**                                       | Fresh chat: “add `allergens` to the extraction schema.” Rule 000: no field, no inference. No write.                                                                                                                                                       | “I asked the agent to add allergens. It said no. That’s the point of writing the thesis as rules.”                                                       | **New chat** (not this one): “add `allergens` to the extraction schema.” Agent refuses. Do **not** say the hook blocked that chat.                                                                                       |
| Mechanical backstop           | **Hooks** (`preToolUse` fail-closed + deploy-from-main) | `.cursor/hooks/redline.mjs` (plain Node). Denies allergen properties, branded demo names, deleted verified-number tests. CLI: schema write → deny. 16 tests in `src/lib/redline.test.ts` (they guard the engine tests; they do not run `H()` / `gain()`). | “Rules advise. Hooks stop the write. Same as the fence: refuse, never repair.”                                                                           | Terminal — see commands below. 16 passed + `redline: clean` + stdin `permission: deny`. Do not edit `schema.ts`.                                                                                                         |
| Same redline on a PR          | **Cursor Automations** (16 Aug)                         | `compile.menu PR redline` **proven on PR #1** (`demo/redline-allergen`, do not merge). Cursor bot commented: redline failed on `src/lib/extraction/schema.ts`, rule 000, same policy as the local hook. GitHub check still green — that means the *agent finished*, not that redline passed. Comment-only; no merge lock. | “The hook stops the write in Cursor. The Automation posts the same sentence on the PR, so a reviewer who never opened the editor still sees the thesis.” | **PR #1 already open.** Scroll to the cursor comment. Do not merge. Do not wait on a new run. Close + delete the branch after Tuesday. If they notice the green check: “That’s the agent finishing. The verdict is the comment.” |


Do **not** say the hook process blocked that particular chat — the agent stopped itself from the rule. The hook is what lands if a less-aligned agent tries the `Write` anyway.

### Hook demo (terminal — rehearsed 16 Aug)

From repo root. Same stdin Cursor sends on `preToolUse`. Schema on disk stays clean.

```bash
pnpm vitest run src/lib/redline.test.ts
node .cursor/hooks/redline.mjs --check-tree
printf '%s' '{"tool_name":"Write","tool_input":{"path":"src/lib/extraction/schema.ts","contents":"export const EXTRACTION_JSON_SCHEMA = { properties: { allergens: { type: \"array\" } } };"}}' | node .cursor/hooks/redline.mjs
```

Expect: 16 passed; `redline: clean`; `permission: deny` — `Redline refused src/lib/extraction/schema.ts` — rule 000, fence rejects them, do not add them to the schema.

**Automation clip (proven 16 Aug):** [PR #1](https://github.com/milesalsmith/compile-menu/pull/1) — same sentence from Cursor bot. Do not merge. A comment does not block GitHub; blocking merge would be a failing check **plus** branch protection. Out of scope for this room.

---

## Do not claim (if it comes up, say we *didn’t*)

- Throwaway / full-chat **subagent as a diary**
- **Browser tooling for PDF diagnosis** — it smoke-tested the demo path (ch. 1); the PDF diagnosis was shell + in-app trace
- Security Review, Agents SDK
- Durable Objects / Queues / R2 / KV for menus
- OCR / N-dimension extractor
- Deploy from the feature branch
- Replacing the demo with Imperial or Nando’s product names
- That the hook blocked the allergen chat (the rule did)
- Waiting on the Automation in the 90-second spine
- That the redline comment **blocks merge** (it doesn’t; the GitHub check is “agent finished”)
- Live-generating the Canvas in the 90-second spine (it was planted; nudge is optional)
- That the Canvas fetches Obsidian or re-runs extraction (inlined 13 Aug rows)
- A JSON traces eval set in git (not built; Vitest already asserts `sparse_text`)
- That you can upload a **scan live** — no scan file is staged (branded menus stay ephemeral). The 13 Aug scan rows are inlined in the canvas; `pipeline.test.ts` is the runnable proof.
- A **GitHub Bugbot comment** on this finding (it was local `/review-bugbot` on uncommitted work). Don’t point at PR #1 for Bugbot — that’s the redline Automation.
- That the model “couldn’t parse cancellation policy” or that those words can’t enter the compiler. The bug was **our** classifier trusting the error body.

---

## 90-second Cursor-room spine

1. **Thesis:** deterministic compiler; one fenced probabilistic step.
2. **Chapter 1:** rules + locked test numbers → typed engine live.
3. **Chapter 2:** Plan mode for PDF; implement without editing the plan.
4. **Bugbot:** untrusted menu text in the error body; we stopped classifying from it. Show `ai-error.test.ts`, not a PR.
5. **MCP + shell:** 120s JSON-schema timeout vs scans with ~60 markdown chars.
6. **Ship:** dish list only; TypeScript derives vocab; Imperial 28/28; scans → `sparse_text`. Beta on compile.menu. Optional: planted Canvas (field table) — don’t generate it live.
7. **Three surfaces, one rule:** chat refuses (rules) → stdin deny (hook) → planted PR comment (Automation). Don’t wait on a cloud run.

---

## Pair with the live demo (rehearse which beats you say out loud)


| You tap                                    | It proves                           | Cursor beat to attach (pick one)  | How to demo                    |
| ------------------------------------------ | ----------------------------------- | --------------------------------- | ------------------------------ |
| Burger → Veg                               | Heat self-removes                   | Ch.1 rules + Vitest               | compile.menu chicken path      |
| Bowl → Breast                              | Style ~0.33 < `ASK_COST`            | Ch.1 ASK_COST number              | Same session; Working panel    |
| Imperial PDF                               | Format under the bar; protein-first | Ch.2 trace + MCP timeout          | Upload; show trace             |
| `ai-error.test.ts` (optional)              | Don’t trust the error body          | Ch.2 **Bugbot**                   | Open the cancellation-policy test. Not PR #1. |
| `EXTRACTION_MODEL` in `worker/ai.ts`       | Smaller job, not bigger invoice     | Ch.2 model pin                    | Show the constant + the 70B comment. |
| Extraction field board (optional)          | `markdownChars` vs file size        | Ch.2 **Canvas**                   | Tab already open; one nudge. Do not generate live. |
| Scan PDF (optional)                        | `sparse_text`, not “too few dishes” | Ch.2 shell: `pdftotext` = 2 chars | **No scan file staged.** Open `pipeline.test.ts` (`sparse_text`) instead |
| “Add allergens to the schema”              | Agent refuses from rule 000         | Ch.3 **rules**                    | Fresh Cursor chat              |
| `printf` allergen Write into `redline.mjs` | Hook deny; tree still clean         | Ch.3 **hooks**                    | Commands in Chapter 3 above    |
| PR #1 cursor comment                       | Same sentence on GitHub             | Ch.3 **Automation**               | Tab on the fail comment; do not merge |

---

## Appendix — mapping proofs to a discovery brief

compile.menu is a credibility prop: one sentence of product, then the engineering posture. Evaluators score discovery, org insight, and presence — not feature coverage. Room sheet (not this file): `02-adobe-technical-demo/adobe-room-sheet.md`. Phone script: [[Demo Buddy]].

| They said | You show (already shipped) | Tap |
| --- | --- | --- |
| Model selection | Smaller **job**, not bigger invoice: 70B + `json_schema` timed out → Scout 17B + `json_object`. Cursor-side: Plan / Agent / Bugbot are different jobs — don’t live-swap the picker. | `EXTRACTION_MODEL` in `worker/ai.ts`. Optional: Bugbot test. |
| Context management | Thesis in **rules** (not pasted every chat). **Attached plan** (inspectable). **MCP** retrieves platform truth. **Rule 040 + this file** survive chats. **Hooks** aren’t in the prompt. Canvas is a view, not a vault dump. | Allergen refusal chat; this file if they ask how memory works. |
| Cursor vs Claude Code / Copilot | For one PE, Claude Code can do a lot in a terminal. Difference is **organisational**: versioned rules → laptop hook → same sentence on the PR for people who never open Cursor. | Three surfaces (Ch.3). |
| Security / untrusted input | Allergens never inferred. Uploads ephemeral. Bugbot: don’t regex the Workers AI **error body** — it can echo the extract prompt (instructions + converted menu). | `ai-error.test.ts`. Not PR #1. |
| Org rollout past power users | Hooks travel with the repo. Automation comments on the PR. A cloud agent is **not** the merge gate. | Hook `printf` + [PR #1](https://github.com/milesalsmith/compile-menu/pull/1) comment. |

**If you’re walking a discovery room:** discovery first (~8–10 min). One product path. Two or three proofs from the table. Stop when they nod.


