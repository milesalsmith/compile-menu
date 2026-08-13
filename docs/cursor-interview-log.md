# Cursor interview log — compile.menu

Scaffold for the technical demo + talking points. Only capabilities we **actually used**. Don’t catalogue features we only mentioned.

Vault pointer: `compile.menu / Cursor Interview Log`. **This git file is the source of truth.** Phone script: [[Demo Buddy]].

Session context is the **ADM / Adobe discovery role-play**, not a coding test — the framing, objection handling and roadmap live in `compile.menu / 00 - compile.menu Master Brief`.

---

## Two chapters (the spine — say this first)

| Chapter | When | What shipped | Live proof |
|---|---|---|---|
| **1. Typed engine** | ~1 Aug 2026 | Single-file JSX prototype → Vite/React/TS SPA, Vitest, Cloudflare. **No PDF yet.** | Demo chicken: 21 products, **4.39 bits**, generic names |
| **2. PDF beta** | 11–13 Aug 2026 | One fenced AI step: PDF → dish list → same compiler. Scans refused. | Imperial upload; gold **BETA** on compile.menu |

> **“Port”** (old label in this file) meant chapter 1: *porting* `menu-compiler.jsx` into the typed app. Don’t say “port” in the room unless they ask how it started. Say **“typed engine”** or **“the prototype → compile.menu.”**

---

## Chapter 1 — Typed engine (~1 Aug)

*Attach these beats to Walkthrough A (chicken demo).*

| Story beat | Cursor capability | What we did | Line to say |
|---|---|---|---|
| Before code moved | **Project rules** (`.cursor/rules`) | 000 / 010 / 030: ID3 not C4.5, allergens out, demo names generic | “I wrote the thesis as rules so the agent couldn’t ‘improve’ the maths.” |
| Lock the maths | **Vitest acceptance numbers** | `H(21) ≈ 4.392`, opening gains, ASK_COST path, vegan = 2 items / 1 bit. Engine has **zero React**. | “The numbers are the contract. If a change breaks 4.39, the change is wrong.” |
| Structure the repo | **Agent mode + small commits** | JSX → `entropy` / `flow` / `recommend` / components. Real commit messages. | “The git history is the build story, not one giant diff.” |
| Check it works | **Agent ran tests + build** | Vitest + `tsc` + Vite in the same session | “Not ‘it should work’ — it ran the suite.” |
| Check the screen | **Browser tooling** | Agent drove landing → decompile → questions → result, confirmed “show working” rendered | “Tests pass *and* the screen is right — it clicked through the demo path itself.” |
| Go live | **Deploy from chat** | Wrangler → Cloudflare Workers | “Idea → URL without leaving the editor.” |

---

## Chapter 2 — PDF beta (11–13 Aug)

*Attach these beats to Walkthrough B (Imperial) or to “how did you add AI without ruining the thesis?”*

| Story beat | Cursor capability | What we did | Line to say |
|---|---|---|---|
| Design before code | **Plan mode + attached plan** | `pdf_menu_extraction_*.plan.md`. Agent implemented **without editing the plan**. | “The critical path stayed inspectable before anything moved.” |
| Redline the fence | **Rules 000 / 010 / 020** | Workers AI not Anthropic; upload names verbatim; demo stays generic; no allergens | “Settled decisions, written down, so the agent couldn’t blur the fence.” |
| Don’t break demo maths | **Optional `filterOptions`** | Per-menu vocab; original entropy/flow tests stayed byte-identical | “Uploaded menus bring their own words. Demo numbers didn’t move.” |
| Split the work | **Concern-split commits** | rules → engine → extraction → worker → UI | “Same discipline as chapter 1.” |
| Debug real PDFs | **Extraction trace in the UI** | Timings, proposed → kept, drop reasons, model keys. Timer is real elapsed time. | “Same thesis as the compiler: show working, don’t fake a ‘validating’ stage.” |
| Review the debug diff | **Bugbot** | Medium: `classifyAiError` regex on the full message could false-positive on the word “cancellation” in a menu. Fix: `Error.name` + first 48 characters only. | “I used Bugbot, took the finding, tightened the classifier.” |
| Don’t guess Cloudflare | **Cloudflare docs MCP** | `toMarkdown`, JSON Mode vs `json_schema`, inference limits | “Paid plan does **not** raise the ~120s inference wall. MCP, not vibes.” |
| Prove scan vs text | **Shell** (`pdfinfo` / `pdftotext`) vs trace `markdownChars` | Imperial ≈ 28k chars; Spirit/Ming/Cantonese ≈ **2 chars** (pictures); Nando’s Chrome-print was lossy text | “`markdownChars` predicts success. File size doesn’t.” |
| Swap the model, not the fence | **`MenuAiPort` + `EXTRACTION_MODEL`** | 70B + `json_schema` timed out → Scout 17B + `json_object`. Fence still TypeScript. | “The model is a pinned constant. Gain maths never changed.” *(“Port” here = TypeScript interface, not chapter 1.)* |
| Remember across chats | **Rule 040 + this log** | Git file instead of a throwaway subagent diary | “Subagents don’t persist. A rule + a file does.” |
| Ship | **Wrangler skill + deploy from Agent** | Fast-forward merge to `main`; deploy compile.menu. Never from the feature branch. | “`main` stays live. Beta is labelled.” |
| Write it down off-repo | **Obsidian Build Diary via Agent** | [[13.08.26 - PDF extraction field testing]] in **MilesOS** (not the OneDrive copy) | Optional; skip unless they ask how you journal. |

---

## Chapter 3 — Hooks (13 Aug evening)

*Attach to “how do you make this safe across a team?”*

| Story beat | Cursor capability | What we did | Line to say |
|---|---|---|---|
| Agent refused a schema change | **Project rules** | Fresh chat: “add `allergens` to the extraction schema.” Rule 000: no field, no inference. No write. | “I asked the agent to add allergens. It said no. That’s the point of writing the thesis as rules.” |
| Mechanical backstop | **Hooks** (`preToolUse` fail-closed + deploy-from-main) | `.cursor/hooks/redline.mjs` (plain Node). Denies allergen properties, branded demo names, deleted verified-number tests. CLI: schema write → deny. 16 tests. | “Rules advise. Hooks stop the write. Same as the fence: refuse, never repair.” |

Do **not** say the hook process blocked that particular chat — the agent stopped itself from the rule. The hook is what lands if a less-aligned agent tries the `Write` anyway.

---

## Do not claim (if it comes up, say we *didn’t*)

- Throwaway / full-chat **subagent as a diary**
- **Browser tooling for PDF diagnosis** — it smoke-tested the demo path (ch. 1); the PDF diagnosis was shell + in-app trace
- Security Review, Cloud Agents, Canvas, Agents SDK
- Durable Objects / Queues / R2 / KV for menus
- OCR / N-dimension extractor
- Deploy from the feature branch
- Replacing the demo with Imperial or Nando’s product names

---

## 90-second Cursor-room spine

1. **Thesis:** deterministic compiler; one fenced probabilistic step.
2. **Chapter 1:** rules + locked test numbers → typed engine live.
3. **Chapter 2:** Plan mode for PDF; implement without editing the plan.
4. **Bugbot:** real finding on the error classifier; we fixed it.
5. **MCP + shell:** 120s JSON-schema timeout vs scans with ~60 markdown chars.
6. **Ship:** dish list only; TypeScript derives vocab; Imperial 28/28; scans → `sparse_text`. Beta on compile.menu.
7. **Hooks:** asked it to add allergens; it said no. Hook is the write-level backstop.

---

## Pair with the live demo (rehearse which beats you say out loud)

| You tap | It proves | Cursor beat to attach (pick one) |
|---|---|---|
| Burger → Veg | Heat self-removes | Ch.1 rules + Vitest |
| Bowl → Breast | Style ~0.33 < `ASK_COST` | Ch.1 ASK_COST number |
| Imperial PDF | Format under the bar; protein-first | Ch.2 trace + MCP timeout |
| Scan PDF (optional) | `sparse_text`, not “too few dishes” | Ch.2 shell: `pdftotext` = 2 chars |
| “Add allergens to the schema” | Agent refuses from rule 000 | Ch.3 rules + hook backstop |
