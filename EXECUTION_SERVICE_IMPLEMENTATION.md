# PAL Execution Service Implementation Summary

**Phase**: 3.4 — Execution Service  
**Status**: ✅ Complete  
**Date**: 2026-09-15

## Overview

Implemented PAL's execution service that safely executes approved action proposals. The service is the **only component allowed to call external write APIs** (PAL_ARCHITECTURE.md §30). It implements deterministic idempotency, capability-based execution, and full audit trails.

## Architecture Reference

- **PAL_ARCHITECTURE.md**: §30 (Execution Service), §31 (Capability Registry), §32 (Tool Calling), §33 (Idempotency), §34 (Outbox Pattern)
- **PAL_DOMAIN_MODEL.md**: ExecutionAttempt, ExecutorResult
- **PAL_EXECUTION_PLAN.md**: Task 3.4

## Implementation

### 1. Execution Service (`src/services/execution/service.ts`)

**Core execution flow (§30):**

```
Approved Proposal
   ↓
Capability Registry lookup
   ↓
Credential lookup (placeholder)
   ↓
Idempotency check
   ↓
External API call
   ↓
Response capture
   ↓
Verification (future)
   ↓
Audit
```

**Key Features:**
- **Approval validation**: Only executes proposals with status="approved" and policyDecision.allowed=true
- **Capability lookup**: Validates action type against capability registry
- **Idempotency check**: Prevents duplicate execution using deterministic SHA256 keys
- **Lifecycle tracking**: Queued → Running → Succeeded/Failed
- **Error handling**: Captures error codes and messages for failed executions
- **Response capture**: Stores output payload and external references

**Security:**
- Server-only execution (never exposes execution logic to browser)
- Workspace-scoped with full RLS enforcement
- No credential exposure in logs or responses

### 2. Idempotency Keys (`src/lib/utils/idempotency.ts`)

**Implements §33: Deterministic idempotency protection**

```typescript
idempotencyKey = SHA256(workspaceId + proposalId + version)
```

**Why deterministic?**
- Same proposal + version always generates same key
- Prevents duplicate external execution (e.g., double-sending messages)
- Not random UUID - tied to specific proposal state
- Version changes produce new key (allows retry after edit)

**Key format:** 64-character hex string (SHA256 output)

**Implementation:** Uses Web Crypto API for browser/edge compatibility

### 3. Mock Capability Executors (`src/services/execution/executors/mock.ts`)

**MVP mock implementations for all 7 registered capabilities:**

1. **customer.lookup** (read) - Mock customer data retrieval
2. **invoice.status** (read) - Mock invoice status check
3. **invoice.list** (read) - Mock invoice list
4. **message.draft** (draft) - Mock message drafting
5. **message.send** (write) - Mock external message sending
6. **payment.record** (financial) - Mock payment recording
7. **task.create** (draft) - Mock task creation

**Executor response format:**
```typescript
{
  success: boolean
  externalReference?: string  // Provider-returned ID
  outputPayload: unknown      // Structured response
  errorCode?: string
  errorMessage?: string
}
```

**Input validation:** Each executor validates input against capability's Zod schema

**Future:** Replace with real integrations (WhatsApp, SMS, email, payment gateways, CRM systems)

### 4. Execution Database Service (`src/services/execution/db.ts`)

**CRUD operations for execution_attempts table:**

- `createAttempt()` - Create new execution record
- `getAttemptByIdempotencyKey()` - Idempotency check
- `getAttemptById()` - Retrieve single execution
- `listAttemptsByProposal()` - List all attempts for a proposal
- `updateAttemptStatus()` - Update lifecycle status

**Idempotency conflict handling:** Throws "IDEMPOTENCY_CONFLICT" error if duplicate key detected

### 5. Database Schema (`supabase/migrations/0006_execution_attempts.sql`)

**execution_attempts table:**

| Column | Type | Description |
|--------|------|-------------|
| execution_id | TEXT | Domain identifier (exec_xxx) |
| workspace_id | UUID | Workspace for RLS |
| proposal_id | TEXT | Parent approved proposal |
| idempotency_key | TEXT | SHA256 deterministic key (unique) |
| capability | TEXT | Action being executed |
| provider | TEXT | External provider |
| input_payload | JSONB | Validated input parameters |
| output_payload | JSONB | Provider response |
| status | TEXT | queued \| running \| succeeded \| failed \| cancelled |
| external_reference | TEXT | Provider-returned identifier |
| error_code | TEXT | Error classification |
| error_message | TEXT | Error details |
| created_at | TIMESTAMPTZ | Queued time |
| started_at | TIMESTAMPTZ | Execution start |
| completed_at | TIMESTAMPTZ | Execution end |

**Indexes:**
- workspace_id, proposal_id, status, idempotency_key
- Composite: (workspace_id, status), (workspace_id, proposal_id)

**RLS:** Full workspace-scoped access control

### 6. API Route (`src/app/api/executions/[proposalId]/route.ts`)

**POST /api/executions/:proposalId** - Execute approved proposal
- Validates authentication
- Retrieves proposal from database
- Checks approval status
- Calls execution service
- Updates proposal status to "executed" on success
- Returns execution attempt with alreadyExecuted flag

**GET /api/executions/:proposalId** - List execution attempts
- Returns all execution attempts for a proposal
- Ordered by creation time (most recent first)

### 7. Tests (`tests/unit/execution-service.test.ts`)

**20 comprehensive tests covering:**

1. **Idempotency Key Generation (§33)**
   - Deterministic hash generation
   - Different keys for different versions/workspaces/proposals
   - Key format validation

2. **Mock Capability Executors**
   - All 7 capabilities execute successfully
   - Input validation against schemas
   - Error handling for invalid inputs
   - Unknown capability detection

3. **Execution Service — Approved Proposals Only (§30)**
   - Rejects non-approved proposals
   - Accepts approved proposals with allowed policy decision

4. **Capability Registry Lookup (§31)**
   - Finds registered capabilities
   - Returns undefined for unknown capabilities
   - Identifies operations requiring approval

5. **Input Validation**
   - Valid inputs execute successfully
   - Invalid inputs return validation errors

6. **Response Capture**
   - Captures external reference from executor
   - Captures output payload from executor

## Key Design Decisions

### 1. Deterministic Idempotency (§33)

**Decision:** Use SHA256(workspaceId + proposalId + version) for idempotency keys.

**Rationale:**
- **Deterministic**: Same proposal always generates same key
- **Unique**: Different proposals/versions have different keys
- **Prevents duplicates**: Database unique constraint on idempotency_key
- **Not random**: Tied to specific proposal state (not a random UUID)
- **Version-aware**: Edited proposals get new key (allows retry)

**Alternative rejected:** Random UUIDs - would not prevent duplicates across restarts

### 2. Mock Executors for MVP

**Decision:** Implement mock executors for all capabilities, not real integrations.

**Rationale:**
- Demonstrates execution flow without external dependencies
- Allows testing without API credentials
- Real integrations require provider-specific setup
- Mock executors can be replaced one-by-one in production
- Input validation still enforced via Zod schemas

**Future:** Replace mocks with real providers (Twilio, SendGrid, WhatsApp Business API, etc.)

### 3. Web Crypto API for Hashing

**Decision:** Use browser-compatible Web Crypto API instead of Node crypto module.

**Rationale:**
- Works in browser, Node, and edge runtimes
- Next.js edge functions require Web APIs
- No native module dependencies
- Async API (returns Promise)

**Tradeoff:** Async hashing adds complexity but enables edge deployment

### 4. Server-Only Execution

**Decision:** Execution service runs entirely server-side (server-only import).

**Rationale:**
- External API credentials must never reach browser
- Execution authority must be server-controlled
- Browser cannot be trusted for financial operations
- PAL_ARCHITECTURE.md §30: "Only component allowed to call external write APIs"

### 5. Lifecycle Tracking

**Decision:** Track full execution lifecycle (queued → running → succeeded/failed).

**Rationale:**
- **queued**: Execution intent recorded before API call
- **running**: External API call in progress
- **succeeded**: External API returned success
- **failed**: External API returned error
- **cancelled**: User or system cancelled execution

Allows debugging stuck executions and retry logic

### 6. No Outbox Pattern Yet

**Decision:** Direct execution without outbox table (§34).

**Rationale:**
- MVP simplicity - direct execution path
- Outbox pattern adds complexity (worker process, polling/streaming)
- Can be added later without breaking changes
- Current implementation prevents duplicate execution via idempotency

**Future:** Implement outbox pattern for at-least-once delivery guarantees

## Security Considerations

1. **Server-only execution**: No execution logic in browser
2. **Workspace tenancy**: All queries scoped to workspace_id via RLS
3. **Approval validation**: Only approved proposals can execute
4. **Idempotency**: Prevents duplicate external side effects
5. **No credential exposure**: Provider credentials stay server-side
6. **Audit trail**: Every execution attempt logged with full details
7. **Error capture**: Errors logged for debugging without exposing internals

## Performance Considerations

1. **Idempotency check**: Single DB query before execution
2. **Async execution**: Non-blocking I/O for external API calls
3. **Status updates**: Separate transactions for lifecycle changes
4. **Indexes**: Optimized for common queries (by proposal, by workspace)
5. **No retry logic yet**: Failed executions stay failed (manual retry via new proposal)

## Limitations & Future Work

### Current Limitations

1. **Mock executors only**: No real external integrations
2. **No retry logic**: Failed executions require manual intervention
3. **No outbox pattern**: Direct execution (not at-least-once delivery)
4. **No verification agent**: Response capture only, no verification
5. **No credential management**: Placeholder for provider credentials
6. **No rate limiting**: No throttling or backpressure for external APIs
7. **Synchronous execution**: No background workers or queues

### Future Enhancements (Beyond MVP)

1. **Real capability executors**:
   - WhatsApp Business API for message.send
   - Twilio SMS for message.send
   - SendGrid for email
   - Payment gateway integrations
   - CRM integrations (Salesforce, HubSpot)

2. **Outbox pattern (§34)**:
   - Outbox table for at-least-once delivery
   - Worker process to claim and execute
   - Prevents execution loss on failure

3. **Retry logic**:
   - Exponential backoff for transient failures
   - Max retry limits
   - Dead letter queue for permanent failures

4. **Verification agent** (Task 3.5):
   - Verify external effects match expectations
   - Check message delivery status
   - Confirm payment processing
   - Compare expected vs actual outcomes

5. **Credential management**:
   - Secure credential storage
   - Per-workspace provider credentials
   - Encrypted at rest
   - Rotation support

6. **Rate limiting**:
   - Per-provider rate limits
   - Per-workspace quotas
   - Backpressure handling

7. **Background execution**:
   - Job queue for async execution
   - Scheduled execution support
   - Batch execution

## Files Created/Modified

### Created
- `supabase/migrations/0006_execution_attempts.sql` — Database schema
- `src/services/execution/service.ts` — Main execution service
- `src/services/execution/db.ts` — Database service
- `src/services/execution/executors/mock.ts` — Mock capability executors
- `src/lib/utils/idempotency.ts` — Deterministic idempotency keys
- `src/app/api/executions/[proposalId]/route.ts` — API endpoint
- `tests/unit/execution-service.test.ts` — Comprehensive tests

### Modified
- `src/lib/utils/ids.ts` — Added "exec" and "decision" prefixes
- `docs/PAL_EXECUTION_PLAN.md` — Marked Task 3.4 complete

## Test Coverage

- **20 new tests** covering idempotency, executors, validation, and execution flow
- **Typecheck**: Clean
- **Lint**: Clean

## Next Steps (Task 3.5)

The next task is to implement the Verification Agent:

1. **Verification service** that checks external effects
2. **Provider-specific verification** (message delivery, payment confirmation)
3. **Expected vs actual outcome comparison**
4. **VerificationResult persistence** with verified/failed/unverified status
5. **Verification API endpoint**
6. **Integration with execution service**

## Definition of Done ✅

- [x] Implementation matches PAL_DOMAIN_MODEL.md
- [x] Tests passing (20 new execution tests)
- [x] Relevant docs updated (PAL_EXECUTION_PLAN.md)
- [x] No security-rule violations (PAL_SECURITY.md)
- [x] Execution service only executes approved proposals
- [x] Deterministic idempotency prevents duplicate execution
- [x] All 7 capabilities have mock executors
- [x] Full lifecycle tracking (queued → running → succeeded/failed)
- [x] Response capture and error handling
- [x] Typecheck clean
- [x] Lint clean
