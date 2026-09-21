# Markdown Implementation Validation Report

**Date:** 2026-09-21
**Scope:** all 35 markdown files in the repository (13,608 lines)
**Method:** every file path reference (266) checked for existence; status
claims checked against source tree, `package.json`, migrations, schemas, and
`src/data/benchmark-results.json`.

## Summary

| Verdict | Files |
| --- | --- |
| Accurate — matches implementation | 24 |
| Stale / inaccurate — needs fixing | 7 |
| Intentionally non-implementation (process/plan) | 4 |

Four classes of drift were found: **unpublished benchmark numbers presented as
measured results**, **a tracked file containing credentials**, **stale counts
and paths**, and **a stale "all complete" status**.

---

## Critical

### 1. Credentials committed in `supabase/.temp/`

`git ls-files supabase/.temp/` returns 9 tracked files. `supabase/.temp/pooler-url`
contains a full Postgres connection string **with userinfo** (`://user:pass@`).
`supabase/.temp/project-ref` and `linked-project.json` expose the project ref.

These are CLI scratch files that should never be tracked, and there is no
`.gitignore` rule for them. This is the same class of exposure as the
`SECURITY_INCIDENT.md` incident, reopened through a different file.

**Action:** add `supabase/.temp/` to `.gitignore`, `git rm --cached` the
directory, and confirm whether the pooler credential is live before assuming it
is throwaway.

### 2. `SECURITY_INCIDENT.md` says remediation is in progress

Marked **Status: REMEDIATION IN PROGRESS**, with rotation checkboxes unchecked
(lines 167–168). Given finding 1, this status appears accurate and the incident
should not be treated as closed.

---

## Benchmark numbers presented as results

`src/data/benchmark-results.json` — the canonical data source — declares
`status: "not_run"` and states that earlier figures were **planning targets**.
`BENCHMARK_REPORT.md`, `docs/PAL_BENCHMARK.md`, `SUBMISSION.md`, and
`DEMO_SCRIPT.md` all agree the run has not happened. These files contradict
that:

| File | Problem |
| --- | --- |
| `README.md` | Lines 52–53 say no completed evaluation is published; lines 57–70 then publish a 5-tier table with scores (93.5%, 92.1%, 87.8%, 93.4%, 100%, **90.2%**) marked ✅ and **"Production Ready"**. Direct self-contradiction. |
| `CHALLENGE_SUBMISSION.md` | Lines 55–57 assert measured WER 13.8% vs 15.7% with a "+1.9%" advantage. Lines 75–79 correctly say no completed run exists and show `_pending_`. |
| `scripts/benchmark/README.md` | Publishes "Overall PAL Score: 90.2%", WER 13.8% ✓, Code-Switch 93.5% ✓ as results. |
| `CHALLENGE_STATUS.md` | "Expected Benchmark Results" — labelled hypotheses, so defensible, but the numbers match the invented ones exactly. |

The scores are internally consistent across files, which suggests they were
copied from a planning document rather than each other, but none has a stored
run artifact. `DEMO_SCRIPT.md` line 232 says **"do not show invented numbers"** —
the repo already knows these are not measured.

**Action:** either produce a reproducible run with stored artifacts, or replace
the tables in `README.md` and `scripts/benchmark/README.md` with the pending
shape already used in `CHALLENGE_SUBMISSION.md`.

---

## Stale content

| File | Claim | Reality |
| --- | --- | --- |
| `docs/PAL_IMPLEMENTATION_STATUS.md` | Benchmark runner listed under "Not yet implemented" | Runner exists: `scripts/benchmark/` with `evaluate-pipeline.ts`, `load-dataset.py`, `metrics/`, and 5 npm scripts |
| `docs/PAL_IMPLEMENTATION_STATUS.md` | "mic UI not fully wired" | Correct — no `MediaRecorder`/`getUserMedia` anywhere in `src/` |
| `DEPLOYMENT_AUDIT.md` | "Migrations Applied (7/7)" | 8 migration files on disk (`0008_function_execution_hardening.sql` added) |
| `PREVIEW.md` | Migrations `0001_initial_auth.sql` … | Actual first migration is `0001_profiles_workspaces_rls.sql`; list omits `0008` |
| `PREVIEW.md` | "25 / 8 / 30 / 16 / 20 / 15 comprehensive tests, all passing" | Suite is 183 tests in 22 files; per-phase counts are historical and unverifiable |
| `DEMO_SCRIPT.md` | "176 tests passing" | 183 tests pass |
| `docs/PAL_EXECUTION_PLAN.md` | `benchmarks/load_datasets.py`, `evaluate_pipeline.py`, `adapters/` | No top-level `benchmarks/` directory; actual scripts are `scripts/benchmark/*` |
| `scripts/benchmark/README.md` | Datasets at `benchmarks/datasets/afriswitch_care_*.json` | No `benchmarks/` tree exists; no dataset file present |
| `docs/PAL_IMPLEMENTATION_STATUS.md` / `.env.example` | `SAHARA_MODEL_ID` documented as config | No `process.env.SAHARA_MODEL_ID` read anywhere in `src/` |

---

## Accurate

Verified against code, not just self-consistent:

| File | Evidence |
| --- | --- |
| `docs/PAL_DOMAIN_MODEL.md` | Every status enum matches the Zod schema exactly: proposal lifecycle, approval state, execution (`queued/running/succeeded/failed/cancelled`), verification (`verified/failed/unverified`), benchmark, replay. |
| `docs/PAL_EXECUTION_PLAN.md` (phases 0–3) | Capability registry really has 7 capabilities; all 13 API routes exist as described. |
| `VOICE_INGESTION_IMPLEMENTATION.md` | All three voice routes and provider files exist. |
| `SEMANTIC_AGENT_IMPLEMENTATION.md` | `/api/semantic/analyze` + `services/semantic/*` exist. |
| `WORKFLOW_AGENT_IMPLEMENTATION.md` | `/api/workflow/generate` + `services/workflow/*` + validator exist. |
| `EXECUTION_SERVICE_IMPLEMENTATION.md` | Services exist; mock executor honestly described. |
| `VERIFICATION_AGENT_IMPLEMENTATION.md` | `/api/verifications/[executionId]` + service exist. |
| `POLICY_ENGINE_IMPLEMENTATION.md` | `services/policy/engine.ts` + `core/schemas/policy-engine.ts` exist. |
| `APPROVAL_UI_IMPLEMENTATION.md` | All 4 components + 3 approval pages exist. |
| `BENCHMARK_REPORT.md` | Correctly reports NOT RUN. |
| `docs/PAL_BENCHMARK.md` | Methodology only; comparison table uses `—` placeholders. |
| `PHASE_4_BENCHMARK_IMPLEMENTATION.md` | Honestly scoped as "infrastructure complete, integration pending". |
| `docs/PAL_AGENT_ASSISTANCE.md` | Verified this session; gate matches `ci.yml`. |
| `TYPE_AUDIT_REPORT.md` | Verified this session against the real suite. |
| `AGENTS.md`, `.github/*` | Accurate and consistent with the repo. |
| `docs/PAL_ARCHITECTURE.md` | Line 2078 `WER = 14%` is a counter-example of bad error reporting, not a result claim. |
| `docs/PAL_SECURITY.md` | Consistent with `.env.example` warnings. |

## Process / non-implementation documents

`VIDEO_RECORDING_CHECKLIST.md`, `DEMO_SCRIPT.md` (as a script),
`CHALLENGE_STATUS.md` (as a status log), `.kiro/specs/…/design.md` — these
describe intended process rather than shipped state. `DEMO_SCRIPT.md` is
notably honest, explicitly warning against quoting unmeasured numbers.

---

## Recommended order of work

1. **Rotate the pooler credential** and untrack `supabase/.temp/`.
2. Correct the benchmark tables in `README.md` and `scripts/benchmark/README.md`.
3. Fix the `DEPLOYMENT_AUDIT.md` migration count and `PREVIEW.md` migration list.
4. Update `docs/PAL_EXECUTION_PLAN.md` benchmark paths to `scripts/benchmark/`.
5. Update `docs/PAL_IMPLEMENTATION_STATUS.md`: move the benchmark runner out of
   "Not yet implemented"; record the test count as 183.
6. Refresh the test counts in `PREVIEW.md` and `DEMO_SCRIPT.md`.
