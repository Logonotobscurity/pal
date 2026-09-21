# PAL — Current Implementation Status

**Last updated:** 2026-09-21  
**Purpose:** Reduce doc drift (see issue #2). This file describes what exists in the repository *today* versus what `PAL_ARCHITECTURE.md` describes as the target.

---

## Product framing (implemented in UI copy)

Core promise in the product surface:

> Speak naturally. PAL understands the meaning, builds the work, and **asks before it acts**.

Pipeline language used in Command / Approvals:

```text
Speak → Understand → Plan → Ask → Act → Verify
```

Safety invariant (always visible on home):

> Agents propose. Policy decides. You approve. Executor acts. Verifier confirms.  
> No model may directly execute an external side effect.

---

## Implemented (backend + UI)

| Area | Status | Location |
|------|--------|----------|
| Auth + workspace tenancy (Supabase) | Implemented | `src/lib/auth`, `src/app/(auth)`, RLS migrations |
| Voice ingestion (Sahara adapter) | Implemented | `src/providers/sahara*`, `src/app/api/voice/*`, `src/services/voice` |
| Semantic Agent (SpeechEvent → MeaningState) | Implemented | `src/providers/openai-llm.ts`, `src/services/semantic`, `/api/semantic/analyze` |
| Workflow Agent (MeaningState → ActionPlan / WorkflowIR) | Implemented | `src/providers/openai-workflow.ts`, `src/services/workflow`, `/api/workflow/generate` |
| Workflow IR validation | Implemented | `src/core/workflow/validator.ts` |
| Capability registry | Implemented (mostly mock executors) | `src/core/capabilities/registry.ts` |
| Policy / proposal creation | Implemented | services + `/api/proposals*` |
| Approval API (approve / reject / edit + optimistic locking) | Implemented | `/api/proposals/[id]/*` |
| Approvals UI (list, card, detail) | Implemented | `src/components/approvals/*`, `src/app/approvals` |
| Execution + verification API stubs | Implemented | `/api/executions`, `/api/verifications` |
| Domain schemas (Zod) | Implemented | `src/core/schemas/*` |
| Env boundary | Implemented | `src/lib/env.ts`, `.env.example` |

---

## Partially implemented / in flight

| Area | Notes |
|------|--------|
| OpenRouter as LLM gateway | Provider + route support is merged into `main`; optional gateway configuration remains |
| ASK-centered product copy | Command, Approvals list/page/card/detail are on `main` |
| AgentStatus component | Added and used by the public `/command` demo |
| CI pipeline | Present in `.github/workflows/ci.yml` |
| Security policy doc | Active policy is present in `docs/PAL_SECURITY.md` |

---

## Not yet implemented (architecture target)

| Area | Architecture ref | Notes |
|------|------------------|--------|
| Research intelligence plane | §4 Plane B | No search/claim/evidence graph agents |
| React Flow workspace UI | §5 / structure | Schema exists; no visual editor |
| Real executors (WhatsApp, email, etc.) | §30–34 | Issue #3 — still mock |
| Supabase Realtime broadcast for live transcripts | §8 | Issue #5 |
| Activity / audit feed UI | Structure | Deferred |
| Benchmark run artifacts (dataset load + measured results) | `scripts/benchmark/` | Harness exists (`evaluate-pipeline.ts`, `load-dataset.py`, `metrics/`); no completed run published — see `MARKDOWN_VALIDATION_REPORT.md` |
| Observability (structured logs + error tracking) | — | Issue #4 |
| `agents/` top-level package layout | §9 | Logic lives under `services/` + `providers/` instead |
| Command / voice frontend fully connected | — | Backend ready; mic UI not fully wired |

---

## Repository layout (actual vs ideal)

**Actual pragmatic layout:**

```text
src/
  app/           # App Router pages + API routes
  components/    # approvals, auth, agent (status)
  core/          # schemas, capabilities, workflow validator, errors
  providers/     # sahara, openai-llm, openai-workflow
  services/      # voice, semantic, workflow, execution, …
  lib/           # auth, db, env, audio
```

Ideal layout in `PAL_ARCHITECTURE.md` §9 (agents/, benchmarks/, intelligence routes, etc.) remains the **target**. Prefer extending `services/` + `providers/` until a deliberate restructure is planned.

---

## LLM configuration (current + preferred)

| Variable | Role |
|----------|------|
| `OPENAI_API_KEY` | Direct OpenAI (required on main today) |
| `OPENAI_MODEL` | Model id (e.g. `gpt-4o-mini` or `openai/gpt-4o-mini` for OpenRouter) |
| `OPENROUTER_API_KEY` | Preferred gateway once PRs #8–#10 land |
| `OPENROUTER_BASE_URL` | Default `https://openrouter.ai/api/v1` |

---

## Open work (tracked issues)

| Issue | Priority | Topic |
|-------|----------|--------|
| #1 | P0 | Rotate previously exposed secrets (manual) |
| #2 | P1 | Architecture ↔ repo reconciliation (this file starts it) |
| #3 | P1 | Real executor path |
| #4 | P1 | Observability |
| #5 | P1 | Phase 4 hardening + challenge eval |

---

## Guidance for coding agents

1. Treat this file as the ground truth for “what exists.”
2. Do not implement Research plane or React Flow workspace without an explicit task.
3. Keep the safety invariant: **propose → policy → approve → execute → verify**.
4. Prefer small, reviewable PRs; avoid overlapping files with open PRs #6–#10.
5. When you ship a capability listed under “Not yet implemented,” update this file in the same PR.
