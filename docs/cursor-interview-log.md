# Cursor interview log — compile.menu

Living list of **Cursor product capabilities actually used** on this project, with the beat you’d tell in a technical interview. Update it when a new capability earns its keep — don’t catalogue features we only mentioned.

Vault mirror: `compile.menu / Cursor Interview Log` (Obsidian). This file in git is the source of truth.

| When | Capability | What we did | Interview beat |
|---|---|---|---|
| Plan → build | **Plan mode + attached plan** | Wrote `pdf_menu_extraction_*.plan.md`, then Agent implemented without editing the plan. | Critical path stayed inspectable before code moved. |
| Whole repo | **Project rules** (`.cursor/rules/`) | 000 / 010 / 020 / 030 as constraints; redlined branded names + Workers AI *before* feature code. | Rules as product thesis, not style nits. Agent didn’t relitigate ID3 vs C4.5. |
| Engine generalisation | **Verified numbers as tests** | Optional `filterOptions` defaulting to demo vocab; both original test files stayed byte-identical. | How you keep an agent from “improving” the maths. |
| Extraction fence | **Agent mode, concern-split commits** | rules → engine → extraction → worker → UI, not one blob. | Portfolio git history; agent followed commit structure in the plan. |
| Debug upload failures | **Show working / trace** | Extraction fence returns timings + drop reasons; UI elapsed timer (not fake “validating” stage). | Same thesis as the compiler: inspectability over magic. Caught Nando’s = 3k chars from 1.5MB, Imperial/Mexican = 121s extract timeout. |
| Trace PR review | **Bugbot** (`/review-bugbot`) | Reviewed uncommitted debug diff. One medium: `classifyAiError` regex on full error message could false-positive on echoed menu text (“cancellation”). | Used Bugbot, took the finding, classified from `Error.name` + first 48 chars only. |
| Cloudflare APIs | **Cloudflare docs MCP** | `search_cloudflare_documentation` for toMarkdown options, JSON Mode, pricing/limits. | Didn’t guess Workers AI tiers; Paid ≠ longer inference timeout. |
| PDF diagnosis | **Shell + real artefacts** | `pdfinfo` / `pdftotext` on user PDFs vs trace `markdownChars`. | Trace + local tools: Nando’s is conversion-lossy Chrome print; Mexican 9.6k still timed out → model/JSON Mode, not “menu too long”. |
| Model swap | **Pinned constant behind a port** | `MenuAiPort` + `EXTRACTION_MODEL`. 70B+`json_schema` → Scout 17B+`json_object`. | Fence stays the schema; provider/model is swappable without touching gain maths. |
| Field test 13.08.26 | **Trace + Bugbot + shell** | Imperial 28/28; image PDFs ~60 md chars; Bugbot on `classifyAiError`. | Two products pretending to be one: compile text menus vs OCR. Shipped the first as beta. |

## What we deliberately did *not* use

- **New full agent / throwaway subagent as a diary** — they don’t persist across chats. A file + a rule does.
- **Agents SDK / Durable Objects / Queues / R2** for menus — out of scope; ephemeral session only.
- **Deploy from the feature branch** — `main` stays live.

## Talking sequence (≈90s)

1. Thesis: deterministic compiler, one fenced probabilistic step.
2. Cursor: plan + rules so the agent couldn’t blur that fence.
3. Bugbot on the debug trace: real finding, we fixed it.
4. Trace on real PDFs: conversion starvation vs 120s JSON-schema timeout vs Scout `invalid_output` with proposed 0.
5. The fence was right — we had asked the model to invent vocabulary+evidence. Now it emits a dish list; TypeScript derives vocab and grounds names.
6. Field PDFs: Imperial (Excel text) compiles; Spirit/Ming/Cantonese are pictures. Sparse-text gate, not OCR.
