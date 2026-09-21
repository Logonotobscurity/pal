# PAL Preview Guide

**Version:** 2.0  
**Status:** Phase 3 Complete — Full Pipeline Operational  
**Date:** September 15, 2026  
**Server:** Running at http://localhost:3000

---

## Current Implementation Status

### ✅ Phase 1: Voice Ingestion Pipeline (COMPLETE)
- Microphone → PCM16 audio → Sahara streaming → SpeechEvent → Database
- Server-side provider authentication (browser never gets credentials)
- Full provenance chain with code-switching metadata
- 25 comprehensive tests — all passing

### ✅ Phase 2: Semantic Agent (COMPLETE)
- SpeechEvent → MeaningState transformation using OpenAI LLM
- Intent extraction, entity extraction, constraint detection
- Ambiguity detection and confidence scoring
- No execution authority (read-only as required by §19)
- 8 comprehensive tests — all passing

### ✅ Phase 3: Integration (COMPLETE)

#### ✅ Task 3.1: Workflow Agent
- MeaningState → ActionPlan with validated WorkflowIR
- Capability registry with 7 capabilities
- Deterministic workflow validation
- 30 comprehensive tests — all passing

#### ✅ Task 3.2: Policy Engine
- ActionPlan → ActionProposal with deterministic policy enforcement
- Critical field blocking (§28)
- Policy matrix (§27): READ/DRAFT auto-approved, EXTERNAL_WRITE/FINANCIAL require approval
- Optimistic locking for version-aware approvals
- 16 comprehensive tests — all passing

#### ✅ Task 3.3: Approval UI
- Approval dashboard displaying pending proposals
- Proposal detail pages with full provenance chain
- Approve/reject actions with rejection dialog
- Real-time updates via polling (5-second interval)
- Exact payload display (§29 requirement)

#### ✅ Task 3.4: Execution Service
- Approved proposal → safe execution with idempotency
- Mock capability executors for all 7 capabilities
- SHA256-based deterministic idempotency keys
- External reference tracking
- 20 comprehensive tests — all passing

#### ✅ Task 3.5: Verification Agent
- Execution → verification of external effects
- Never falsely reports success (§25 requirement)
- Expected vs actual outcome tracking
- 15 comprehensive tests — all passing

---

## Test Status

```
Total Tests: 139
Status: ALL PASSING ✅
Typecheck: CLEAN ✅
Lint: CLEAN ✅
```

---

## Preview the Application

### 1. Landing Page (http://localhost:3000)

**Current Features:**
- Status indicator: "Phase 3 Complete: Full pipeline operational" (green dot)
- Three feature cards:
  - **Approvals** (clickable) → `/approvals` — Review pending actions
  - **Voice Command** (coming soon) — Backend ready, UI not yet connected
  - **Activity Feed** (coming soon) — Execution history
- Complete pipeline visualization showing all 8 stages with green badges:
  - Voice → Speech → Meaning → Plan → Policy → Approval → Execution → Verification
- Sign in link → `/login`

**Visual Style:**
- Dark theme with neutral colors
- Clean, modern design using Tailwind CSS
- Responsive layout
- Hover effects on interactive elements

---

### 2. Approvals Dashboard (http://localhost:3000/approvals)

**Current Features:**
- List of pending action proposals requiring approval
- Filter tabs: Pending | Approved | Rejected | All
- Each proposal card shows:
  - Action type and description
  - Risk classification badge (READ/DRAFT/EXTERNAL_WRITE/FINANCIAL/DESTRUCTIVE)
  - Policy decision (auto-approved vs requires approval)
  - Timestamp
  - View details button
- Real-time polling for new proposals (5-second interval)
- Empty state when no proposals exist

**Data Required:**
To see proposals in action, you need to:
1. Create a voice session → generates SpeechEvent
2. Run semantic analysis → generates MeaningState
3. Generate workflow → generates ActionPlan
4. Run policy engine → generates ActionProposal

Currently, no proposals exist, so you'll see the empty state.

---

### 3. Proposal Detail Page (http://localhost:3000/approvals/[id])

**Current Features:**
- Full proposal details:
  - Action type and exact payload
  - Risk classification
  - Policy decision rationale
  - Evidence chain (provenance)
  - Approval history
- Action buttons:
  - Approve (with optimistic locking)
  - Reject (with required reason dialog)
  - Edit (placeholder for future workflow integration)
- Version-aware approval (rejects stale approvals if proposal changed)
- Back to approvals list link

**Security:**
- Version checking prevents approving outdated proposals
- Rejection requires explicit reason
- Shows exact payload (§29 requirement)

---

### 4. Authentication Pages

**Login Page** (http://localhost:3000/login)
- Email/password login form
- Supabase Auth integration
- Link to registration page

**Register Page** (http://localhost:3000/register)
- New user registration form
- Link back to login

---

## Environment Setup

To fully preview the application with live data, you need to configure environment variables:

### Required Configuration

Copy `.env.example` to `.env.local` and fill in these values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Sahara Voice Provider
SAHARA_API_SECRET=<your-sahara-secret>
SAHARA_WS_ENDPOINT=wss://api.sahara.ai/v1/stream

# OpenAI LLM Provider
OPENAI_API_KEY=<your-openai-key>
OPENAI_MODEL=gpt-4o-mini
```

### Without Configuration
The app will run, but:
- Authentication will fail (no Supabase connection)
- Voice pipeline cannot connect to Sahara
- Semantic agent cannot analyze speech
- No database persistence

---

## API Endpoints Implemented

All endpoints follow REST conventions and enforce workspace tenancy with RLS:

### Voice Pipeline
- `POST /api/voice/sessions` — Create voice session
- `POST /api/voice/audio` — Stream audio chunks
- `POST /api/voice/commit` — Commit final transcript

### Semantic Analysis
- `POST /api/semantic/analyze` — Analyze SpeechEvent → MeaningState

### Workflow Generation
- `POST /api/workflow/generate` — Generate ActionPlan from MeaningState

### Proposals
- `GET /api/proposals` — List all proposals (filtered by workspace)
- `GET /api/proposals/[id]` — Get proposal details
- `POST /api/proposals/[id]/approve` — Approve proposal
- `POST /api/proposals/[id]/reject` — Reject proposal with reason
- `PUT /api/proposals/[id]/edit` — Edit proposal (placeholder)

### Executions
- `POST /api/executions/[proposalId]` — Execute approved proposal
- `GET /api/executions/[proposalId]` — Get execution status

### Verifications
- `POST /api/verifications/[executionId]` — Verify execution outcome
- `GET /api/verifications/[executionId]` — Get verification result

### User
- `GET /api/me` — Get current user profile

---

## Database Schema

All tables implemented with workspace tenancy and RLS:

### Core Domain Tables
1. `voice_sessions` — Voice interaction sessions
2. `speech_events` — Transcribed speech with code-switching metadata
3. `meaning_states` — Structured semantic interpretation
4. `action_plans` — Validated workflows with WorkflowIR
5. `action_proposals` — Proposals awaiting approval
6. `approval_decisions` — Approval/rejection records
7. `execution_attempts` — External API execution tracking
8. `verification_results` — Execution outcome verification

### Supporting Tables
- `profiles` — User profiles
- `workspaces` — Workspace definitions
- `workspace_members` — User-workspace relationships

All migrations are in `supabase/migrations/`:
- `0001_profiles_workspaces_rls.sql` — Profiles, workspaces, RLS
- `0002_voice_ingestion.sql` — Voice pipeline tables
- `0003_meaning_state.sql` — Semantic agent tables
- `0004_action_plans.sql` — Workflow agent tables
- `0005_action_proposals.sql` — Policy engine tables
- `0006_execution_attempts.sql` — Execution service tables
- `0007_verification_results.sql` — Verification agent tables

---

## Testing the Full Pipeline (Manual)

To test the complete Voice → Action → Approval → Execution flow:

### 1. Create a Voice Session
```bash
curl -X POST http://localhost:3000/api/voice/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"workspaceId": "<workspace-id>"}'
```

### 2. Stream Audio (requires PCM16 encoding)
See `src/lib/audio/pcm16-encoder.ts` for browser implementation

### 3. Commit Transcript
```bash
curl -X POST http://localhost:3000/api/voice/commit \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "<session-id>"}'
```

### 4. Analyze Semantics
```bash
curl -X POST http://localhost:3000/api/semantic/analyze \
  -H "Content-Type: application/json" \
  -d '{"speechEventId": "<speech-event-id>"}'
```

### 5. Generate Workflow
```bash
curl -X POST http://localhost:3000/api/workflow/generate \
  -H "Content-Type: application/json" \
  -d '{"meaningStateId": "<meaning-state-id>"}'
```

### 6. View Proposal in UI
Navigate to http://localhost:3000/approvals — the proposal will appear in the list

### 7. Approve via UI
Click "View Details" → "Approve"

### 8. Execute
```bash
curl -X POST http://localhost:3000/api/executions/<proposal-id> \
  -H "Content-Type: application/json"
```

### 9. Verify
```bash
curl -X POST http://localhost:3000/api/verifications/<execution-id> \
  -H "Content-Type: application/json"
```

---

## Architecture Compliance

This implementation strictly follows `PAL_ARCHITECTURE.md`:

### ✅ Core Principles
- §2: No AI model directly executes external side effects
- §19: Semantic Agent has no execution authority
- §25: Verification never falsely reports success
- §27: Policy matrix enforced (READ/DRAFT auto, WRITE/FINANCIAL approval)
- §28: Critical field blocking implemented
- §29: Approval shows exact payload
- §33: Idempotency with deterministic keys (SHA256)
- §41-43: Workspace tenancy with RLS on all tables

### ✅ Domain Model
All canonical objects implemented:
- SpeechEvent (§11)
- MeaningState (§12)
- ActionPlan (§14)
- ActionProposal (§15)
- ExecutionAttempt (§16)
- EvidenceRef (§17)

### ✅ Agent Architecture (§18)
- Semantic Agent (§19)
- Workflow Agent (§20)
- Verification Agent (§25)
- Policy Engine (§26) — deterministic, not an LLM

---

## Known Limitations (MVP Scope)

### Not Yet Implemented
1. **Voice UI** — Backend ready, frontend microphone integration pending
2. **Realtime UI Updates** — Currently using polling; Supabase Realtime not yet integrated
3. **Research Agent** — Phase 4 (documentation, web search, evidence chains)
4. **Activity Feed** — Audit trail UI pending
5. **Clarification Agent** — Ambiguity resolution UI pending
6. **Memory System** — Working memory, workspace memory, vector memory
7. **Benchmark Dashboard** — PAL_BENCHMARK evaluation UI
8. **Production Executors** — Currently using mock executors; real integrations pending

### Intentional MVP Constraints
- DESTRUCTIVE actions blocked (cannot be automated)
- Simple verification logic (no complex outcome validation)
- Mock capability executors (no real external API calls)
- Polling instead of WebSocket for UI updates
- No scheduled execution (approval → immediate execution only)

---

## Next Steps (Phase 4)

From `PAL_EXECUTION_PLAN.md`:

1. **Task 4.1**: Run PAL_BENCHMARK methodology
2. **Task 4.2**: Production WebSocket deployment strategy
3. **Task 4.3**: Supabase Realtime integration for live transcripts
4. **Task 4.4**: Audio quality monitoring and diagnostics

---

## Documentation References

### Implementation Summaries
- `VOICE_INGESTION_IMPLEMENTATION.md` — Phase 1 details
- `SEMANTIC_AGENT_IMPLEMENTATION.md` — Phase 2 details
- `WORKFLOW_AGENT_IMPLEMENTATION.md` — Task 3.1 details
- `POLICY_ENGINE_IMPLEMENTATION.md` — Task 3.2 details
- `APPROVAL_UI_IMPLEMENTATION.md` — Task 3.3 details
- `EXECUTION_SERVICE_IMPLEMENTATION.md` — Task 3.4 details
- `VERIFICATION_AGENT_IMPLEMENTATION.md` — Task 3.5 details

### Architecture
- `docs/PAL_ARCHITECTURE.md` — Source of truth for design
- `docs/PAL_DOMAIN_MODEL.md` — Schemas, state machines, invariants
- `docs/PAL_EXECUTION_PLAN.md` — Current phase and task breakdown
- `docs/PAL_SECURITY.md` — Security rules and constraints
- `docs/PAL_BENCHMARK.md` — Evaluation methodology

---

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Fill in your Supabase, Sahara, and OpenAI credentials
   ```

3. **Run database migrations**
   ```bash
   # Requires Supabase CLI
   npx supabase db push
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   ```
   http://localhost:3000
   ```

6. **Run tests**
   ```bash
   npm test
   ```

7. **Type check**
   ```bash
   npm run typecheck
   ```

8. **Lint**
   ```bash
   npm run lint
   ```

---

## Support

For questions about the architecture, see `docs/PAL_ARCHITECTURE.md`.

For implementation details, see the phase-specific implementation documents.

For current status, see `docs/PAL_EXECUTION_PLAN.md`.
