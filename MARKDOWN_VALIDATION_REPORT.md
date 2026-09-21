# Markdown Implementation Validation Report

**Date:** 2026-09-21 (recompiled — per-file verdicts)
**Repo:** `Logonotobscurity/pal` @ `main` (`bc002484`)
**Method:** Every markdown file checked against the source tree, `package.json`, `src/lib/env.ts`, migrations, API routes, services, `src/data/benchmark-results.json` (`status: not_run`), and test files (22 files / 183 tests per `TYPE_AUDIT_REPORT.md`).

## Summary

| Verdict | Count |
| --- | --- |
| Accurate — matches implementation | 22 |
| Stale / inaccurate | 10 |
| Mixed (accurate core + stale numbers) | 4 |

**Ground truth that docs must not contradict**

- Benchmark: **not run**. Canonical: `src/data/benchmark-results.json` → `status: "not_run"`.
- Tests: **183** in **22** files (not 139 / 176).
- Migrations: **8** files (`0001` … `0008_function_execution_hardening.sql`).
- React Flow: **schema + unit tests only**. No `@xyflow/react` / `reactflow` dependency, no canvas UI.
- Voice mic: **no** `MediaRecorder` / `getUserMedia` in `src/`.
- Executors: **mock only** (`src/services/execution/executors/mock.ts`).
- `SAHARA_MODEL_ID` and `OPENROUTER_*` appear in `.env.example` but are **not** parsed in `src/lib/env.ts`.
- `supabase/.temp/` is in `.gitignore` and **not** currently tracked. Git history of secrets still exists (`SECURITY_INCIDENT.md`).

---

## Per-file verdict

### Status / plan

| File | Verdict | Notes |
| --- | --- | --- |
| `docs/PAL_IMPLEMENTATION_STATUS.md` | **Accurate** | Updated 2026-09-21. Correctly lists React Flow as schema-only, mock executors, mic not wired, benchmark harness without published run. OpenRouter noted as env-preferred; still not in `env.ts`. Issue numbers (#1–#5) are process, not code. |
| `docs/PAL_EXECUTION_PLAN.md` | **Stale** | Phases 0–3 path claims match (13 API routes, services exist). Stale: “139 tests” (lines 105, 131); remaining Phase 4 path `benchmarks/runs/` (actual loader writes `benchmarks/datasets/` which is **not** in the tree). |
| `CHALLENGE_STATUS.md` | **Stale** | Dated 15 Sep 2026. Tests 139/139 (4 places). Prototype/video/benchmark pending is still true. Security “resolved” overstates `SECURITY_INCIDENT.md` (remediation in progress). |
| `.kiro/specs/truth-resolution-architecture/design.md` | **Process** | Design-only; not claimed as shipped. Accurate as a plan. |

### `*_IMPLEMENTATION.md` vs code

| File | Verdict | Evidence |
| --- | --- | --- |
| `VOICE_INGESTION_IMPLEMENTATION.md` | **Accurate (paths)** | All three voice routes + `src/services/voice/*` exist. Mic UI still absent (doc should not imply a live recorder). |
| `SEMANTIC_AGENT_IMPLEMENTATION.md` | **Accurate** | `/api/semantic/analyze` + `services/semantic/{agent,db}.ts`. |
| `WORKFLOW_AGENT_IMPLEMENTATION.md` | **Accurate (paths)** | `/api/workflow/generate`, `services/workflow/*`, `core/workflow/validator.ts`. React Flow **schema** exists; visual editor does not. |
| `EXECUTION_SERVICE_IMPLEMENTATION.md` | **Accurate** | Service + mock executor honestly described. |
| `VERIFICATION_AGENT_IMPLEMENTATION.md` | **Accurate** | `/api/verifications/[executionId]` + service exist. |
| `POLICY_ENGINE_IMPLEMENTATION.md` | **Mixed** | Engine + schema exist. Stale **139 tests** (lines 174, 214). |
| `APPROVAL_UI_IMPLEMENTATION.md` | **Mixed** | List/card/detail + 3 pages exist. Stale **139 tests**. |
| `PHASE_4_BENCHMARK_IMPLEMENTATION.md` | **Mixed** | Honest “infrastructure complete, integration pending.” Stale **176 tests**. Dataset files still not in repo. |

### `docs/PAL_*` architecture / domain / security / benchmark

| File | Verdict | Notes |
| --- | --- | --- |
| `docs/PAL_ARCHITECTURE.md` | **Target architecture** | Large target spec. Drift vs repo is expected and called out in `PAL_IMPLEMENTATION_STATUS.md`. Do not treat §9 layout (`agents/`, intelligence plane, React Flow UI) as shipped. Line ~2078 WER 14% is a counter-example, not a result. |
| `docs/PAL_DOMAIN_MODEL.md` | **Accurate** | Status enums match Zod (proposal, approval, execution, verification). `ReactFlowWorkspace` is a **data** type, not a UI. |
| `docs/PAL_SECURITY.md` | **Accurate** | Matches current `.env.example` warnings; no live secrets in that file. |
| `docs/PAL_BENCHMARK.md` | **Accurate** | Methodology; comparison uses placeholders. Aligns with `not_run`. |
| `docs/PAL_AGENT_ASSISTANCE.md` | **Accurate** | Matches `.github/workflows/ci.yml` gate. |
| `docs/VOICE_INGESTION_GUIDE.md` | **Accurate (backend)** | Sahara WS / PCM path; no browser mic wiring. |
| `SECURITY_INCIDENT.md` | **Accurate as incident log** | Status still **REMEDIATION IN PROGRESS**. Rotation remains a human action. History of `.env.example` secrets is real. |

### Root / challenge / ops docs

| File | Verdict | Notes |
| --- | --- | --- |
| `README.md` | **Mixed** | Evaluation table correctly `_pending_`. Footer still says **176 tests** (lines 427, 440). |
| `SUBMISSION.md` | **Accurate** | Template; no invented scores. Status file is on `main` (not “open PR”). |
| `CHALLENGE_SUBMISSION.md` | **Stale / contradictory** | Lines 55–76 publish 93.5% / 13.8% / 90.2% as results; lines 90–92 correctly `_pending_`. Tests **176**. |
| `BENCHMARK_REPORT.md` | **Accurate** | Explicitly NOT RUN. |
| `DEPLOYMENT_AUDIT.md` | **Mostly stale** | Migration heading updated to 8 files; tests still **139/139** (lines 185, 410). |
| `PREVIEW.md` | **Stale** | Historical per-phase counts (25/8/30/16/20/15); Total Tests **139**. Migration list starts at `0001_profiles…` (good) — confirm `0008` is listed. |
| `DEMO_SCRIPT.md` | **Accurate** | 183 tests; warns against invented numbers. |
| `scripts/benchmark/README.md` | **Stale paths** | Writes `../../benchmarks/datasets/afriswitch_care_*.json` — that tree is not in git. Do not present scores as measured. |
| `AGENTS.md` | **Accurate** | Agent operating notes. |
| `TYPE_AUDIT_REPORT.md` | **Accurate** | 22 files / 183 tests — current ground truth for counts. |
| `TERMINAL_ACTIVITY_REPORT.md` | **Process** | Session log; not a source of truth. |
| `VIDEO_RECORDING_CHECKLIST.md` | **Process** | Checklist only. |
| `MARKDOWN_VALIDATION_REPORT.md` | **This file** | Replaces the 2026-09-21 summary with per-file verdicts. |
| `.github/copilot-instructions.md` + `instructions/*.md` | **Accurate** | Tooling notes, not product claims. |

---

## Drift classes (still open)

1. **Invented benchmark numbers** in `CHALLENGE_SUBMISSION.md` (93.5 / 13.8 / 90.2) while JSON is `not_run`.
2. **Test-count rot:** 139 vs 176 vs 183 across README, challenge docs, implementation docs, PREVIEW, DEPLOYMENT_AUDIT.
3. **React Flow:** documented as a workspace product; code is Zod + tests only. Status file already records this — architecture/spec docs still read as if a canvas exists.
4. **Env drift:** `SAHARA_MODEL_ID`, `OPENROUTER_*` documented, not loaded by `src/lib/env.ts`.
5. **Secrets:** `.gitignore` now covers `supabase/.temp/`; incident not closed until keys are rotated in the dashboard.

---

## Recommended order of work

1. Rotate credentials listed in `SECURITY_INCIDENT.md`; keep incident status honest until done.
2. Strip measured-looking tables from `CHALLENGE_SUBMISSION.md` (use `_pending_` like README / `PAL_BENCHMARK.md`).
3. Normalize **183 tests / 22 files** in README, PREVIEW, DEPLOYMENT_AUDIT, CHALLENGE_*, and `*_IMPLEMENTATION.md` files that still say 139 or 176.
4. Point `PAL_EXECUTION_PLAN.md` and `scripts/benchmark/README.md` at paths that exist (or add empty `benchmarks/` with a README, not fake JSON).
5. Either parse `OPENROUTER_*` / drop `SAHARA_MODEL_ID` from `.env.example`, or document them as unused.
6. Do not add a React Flow UI until explicitly tasked — schema is enough.
