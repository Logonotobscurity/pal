# PAL Domain Model

> **Status: PLACEHOLDER.** Schemas, state machines, and invariants. Any code change to domain structures must update this file in the same change.

## Entities

### SaharaStreamChunk

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| sessionId | string | non-empty | Identifies the in-flight transcription session |
| sequence | number | int >= 0 | Monotonic chunk order for provenance |
| text | string | 1..2000 chars | Partial or final transcript payload |
| isFinal | boolean | required | Final chunk indicates transcription complete |
| status | enum | idle \| streaming \| completed \| error | Current streaming lifecycle state |
| confidence | number? | 0..1 | Optional speech confidence for the chunk |
| createdAt | string? | ISO-8601 timestamp | Timestamp set at creation time |

### SpeechEvent

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string | non-empty | Stable event identifier |
| traceId | string | non-empty | Root trace for the broadcast chain |
| sessionId | string | non-empty | Links back to the voice session |
| provider | enum | sahara \| assemblyai \| whisper \| other | Speech provider used |
| providerVersion | string | non-empty | Provider model/version |
| transcript.text | string | 1..20000 chars | Full transcript output |
| transcript.segments | array | min 1 | Timestamped transcript segmentation |
| languageSpans | array | optional | Language spans for code-switch detection |
| codeSwitch.detected | boolean | required | Whether language switching was detected |
| codeSwitch.switchCount | number | int >= 0 | Number of switch boundaries |
| codeSwitch.density | number? | 0..1 | Optional density value |
| timing.startedAt | string | ISO-8601 | Speech start timestamp |
| timing.endedAt | string | ISO-8601 | Speech finish timestamp |
| provenance | array | optional | Evidence references backing the speech object |
| createdAt | string? | ISO-8601 | Event creation timestamp |

### MeaningState

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string | non-empty | MeaningState identifier |
| speechEventId | string | non-empty | Parent speech evidence |
| intent | object | required | Canonical action intent from the transcript |
| entities | array | optional | Named entities and extracted values |
| constraints | array | optional | Operational constraints and deadlines |
| temporalRelations | array | optional | Time-based relations and windows |
| ambiguities | array | optional | Unresolved ambiguity records |
| evidenceRefs | array | optional | Citation chain for all material fields |
| confidence.overall | number | 0..1 | Overall confidence |
| contextSufficiency | enum | sufficient \| insufficient \| conflicting | Whether evidence is enough to act |
| model.provider | string | required | Source model provider |
| model.model | string | required | Specific model name |
| model.version | string | required | Model version |

### WorkflowIR

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| version | string | literal "1.0" | Workflow IR specification version |
| nodes | array | min 1 | Bounded workflow graph nodes |
| edges | array | optional | Directed node connections |

### WorkflowNode

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string | non-empty | Stable node identifier |
| type | enum | trigger \| agent \| condition \| action \| approval \| fallback | Allowed node kinds |
| capability | string? | present for agent/action nodes | Constrained execution capability |

### ReactFlowWorkspace

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| version | string | literal "1.0" | Frontend visualization schema version |
| nodes | array | min 1 | React Flow node list |
| edges | array | optional | React Flow edge list |
| position.x | number | required | Horizontal placement |
| position.y | number | required | Vertical placement |

### PolicyDecision

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| allowed | boolean | required | Whether the action may proceed |
| status | enum | approved \| pending \| rejected \| edited | Current policy state |
| reason | string | 1..500 chars | Human-readable decision rationale |
| riskClass | enum | read \| draft \| external_write \| financial \| destructive | Risk category |
| actionType | string | non-empty | Proposed action capability |
| workspaceId | string | non-empty | Workspace boundary |
| requiresApproval | boolean? | optional | Whether the action requires owner approval |
| evidenceRefs | array | optional | Policy evidence chain |

### ActionProposal

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string | non-empty | Stable action proposal ID |
| workspaceId | string | non-empty | Workspace owner boundary |
| actionPlanId | string | non-empty | Parent action plan |
| actionType | string | non-empty | Action class to perform |
| exactPayload | unknown | required | Exact payload to be approved |
| destination | string? | optional | External destination or channel |
| recipient | string? | optional | Intended recipient |
| scheduledFor | string? | ISO-8601 | Optional scheduled time |
| riskClass | enum | read \| draft \| external_write \| financial \| destructive | Risk category |
| evidenceRefs | array | optional | Evidence backing the proposal |
| status | enum | pending \| approved \| edited \| rejected \| expired \| executed \| failed | Proposal lifecycle |
| policyDecision | PolicyDecision? | optional | Binding to the last policy gate decision |
| createdAt | string? | ISO-8601 | Proposal creation time |
| expiresAt | string? | ISO-8601 | Proposal expiry time |

### ApprovalWorkflow

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| proposalId | string | non-empty | Parent proposal being approved |
| state | enum | pending \| approved \| edited \| rejected | Approval state machine state |
| proposalStatus | enum | pending \| approved \| edited \| rejected \| expired \| executed \| failed | Proposal lifecycle at decision time |
| policyDecision | PolicyDecision? | optional | Last policy evaluation captured for the workflow |
| requiresApproval | boolean | required | Whether the workflow requires explicit approval |
| actorId | string? | optional | Actor making the approval decision |
| reason | string? | 1..500 chars | Approval rationale |
| decidedAt | string | ISO-8601 | Workflow decision timestamp |

### ApprovalDecision

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| proposalId | string | non-empty | Proposal being decided |
| decision | enum | approved \| rejected \| edited | Approval outcome |
| actorId | string | non-empty | User or service that decided |
| reason | string | 1..500 chars | Decision rationale |
| decidedAt | string | ISO-8601 | Decision timestamp |

### ExecutionAttempt

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string | non-empty | Execution attempt id |
| proposalId | string | non-empty | Parent approved proposal |
| idempotencyKey | string | non-empty | Prevents duplicate external side effects |
| provider | string | non-empty | Execution provider |
| status | enum | queued \| running \| succeeded \| failed \| cancelled | Lifecycle status |
| externalReference | string? | optional | External system reference |
| startedAt | string? | optional | Started timestamp |
| completedAt | string? | optional | Completion timestamp |
| errorCode | string? | optional | Failure code |
| errorMessage | string? | optional | Failure detail |

### VerificationResult

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| executionAttemptId | string | non-empty | Parent execution attempt |
| verified | boolean | required | Whether the external effect matches expectations |
| status | enum | verified \| failed \| unverified | Verification lifecycle |
| externalReference | string? | optional | Provider-returned identifier |
| expectedOutcome | string? | optional | What the action was expected to do |
| actualOutcome | string? | optional | What actually happened |
| notes | string? | optional | Human-readable verification details |
| checkedAt | string? | ISO-8601 | Verification timestamp |

### BenchmarkRun

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string | non-empty | Benchmark run identifier |
| name | string | non-empty | Benchmark label |
| dataset | string | non-empty | Dataset or workload name |
| status | enum | queued \| running \| completed \| failed | Benchmark lifecycle |
| sampleCount | number | int >= 0 | Number of samples evaluated |
| metrics | object | optional | Aggregate metric values |
| summary | string? | optional | Human-readable final summary |
| createdAt | string? | ISO-8601 | Creation timestamp |
| completedAt | string? | optional | Completion timestamp |

### FailureReplay

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | string | non-empty | Replay record identifier |
| executionAttemptId | string | non-empty | Producing execution attempt |
| failureType | enum | policy_blocked \| verification_failed \| external_error \| provider_timeout \| validation_error \| unknown | Reproduction class |
| rootCause | string | non-empty | Root-cause summary |
| inputSnapshot | object | required | Saved input at failure time |
| status | enum | queued \| running \| completed \| failed | Replay lifecycle |
| replayer | enum | manual \| automated | Who replayed it |
| createdAt | string? | ISO-8601 | Replay record creation |
| completedAt | string? | optional | Replay completion time |

### ExecutorResult

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| attempt | ExecutionAttempt | required | Newly created execution record |
| verified | boolean | required | Whether the executor has been verified yet |
| message | string? | optional | Human-readable execution status |

## State machines

```
idle --audio_started--> streaming
streaming --partial_chunk--> streaming
streaming --final_chunk--> completed
streaming --error--> error
completed --reset--> idle
error --reset--> idle
```

```
SpeechEvent --semanticization--> MeaningState
```

| State | Allowed transitions | Entry conditions |
|-------|---------------------|------------------|
| idle | streaming | Session created but no audio yet |
| streaming | streaming, completed, error | Audio is active and partial transcripts may arrive |
| completed | idle | Final transcript has been accepted |
| error | idle | Stream fails or transcription is rejected |

## Invariants

<!-- Statements that must always hold. Numbered for reference in tests/docs. -->

1. A Sahara stream must always have a non-empty session identifier.
2. A chunk sequence number must be monotonic within a session.
3. Final chunks may only appear in the completed state, never in idle or streaming.
4. Terminal states are limited to completed and error; no further action may be taken after those states without a reset.
5. All external speech input must be validated before execution as a typed domain object.

## Serialization formats

<!-- JSON schemas / DB schema / API shapes. -->

```json
{
  "sessionId": "session-123",
  "sequence": 1,
  "text": "Hello there",
  "isFinal": false,
  "status": "streaming",
  "confidence": 0.92,
  "createdAt": "2026-09-14T12:00:00.000Z"
}
```
