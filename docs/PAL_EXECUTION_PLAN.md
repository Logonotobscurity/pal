# PAL Execution Plan

> **Status: PLACEHOLDER.** Implementation phases, each broken into issue-sized tasks. Agents: take one task, complete it fully, update this file.

## Phase 0 — Foundations

- [x] Task 0.1: Repository setup, tooling, CI scaffold (Complete)

## Phase 1 — Voice Ingestion Pipeline

- [x] Task 1.1: Voice ingestion pipeline (Complete)
  - **Goal**: Implement microphone → PCM16 audio → Sahara streaming → SpeechEvent → persisted session state
  - **Scope**: 
    - Database: `supabase/migrations/0002_voice_ingestion.sql`
    - Providers: `src/providers/sahara-websocket-adapter.ts`
    - Services: `src/services/voice/db.ts`
    - API Routes: `src/app/api/voice/{sessions,audio,commit}/route.ts`
    - Audio Utils: `src/lib/audio/pcm16-encoder.ts`
    - Tests: `tests/unit/voice-ingestion.test.ts`
    - Documentation: `docs/VOICE_INGESTION_GUIDE.md`
  - **Acceptance criteria**:
    - [x] PCM16 encoding (16kHz, mono, 16-bit)
    - [x] Browser sends audio to server API (no provider credentials exposed)
    - [x] Server maintains WebSocket connection to Sahara
    - [x] Partial transcripts received and can update UI
    - [x] Final transcript committed and persists as SpeechEvent
    - [x] SpeechEvent contains full provenance chain
    - [x] Code-switching metadata captured
    - [x] Session metadata persisted with workspace tenancy
    - [x] Error handling (connection, auth, quota, format, timeout)
    - [x] Tests validate protocol parsing and end-to-end pipeline
    - [x] Integration test with mocked Sahara provider
  - **Depends on**: Task 0.1
  - **Refs**: PAL_ARCHITECTURE.md §11, §35–§37, §40–§43; PAL_DOMAIN_MODEL.md SpeechEvent

## Phase 2 — Semantic Agent

- [x] Task 2.1: Semantic agent (SpeechEvent → MeaningState) (Complete)
  - **Goal**: Convert SpeechEvent into structured MeaningState with intent, entities, constraints
  - **Scope**: 
    - Database: `supabase/migrations/0003_meaning_state.sql`
    - Providers: `src/providers/openai-llm.ts`
    - Services: `src/services/semantic/agent.ts`, `src/services/semantic/db.ts`
    - API Routes: `src/app/api/semantic/analyze/route.ts`
    - Tests: `tests/unit/semantic-agent.test.ts`
  - **Acceptance criteria**:
    - [x] Parse intent from transcript using LLM
    - [x] Extract entities (names, amounts, dates, times)
    - [x] Identify constraints and temporal relations
    - [x] Detect ambiguities requiring clarification
    - [x] Generate confidence scores
    - [x] Preserve provenance chain
    - [x] Handle code-switched input
    - [x] Flag insufficient or conflicting context
    - [x] No execution authority (read-only agent)
    - [x] Tests validate semantic extraction
  - **Depends on**: Task 1.1
  - **Refs**: PAL_ARCHITECTURE.md §12, §19; PAL_DOMAIN_MODEL.md MeaningState

## Phase 3 — Integration

- [x] Task 3.1: Workflow agent (MeaningState → ActionPlan) (Complete)
  - **Goal**: Convert MeaningState into validated ActionPlan with WorkflowIR
  - **Scope**:
    - Capability Registry: `src/core/capabilities/registry.ts`
    - Schemas: `src/core/schemas/action-plan.ts`
    - Validation: `src/core/workflow/validator.ts`
    - Providers: `src/providers/openai-workflow.ts`
    - Services: `src/services/workflow/agent.ts`, `src/services/workflow/db.ts`
    - Database: `supabase/migrations/0004_action_plans.sql`
    - API Routes: `src/app/api/workflow/generate/route.ts`
    - Tests: `tests/unit/workflow-agent.test.ts`
  - **Acceptance criteria**:
    - [x] Capability registry with 7 capabilities (read/draft/write/financial operations)
    - [x] Constrained WorkflowIR with only allowed node types (trigger, agent, condition, action, approval, fallback)
    - [x] Workflow validator rejects unknown capabilities, malformed edges, cycles, missing approvals
    - [x] OpenAI LLM provider generates structured workflows
    - [x] Workflow agent converts MeaningState to ActionPlan
    - [x] No execution authority (agent only generates plans)
    - [x] Database persistence with workspace tenancy and RLS
    - [x] API route for workflow generation
    - [x] 30 comprehensive tests covering registry, schema, validation, and workflow generation
    - [x] All 126 tests passing, typecheck clean, lint clean
  - **Depends on**: Task 2.1
  - **Refs**: PAL_ARCHITECTURE.md §20-21, §31; PAL_DOMAIN_MODEL.md ActionPlan, WorkflowIR

- [x] Task 3.2: Policy engine (ActionPlan → ActionProposal) (Complete)
  - **Goal**: Implement deterministic policy engine with critical field blocking and approval requirements
  - **Scope**:
    - Schemas: `src/core/schemas/action-proposal.ts`, `src/core/schemas/policy-engine.ts`
    - Services: `src/services/policy/engine.ts`, `src/services/policy/db.ts`
    - Database: `supabase/migrations/0005_action_proposals.sql`
    - API Routes: `src/app/api/proposals/route.ts`, `src/app/api/proposals/[id]/route.ts`, `src/app/api/proposals/[id]/{approve,reject,edit}/route.ts`
    - Tests: `tests/unit/policy-engine.test.ts`
  - **Acceptance criteria**:
    - [x] Policy matrix enforcement (READ/DRAFT auto-approved, EXTERNAL_WRITE/FINANCIAL require approval, DESTRUCTIVE blocked in MVP)
    - [x] Critical field blocking for write/financial operations with confidence below threshold (0.85)
    - [x] Read operations can proceed even with low confidence critical fields
    - [x] Context sufficiency validation (insufficient/conflicting context blocks execution)
    - [x] ActionProposal generation with risk classification
    - [x] Optimistic locking for version-aware approvals (reject stale approvals)
    - [x] Database persistence with workspace tenancy and RLS
    - [x] API routes for proposal listing, approval, rejection, editing
    - [x] 16 comprehensive tests covering policy matrix, critical fields, approval flow
    - [x] All 139 tests passing, typecheck clean, lint clean
    - [x] CRITICAL TEST: No external-write capability can bypass approval
  - **Depends on**: Task 3.1
  - **Refs**: PAL_ARCHITECTURE.md §26-29; PAL_DOMAIN_MODEL.md ActionProposal, PolicyDecision

- [x] Task 3.3: Approval UI and flow (Complete)
  - **Goal**: Implement approval dashboard and proposal viewing UI with real-time updates
  - **Scope**:
    - Pages: `src/app/approvals/page.tsx`, `src/app/approvals/[id]/page.tsx`, `src/app/approvals/[id]/edit/page.tsx`
    - Components: `src/components/approvals/approvals-list.tsx`, `src/components/approvals/proposal-card.tsx`, `src/components/approvals/proposal-detail.tsx`
    - Lib: `src/lib/supabase/server.ts`
    - Schema updates: Added `version` and `updatedAt` to ActionProposal schema
  - **Acceptance criteria**:
    - [x] Approvals dashboard page displaying pending proposals
    - [x] Proposal filtering (pending, approved, rejected, all)
    - [x] Proposal cards showing action details, risk class, policy decision
    - [x] Approve/reject actions with optimistic locking (version checking)
    - [x] Rejection dialog with required reason
    - [x] Proposal detail page with full provenance chain
    - [x] Evidence references display
    - [x] Approval history display
    - [x] Real-time updates via polling (5-second interval)
    - [x] Exact payload display (PAL_ARCHITECTURE.md §29 requirement)
    - [x] Edit page placeholder (requires future workflow integration)
    - [x] Responsive UI with Tailwind CSS matching existing design
    - [x] All 139 tests passing, typecheck clean, lint clean
  - **Depends on**: Task 3.2
  - **Refs**: PAL_ARCHITECTURE.md §29, §59; PAL_DOMAIN_MODEL.md ActionProposal, ApprovalDecision

- [x] Task 3.4: Execution service (Complete)
  - **Goal**: Implement execution service that safely executes approved proposals
  - **Scope**:
    - Database: `supabase/migrations/0006_execution_attempts.sql`
    - Services: `src/services/execution/service.ts`, `src/services/execution/db.ts`
    - Executors: `src/services/execution/executors/mock.ts` (MVP mock implementations)
    - Utils: `src/lib/utils/idempotency.ts` (SHA256-based deterministic keys)
    - API Routes: `src/app/api/executions/[proposalId]/route.ts`
    - Tests: `tests/unit/execution-service.test.ts`
  - **Acceptance criteria**:
    - [x] Execution service accepts only approved proposals
    - [x] Capability registry lookup before execution
    - [x] Deterministic idempotency key generation (SHA256 of workspaceId + proposalId + version)
    - [x] Idempotency check prevents duplicate execution
    - [x] Mock capability executors for all 7 registered capabilities
    - [x] ExecutionAttempt persistence with full lifecycle tracking
    - [x] Database migration with workspace tenancy and RLS
    - [x] API endpoint for triggering execution
    - [x] Response capture and error handling
    - [x] External reference tracking
    - [x] 20 comprehensive tests covering idempotency, validation, execution flow
    - [x] Typecheck clean, lint clean
  - **Depends on**: Task 3.3
  - **Refs**: PAL_ARCHITECTURE.md §30-34; PAL_DOMAIN_MODEL.md ExecutionAttempt

- [x] Task 3.5: Verification agent (Complete)
  - **Goal**: Implement verification agent that confirms external effects match expectations
  - **Scope**:
    - Database: `supabase/migrations/0007_verification_results.sql`
    - Services: `src/services/verification/agent.ts`, `src/services/verification/db.ts`
    - API Routes: `src/app/api/verifications/[executionId]/route.ts`
    - Tests: `tests/unit/verification-agent.test.ts`
  - **Acceptance criteria**:
    - [x] Verification agent checks execution outcomes
    - [x] Simple MVP logic: succeeded → verified, failed → failed, incomplete → unverified
    - [x] Captures expected vs actual outcomes
    - [x] External reference tracking
    - [x] VerificationResult persistence with workspace tenancy
    - [x] Database migration with RLS
    - [x] API endpoint for verification
    - [x] 15 comprehensive tests covering success, failure, and incomplete cases
    - [x] Never falsely reports success (§25 requirement)
    - [x] Typecheck clean, lint clean
  - **Depends on**: Task 3.4
  - **Refs**: PAL_ARCHITECTURE.md §25; PAL_DOMAIN_MODEL.md VerificationResult

## Phase 4 — Benchmark & Hardening (Sahara Challenge)

**Challenge**: [Sahara CodeSwitch Africa Challenge](https://www.intron.io/sahara-v2-5/sahara-codeswitch-africa/)  
**Target**: Full end-to-end evaluation on AfriSwitch + AfriSwitchCare datasets

- [ ] Task 4.1: Dataset integration and benchmark infrastructure
  - **Goal**: Load AfriSwitch/AfriSwitchCare datasets and run PAL pipeline evaluation
  - **Scope**:
    - Scripts: `benchmarks/load_datasets.py`, `benchmarks/evaluate_pipeline.py`
    - Adapters: `benchmarks/adapters/sahara.ts`, `whisper.ts`, `assemblyai.ts`
    - Reports: `benchmarks/reports/comparison.md`
    - Docs: `docs/PAL_BENCHMARK.md` (expanded ✓)
  - **Acceptance criteria**:
    - [ ] Load AfriSwitch dataset (gated HF access)
    - [ ] Load AfriSwitchCare dataset (gated HF access)
    - [ ] Speaker-disjoint train/test split validation
    - [ ] Run Sahara v2.5 through full PAL pipeline
    - [ ] Run ≥2 comparison models (Whisper, AssemblyAI)
    - [ ] Measure 5-tier metrics (transcription, extraction, semantic, action, safety)
    - [ ] Generate comparison report
    - [ ] Document results in `benchmarks/runs/`
  - **Depends on**: Phase 3 complete
  - **Refs**: PAL_BENCHMARK.md, Challenge requirements

- [ ] Task 4.2: Challenge submission materials
  - **Goal**: Prepare all required deliverables for Sahara Challenge
  - **Scope**:
    - Video: Demo of voice → action → approval flow
    - Report: Benchmark comparison (Sahara vs ≥2 others)
    - Statement: Responsible AI considerations
    - Docs: README challenge section
  - **Acceptance criteria**:
    - [ ] Working prototype video (< 5 minutes)
    - [ ] Benchmark results table (all 5 tiers)
    - [ ] Responsible AI statement (ethics, limitations, intended use)
    - [ ] Problem/solution description
    - [ ] Public GitHub repository with docs
    - [ ] Submission via challenge portal
  - **Depends on**: Task 4.1
  - **Refs**: https://www.intron.io/sahara-v2-5/sahara-codeswitch-africa/

- [ ] Task 4.3: Production WebSocket deployment strategy
  - **Goal**: Determine deployment architecture for Sahara WebSocket in production
  - **Scope**: Infrastructure planning, scaling considerations, fallback strategies
  - **Depends on**: Challenge results
  - **Refs**: PAL_ARCHITECTURE.md §8, §37

- [ ] Task 4.4: Audio quality monitoring and diagnostics
  - **Goal**: Real-time monitoring of transcription quality, code-switch detection
  - **Scope**: Metrics dashboard, alerting, regression detection
  - **Depends on**: Task 4.1
  - **Refs**: PAL_BENCHMARK.md §Regression Detection

## Task template (GitHub-issue style)

```markdown
## Task <phase>.<n>: <title>
**Goal:** one-sentence outcome
**Scope:** files/components touched
**Acceptance criteria:**
- [ ] ...
**Depends on:** Task x.y
**Refs:** PAL_ARCHITECTURE.md §, PAL_DOMAIN_MODEL.md §
```
