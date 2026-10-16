# PAL Architectural Handoff

**For coding agents working in this repository**  
**Version:** 1.1  
**Compiled:** September 2026  
**Status:** Locked operating contract + forward roadmap

This is the **power-boundary contract** for PAL. Domain schemas live in `docs/PAL_DOMAIN_MODEL.md`. The large target spec lives in `docs/PAL_ARCHITECTURE.md`. **What exists in the tree today** lives in `docs/PAL_IMPLEMENTATION_STATUS.md`. If those disagree with this file on *shipped* facts, trust the status file and the code.

Do not create a parallel layout. Extend the paths below.

---

## 0. Map to this repository (do not invent a second tree)

| Contract concept | Actual path |
| --- | --- |
| Policy engine (pure) | `src/services/policy/engine.ts` |
| Capability / risk registry | `src/core/capabilities/registry.ts` |
| Workflow IR validation | `src/core/workflow/validator.ts` |
| Domain Zod schemas | `src/core/schemas/*` |
| Semantic agent | `src/services/semantic/` |
| Workflow agent | `src/services/workflow/` |
| Execution service | `src/services/execution/service.ts` |
| Mock executors (today) | `src/services/execution/executors/mock.ts` |
| Verification | `src/services/verification/` |
| Voice ingestion | `src/services/voice/`, `src/providers/sahara*` |
| Env boundary | `src/lib/env.ts` |
| Approvals UI | `src/components/approvals/*`, `src/app/approvals` |
| Command (typed demo) | `src/app/command/page.tsx` |
| Evaluation / benchmark UI | `src/app/evaluation/` |
| API routes | `src/app/api/**/route.ts` |
| Tests | `tests/unit/**/*.test.ts` — **183 tests / 22 files** |
| Migrations | `supabase/migrations/0001` … `0008` |

**Not in this repo (do not add unless explicitly tasked):** LangGraph, MCP client, `src/lib/policy/`, `src/lib/mcp/`, React Flow canvas, live microphone (`getUserMedia` / `MediaRecorder`).

MCP, memory, chat autonomy, and LangGraph are **roadmap**. Execution today is mock-only. Policy today is already a deterministic service — do not relocate it to `src/lib/policy/` as a drive-by.

---

## 1. Project definition

**PAL** is a governed voice-to-action pipeline for safe, auditable, human-supervised automation inside a workspace.

It takes natural language (voice or typed command), turns it into structured meaning, generates a concrete action plan, runs that plan through a deterministic policy engine, and only then allows execution — with mandatory human approval for anything that writes externally or involves money. After execution it verifies the real-world outcome and never claims success unless the external effect actually happened.

### Core principle (non-negotiable)

> **AI should propose and plan.**  
> **Humans (and deterministic policy) must authorize.**  
> **Execution must be safe, idempotent, and verifiable.**

No AI model is ever given direct authority to cause external side effects. This is enforced architecturally.

### Shipped pipeline (backend + approvals UI)

1. Voice ingestion → `SpeechEvent`
2. Semantic agent → `MeaningState` (read-only)
3. Workflow agent → `ActionPlan`
4. Policy engine → `ActionProposal` (deterministic)
5. Approval UI → human gate
6. Execution service → approved actions only (**mock executors**)
7. Verification agent → never lies about success

Everything is multi-tenant (workspace-scoped with RLS).

### Explicitly future

- Real external integrations (MCP)
- Memory (working, workspace, vector)
- Clarification loops
- Research agent
- Live voice UI (mic)
- General autonomous agent
- Pure chat that still cannot bypass Policy + Approval
- React Flow workspace canvas (schema only today)

---

## 2. Universal rules (every stage)

1. **State must be durable and verifiable** — every stage writes a checkpointed, versioned artifact with provenance.
2. **Give AI reasoning power only where understanding or planning is needed.**
3. **Keep policy deterministic** — pure function. No LLM, no MCP, no network.
4. **Put the single strongest human gate at Approval.**
5. **Give real tools (via MCP, when they exist) only to the Execution layer.**
6. No stage may grant itself execution authority.
7. Workspace tenancy + RLS is non-negotiable.

---

## 3. Stage-by-stage power

### Voice ingestion

- **Allowed:** audio capture/streaming, STT with provenance, `SpeechEvent`
- **Forbidden:** semantic interpretation, planning, policy, MCP, HITL except auth
- **Required:** durable `SpeechEvent` with transcript + code-switch metadata

### Semantic agent

- **Allowed:** LLM understanding (intent, entities, constraints, ambiguity, confidence) → `MeaningState`
- **Forbidden:** execution, policy, MCP, final authority
- **Required:** read-only (§19), confidence + ambiguity scoring
- **Future:** may request clarification via a separate Clarification agent + HITL

### Workflow agent

- **Allowed:** `MeaningState` → `ActionPlan` (WorkflowIR), capability registry, plan validation
- **Forbidden:** execution, policy decisions, real MCP calls
- **Required:** deterministic WorkflowIR validation

### Policy engine (critical)

- **Allowed:** deterministic evaluation only, policy matrix (§27), critical-field blocking (§28), `ActionProposal`
- **Forbidden:** LLM, HITL, MCP, network, mutating payload, granting execution rights
- **Required:** pure function, optimistic locking, full rationale

### Approval (primary human gate)

- **Allowed:** HITL approve / reject / edit, exact payload (§29), provenance, version-aware approval, pause
- **Forbidden:** auto-execution, bypassing policy, silent critical-field changes
- **Required:** explicit human decision + durable resume

### Execution service

- **Allowed:** approved exact payload, idempotent execution (SHA256), external ref tracking; **future:** real systems via MCP only
- **Forbidden:** unapproved execution, payload mutation, new policy decisions, skipping verification
- **Required:** full logging; today: mock executors only

### Verification agent

- **Allowed:** expected vs actual, read-only confirmation, `VerificationResult`
- **Forbidden:** false success (§25), re-execution, overriding prior decisions
- **Required:** never falsely report success

### Summary matrix

| Stage | LLM | Deterministic | HITL | MCP / tools | Side effects | Must verify own output |
| --- | --- | --- | --- | --- | --- | --- |
| Voice ingestion | No | Yes | No | No | No | Yes |
| Semantic agent | Yes | Supporting | No* | No | No | Yes |
| Workflow agent | Limited | Yes | No | No | No | Yes |
| **Policy engine** | **No** | **Yes (only)** | **No** | **No** | **No** | Yes |
| **Approval** | No | Supporting | **Yes** | No | No | Yes |
| Execution | No | Yes | No | **Yes (future; mock today)** | **Yes after approval** | Yes |
| Verification | Limited | Yes | No | Read-only | No | **Core duty** |

\* Clarification HITL is a future separate stage.

---

## 4. How to enforce this in *this* codebase

### 4.1 Boundaries

1. Policy lives in `src/services/policy/` and must remain import-clean of LLM/MCP/network.
2. Only `src/services/execution/` may call external side-effecting adapters. When MCP lands, it is imported **only** here.
3. Semantic / workflow agents must not import execution adapters.
4. Before any external call, execution checks proposal is approved and version matches.
5. Policy rejects input that is not a validated `ActionPlan`.
6. Capability risk is static in `src/core/capabilities/registry.ts` — no live tool discovery.

### 4.2 CI / PR

- Run the gate in `docs/PAL_AGENT_ASSISTANCE.md` (`typecheck`, `lint`, `test`, `build`).
- Use the violation checklist (Section 8) in review.
- Add policy-purity tests (no network, no LLM) when touching the engine.
- Do not batch phases. One issue-sized task.

### 4.3 Definition of done for the *next* execution-hardening sprint

- [ ] Policy engine remains a pure function with critical-field scan and rationale
- [ ] Capability registry remains the only risk source for Policy
- [ ] Execution still refuses non-approved proposals
- [ ] Approval optimistic locking still holds
- [ ] **183 tests still pass** + any new purity tests
- [ ] Do **not** relocate modules to a `src/lib/policy` or `src/lib/mcp` tree unless a dedicated restructure task says so

Real MCP for 1–2 capabilities is a **separate, explicit task** — not a side effect of this handoff.

---

## 5. Path toward autonomy, chat, memory, tasks

**Current PAL is deliberately not autonomous.** Future phases still obey the core principle.

1. **Next (execution + memory foundation)** — replace mocks with real adapters (MCP or equivalent), working + workspace memory (durable, versioned), clarification when ambiguity is high.
2. **Then (research + tasks)** — read-only research, explicit Task objects that still flow Policy → Approval → Execution.
3. **Then (chat + controlled autonomy)** — chat UI that produces `MeaningState` / `ActionPlan` candidates. Write/financial still go through Policy + Approval. “Autonomous mode” is an explicit user-granted policy profile. Background automations are pre-approved or policy-auto-approved plans on a schedule.

### Framework note (roadmap, not current stack)

LangGraph (or a compatible durable state machine) is the **recommended orchestration** for future reasoning loops (clarification, research, multi-step tasks): explicit state, reducers, checkpoints, HITL interrupt.

**Do not add LangGraph in this repo unless tasked.** Do not use it for Policy, Approval, Execution, or Verification.

| Layer | Intelligence | Memory | Task / automation | Human gate |
| --- | --- | --- | --- | --- |
| Understanding | Semantic agent (LLM) | Working memory | — | Optional clarification |
| Planning | Workflow / research | Workspace memory | Creates Task | — |
| Authorization | Policy (deterministic) | — | — | Approval |
| Execution | Execution service | External refs | Runs Task | Already approved |
| Verification | Verification agent | Outcome history | Updates Task | — |
| Background automation | Scheduler + approved plan | — | Recurring Task | Policy auto-approve or prior human |

---

## 6. Deterministic policy (locked)

- Pure function only.
- Matrix: READ / DRAFT → auto-approved; EXTERNAL_WRITE / FINANCIAL → requires approval; DESTRUCTIVE → blocked.
- Critical field blocking (§28).
- Frozen exact payload + rationale + version bump.

---

## 7. MCP rules (locked, future)

- MCP only inside Execution.
- Policy uses the static capability risk registry only.
- No live tool discovery inside Policy or any reasoning agent.

---

## 8. Violation checklist (block the PR)

### Policy engine

- [ ] Any LLM call or embedding
- [ ] Any network / MCP call
- [ ] Non-deterministic logic
- [ ] Mutation of incoming payload
- [ ] Missing critical-field scan
- [ ] Missing rationale

### Approval

- [ ] Auto-approval of EXTERNAL_WRITE or FINANCIAL
- [ ] Missing optimistic locking
- [ ] Exact payload hidden or truncated
- [ ] Rejection without required reason

### Execution

- [ ] External call not going through the execution adapter boundary
- [ ] Execution of a non-approved proposal
- [ ] Missing idempotency key
- [ ] Payload changed after approval

### Architecture / future autonomy

- [ ] Any stage other than Execution causes side effects
- [ ] Semantic / Workflow / Research given execution authority
- [ ] Chat bypasses Policy or Approval for write actions
- [ ] Autonomous mode lacks an explicit policy profile
- [ ] Memory writes without version / provenance
- [ ] Verification reports false success
- [ ] Missing workspace RLS
- [ ] Version / checkpoint not incremented

---

## 9. Recommended implementation order

1. Keep Policy + registry hardened (already the baseline).
2. Real adapter (MCP or equivalent) for 1–2 capabilities in Execution — **explicit task**.
3. Durable approval resume across restart.
4. Violation checklist in PR template + import-boundary lint when MCP exists.
5. Memory schema + provenance-tracked read/write.
6. Clarification agent (HITL) on high ambiguity.
7. Research agent (read-only + tools).
8. Task / automation domain objects through the full pipeline.
9. Chat that produces candidates; never bypasses gates.
10. Controlled autonomous mode with a scoped policy profile.

Do **not** skip gates to look more “agentic.”

---

## 10. Bottom line

> Make state durable and verifiable everywhere.  
> Give AI reasoning power only where understanding or planning is needed.  
> Keep policy deterministic.  
> Put the single strongest human gate at Approval.  
> Give real tools only to the Execution layer.

Autonomy and chat **extend** the pipeline. They do not replace the gates.

Measure every code change against these rules **and** against `docs/PAL_IMPLEMENTATION_STATUS.md` so agents do not conflict with each other or with shipped code.
