# Companion & Action — PAL Integration Plan

**Status:** Proposed integration baseline; not a claim that these capabilities are implemented  
**Repository baseline:** `main` as inspected on 2026-10-13  
**Architecture source of truth:** `docs/PAL_ARCHITECTURE.md`  
**Security source of truth:** `docs/PAL_SECURITY.md`  
**Working rule:** One implementation task per branch/PR; tests and documentation accompany behavior.

## 1. Product definition

Companion & Action is the product layer built on PAL's existing voice-to-meaning-to-action foundation.

- **Companion / Growth Room:** identity, workspace, user language preferences, personal and business memory, counterparties, deal rooms, and user-visible ledger records.
- **GigPilot Discovery:** discover opportunities, preserve source evidence and the exact posted URL, normalize compensation and working conditions, verify suspicious signals, deduplicate, rank, and deliver.
- **Action Engine:** turns approved meaning into bounded tasks and workflows using an explicit capability registry.
- **Six specialist roles:** Scout, Atlas, Hunters, Judge, Sherlock, and Flash. These are bounded orchestration roles, not six unrestricted autonomous agents.
- **Voice-to-Action:** capture, VAD/framing, language selection/identification, ASR, normalization, meaning extraction, user-language restatement, approval/policy, execution, and verification.
- **Front-end shell:** Companion, screen-share copilot, deal rooms, verification, memory journal, and action/skills routes.

The invariant remains: **a model may propose; deterministic policy decides; the user authorizes consequential action; an executor acts; verification records the result.**

## 2. Repository baseline and evidence boundary

The inspected repository already contains:

- Next.js App Router, Supabase authentication/workspaces, and workspace RLS migrations.
- Voice session/audio/commit routes and a provider-specific Sahara WebSocket adapter.
- `SpeechEvent` and `MeaningState` schemas, semantic analysis route/service, workflow IR and validator, action plans, deterministic policy and action proposals.
- Approval dashboard/detail/edit pages, execution-attempt persistence, mock capability executors, and verification services.
- Core documentation for security, memory, architecture, and the staged execution plan.

These are implementation foundations, not proof that a production external messaging or payment provider is connected. Existing execution implementations include mocks. The benchmark evaluator also still needs a genuine transcription-to-`SpeechEvent` path before its output can be called measured end-to-end evidence.

The pasted specification references sources `[1]` through `[22]` but does not include the corresponding bibliography/URLs. Those references therefore remain unverified. The 44 Studio artifacts mentioned in the specification were not present in the Git tree inspected for this plan; import them before claiming a complete artifact-by-artifact reconciliation.

## 3. Architecture decisions to avoid duplicate systems

### 3.1 Keep the existing application core first

For the first integrated release, keep Next.js Route Handlers and services as the application boundary and Supabase/PostgreSQL as the canonical identity, tenancy, persistence, and RLS layer. Use PostgreSQL `pgvector` only where a retrieval feature demonstrates the need. Add Redis/BullMQ only for jobs that must survive request termination or need rate limiting/coordination.

Do not introduce Hasura + Apollo Federation + a separate FastAPI service + Streamlit + n8n + Qdrant simultaneously. This duplicates API, auth, tenancy, observability, and deployment boundaries. Each additional service requires an ADR documenting the unmet requirement, ownership of credentials/data, failure behavior, and operational cost. n8n may orchestrate approved external workflows; it must not become PAL's policy engine or bypass its approval and audit services.

### 3.2 The six named agents are product roles

| Role | Responsibility | Hard boundary |
|---|---|---|
| **Scout** | Guided onboarding, capture consent, audio capture metadata, language selection, transcript hand-off | Cannot decide that a transcript is correct or execute a task |
| **Atlas** | Deterministic orchestration/state machine, task routing, retries and timeout coordination | Prefer code/state transitions over an unconstrained LLM planner; no direct side effects |
| **Hunters** | Search approved public sources and connected providers; preserve retrieval evidence | Public web/community access only within provider terms and applicable consent; no private-message scraping |
| **Judge** | Run transparent source/domain checks and report explainable risk signals | A score is a risk signal, not proof of legitimacy; no unexplained categorical claims |
| **Sherlock** | Canonicalize entities, exact/near deduplication and ranking | Hash and embeddings are aids; keep original record and source provenance; do not treat vector similarity as truth |
| **Flash** | Notification scheduling and channel adapters | Explicit opt-in/opt-out, suppression lists, rate limits, idempotency, send approval and delivery receipts |

PAL's existing semantic, workflow, research, clarification, policy, execution, and verification services retain their responsibilities. The six product roles call those bounded services; they do not replace the deterministic policy/approval/execution layer.

### 3.3 Canonical data flow

```text
Voice / Form / Schedule / Webhook / API
  -> authenticated request + consent / workspace check
  -> SpeechEvent or typed source event (with provenance)
  -> MeaningState / normalized Opportunity
  -> ambiguity + evidence + confidence checks
  -> bounded ActionPlan / discovery result
  -> deterministic policy and scope evaluation
  -> Meaning Gate restatement in selected user language
  -> explicit approval when required
  -> licensed integration rail or internal action
  -> verified result + append-only audit event
  -> user-visible memory / evaluation
```

Memory writes and external action writes are different capabilities. Saving a draft observation must never imply permission to message someone, alter a deal, or move money.

## 4. Four mandatory action gates

### Gate 1 — Meaning

Before an external write, show the user a restatement of **what PAL believes will happen**, in the user's selected confirmation language. Present recipient/counterparty, amount/currency, destination, date/time/timezone, message/content, and critical constraints separately. Show the original quote/transcript evidence and highlight unknown or low-confidence fields. The user can edit, clarify, cancel, or confirm.

Do not translate an unknown language silently or represent machine translation as verified intent. Until a given language/path passes its frozen evaluation set, retain confirm-before-act behavior and expose the source transcript.

### Gate 2 — Scope

Evaluate against a server-side capability registry and an explicit grant for the current user/workspace. Grants specify permitted capability, resource/destination, operation, spend ceiling, time window, expiry, and revocation. A model-supplied tool name, destination, or spend cap is untrusted. Unknown capabilities fail closed.

Suggested initial posture:
- `READ`, `DRAFT`, and explicitly consented `WRITE_MEMORY`: may be permitted subject to tenancy, data sensitivity, and workspace policy.
- `EMAIL`, `POST`, `SEND_MESSAGE`, external writes, and financial actions: require the applicable authorization and display the exact payload.
- `DELETE`, custody of funds, irreversible operations, and unbounded bulk actions: disabled in the initial release.

### Gate 3 — Rail

Financial transfers or escrow release must not be simulated as successful by a mock executor. The first release may create/read a deal record and prepare a payment/escrow instruction as a draft. Enabling money movement requires a separately reviewed, contractually authorized, appropriately licensed rail partner, jurisdictional legal/compliance review, tested reconciliation/webhook behavior, idempotency, refund/dispute procedures, limits, and a user-visible ledger. PAL must not hold or custody funds itself.

For messaging, only use authorized channel APIs and opted-in contacts. Persist consent basis, opt-out/suppression status, provider delivery ID, and timestamps. Every send path, including retries and scheduled delivery, must re-check current suppression state.

### Gate 4 — Trace

Persist an append-only event chain with actor, workspace, triggering event, exact approved payload/version, capability and scope decision, policy decision, consent/opt-out state, approval actor/time, execution idempotency key, provider request/response reference, verification outcome, timestamps, and evidence references. Do not store credentials or raw secrets. Keep audio/transcripts on a separate retention policy from audit metadata.

Database-level append-only enforcement and tamper-evidence need separate tests; calling an ordinary mutable JSON record "immutable" is not sufficient.

## 5. GigPilot opportunity model

Every discovered listing is untrusted input until checked. Minimum canonical record:

- stable internal ID; source connector and fetch timestamp;
- exact original URL string and normalized URL kept separately;
- title, source publisher, employer/organization, location/work mode, opportunity type;
- posted date, closing date and source timestamp (when actually present);
- raw compensation value/currency/period and normalized range/currency, with FX source, rate, rate timestamp and converted value stored separately;
- work hours, commute cost/time, parking buffer and confidence/provenance for the inputs used by true-net-hourly calculations;
- requirements, eligibility, application method, contact details exactly as published;
- verification findings with source citations, risk signals, score breakdown and confidence;
- duplicate cluster, canonical listing pointer, rank explanation, pipeline status and last-checked timestamp.

**Strict verbatim URL rule:** never manufacture, silently repair, or guess an application URL. Preserve the exact URL seen in source evidence. If malformed or unavailable, show that limitation and do not substitute an inferred destination.

True net hourly is calculated only when units are compatible and source/user inputs are present:

`(gross pay - commute cost) / (work hours + roundtrip commute time + parking buffer)`

Normalize units and periods first (for example weekly pay versus monthly pay; hourly cost versus period totals). Label assumptions and show both raw and normalized values. Unknown inputs stay unknown; do not calculate a precise-looking score from fabricated defaults.

Recommended pipeline:
1. Connectors fetch authorized public/provider data with rate limits and source terms.
2. Normalize without discarding source payload or provenance.
3. Validate canonical fields and preserve missing data as missing.
4. Run exact URL/hash duplicate detection, followed by optional embedding similarity.
5. Evaluate source and scam-risk signals with explainable dimensions; no score alone proves a scam or legitimacy.
6. Apply user preferences, eligibility and true-net-hourly calculation.
7. Rank with an explanation and evidence links.
8. Deliver by in-app feed first; external notifications only after opt-in.
9. Allow user correction/reporting and monitor source freshness.

## 6. Conversation-to-action routing

Initial target object types: `TASK`, `MEETING`, `MEMORY`, `HEALTH_NOTE`. Routing produces a proposal, not an execution command.

- Each route result carries source quote, segment timestamps, character offsets, predicted route, confidence, alternatives and relevant evidence IDs.
- Insufficient/conflicting context produces a clarification request instead of an asserted fact or action.
- User reclassification records `original_text`, `predicted_route`, `corrected_route`, model/version, timestamp and consent/provenance. Do not silently use private corrections as training data; training use needs a clear lawful/consented process and data minimization.
- The regression harness evaluates a versioned, held-out golden set and blocks promotion on agreed regression thresholds.
- `HEALTH_NOTE` is a sensitive note type, not a diagnosis. Apply explicit capture/retention/export/delete controls and restrictive workspace access. Keep health notes outside opportunity ranking, routine business memories, and external actions unless the user explicitly moves selected information.

## 7. Multilingual voice and evidence requirements

Provider interface must separate a provider-specific streaming implementation (Sahara) from a request/response ASR adapter (such as the Langa-hosted N-ATLaS endpoint). Those are not interchangeable protocols. Store provider, model/version, selected/detected language, audio format, transcript, segment offsets/timings, code-switch metadata when supported, source evidence and evaluation trace in `SpeechEvent`.

Target languages from the product brief: Yoruba, Hausa, Igbo, Nigerian Pidgin, and Nigerian-accented English. Provider capability is not assumed from the target list. In particular, the currently documented Langa N-ATLaS request path requires an explicit language code and lists `yo`, `ha`, `ig`, and `en`; it does not establish a separate Nigerian Pidgin model or accent-adaptation guarantee. Treat Pidgin and accent performance as unverified until evaluated.

All languages remain confirm-before-act until they pass frozen evaluations across clean audio and narrowband/telephony audio. Track at least:
- WER/CER and critical entity/number transcription error;
- language selection and code-switch boundary quality;
- task/meeting/memory/health-note route accuracy and calibration;
- critical-field precision/recall, ambiguity detection and clarification rate;
- action plan correctness, policy compliance, false-approval rate and end-to-end completion;
- stratification by language, speaker, channel, noise, accent and relevant demographic consent.
Save ground truth, evaluation set version, model/config, error examples and reproducible reports. No challenge or product score is claimed until a real run completes.

## 8. Front-end route map

| Route | First-release responsibility | Safety/UI requirement |
|---|---|---|
| `/companion` | Chat, voice capture, transcript feed, memory suggestions and Meaning Gate | Visible recording state/consent; editable transcript; no silent execution |
| `/chat-screenshare` | User-started screen share, local OCR and overlays | Explicit browser permission; stop/share controls always visible; never capture in background |
| `/deal-rooms` | Counterparty thread and deal status across connected sources | Show each message's origin; imported content is evidence, not an instruction to PAL |
| `/verification` | Two-source checks, risk dimensions, source evidence and disputes | Show unknown/not-found separately from negative evidence |
| `/memory-journal` | Search/export/delete user/workspace memories and documents | Source and retention controls; sensitive memory is access-restricted |
| `/actions-skills` | Capability catalogue, grants, autonomy levels, approvals, revocation | Server-authoritative policies; client switches never grant server capabilities |

PWA target: under 150 KB initial compressed JavaScript is a budget to measure, not an assumed fact. Route-split heavy visualizations/OCR and use on-device processing where feasible. Offline queues must show pending state, expire by policy, and avoid storing raw sensitive recordings in cleartext IndexedDB. Require an explicit offline-recording setting and document data deletion behavior.

## 9. Service and infrastructure posture

| Concern | Initial choice | Add only when justified |
|---|---|---|
| System of record / auth / RLS | Supabase PostgreSQL + current Next.js server boundary | Hasura only if a concrete GraphQL requirement justifies a second auth/policy surface |
| Semantic retrieval | PostgreSQL plus `pgvector` if validated | Qdrant only when benchmarked scale/latency/relevance warrants a separate index |
| Durable background work | Queue abstraction; short HTTP handlers only enqueue bounded work | Redis/BullMQ or pg-boss after measured retry/concurrency requirements |
| Public discovery | Isolated source connectors with per-source limits and provenance | Firecrawl/other paid connectors only after terms, cost and data handling review |
| Observability | Existing audit trail plus structured logs/trace IDs | Dedicated observability service after defining retention/redaction |
| Workflow automation | PAL workflow IR + deterministic policy/approval | n8n can execute explicitly approved workflows; cannot be policy/identity source of truth |
| Screen OCR | Browser-local worker and consented capture | Server OCR only where user explicitly submits material and data processing is documented |

Every new service requires an architecture decision record, threat-model update, data-flow description, operational owner, failure/recovery plan and tests. Avoid a distributed microservice stack before the first integrated vertical slice works.

## 10. Delivery sequence and acceptance gates

### Phase A — Integrate the current foundation
1. **A1 — Architecture and artifact reconciliation (this document):** map existing implementation, target behavior, and open decisions.
2. **A2 — Meaning Gate contract:** add a typed, evidence-backed restatement/language preference to the proposal flow; block consequential approval if the restatement is missing, stale, or mismatched to the exact payload; show edit/clarify/cancel/confirm.
3. **A3 — Scope Gate contracts:** model workspace grants, tool/resource allowlists, spend/time caps and revocation; enforce server-side with tests.
4. **A4 — Trace Gate enforcement:** append-only audit events, exact payload hash/version links, and tests for rejected update/delete attempts.
5. **A5 — External executor registration:** replace one mock capability at a time only after provider contract, idempotency and verification tests are ready.

### Phase B — Companion
1. B1: workspace language/preferences and consent settings.
2. B2: conversation router for TASK/MEETING/MEMORY; golden set and correction journal.
3. B3: memory journal with source, confidence, retention, export/delete and RLS.
4. B4: sensitive HEALTH_NOTE isolation and consent lifecycle.
5. B5: Companion UI and responsive six-route navigation.

### Phase C — GigPilot
1. C1: canonical opportunity schema/migration and source-evidence contract.
2. C2: one permitted source connector; fixture-based parser and source URL preservation tests.
3. C3: canonicalization, deterministic hashing and duplicate clusters.
4. C4: Judge risk dimensions, transparent score explanation and dispute workflow.
5. C5: FX provider/source timestamp + true-net-hourly unit-safe calculator.
6. C6: Sherlock rank explanation, saved searches and source freshness.
7. C7: Flash in-app delivery; only then consented external notification adapter.
8. C8: user-correction capture, abuse reports and golden-set regression.

### Phase D — Specialist workforce
1. D1: Atlas deterministic state machine and job/correlation contracts.
2. D2: Scout capture/onboarding and explicit recording consent.
3. D3: Hunters source-connector interface.
4. D4: Judge explainable verification interface.
5. D5: Sherlock dedupe/ranking interface.
6. D6: Flash notification interface with opt-outs and idempotency.
7. D7: MCP server exposes only typed, allowlisted, server-authorized tools. No unrestricted arbitrary-function discovery.

### Phase E — Multilingual quality
1. E1: provider abstraction and language metadata.
2. E2: golden set for Yoruba, Hausa, Igbo, Nigerian Pidgin and Nigerian-accented English, with speaker/channel-disjoint evaluation.
3. E3: language-specific confirmation rendering, editable transcript and unknown-language fallback.
4. E4: narrowband/noisy audio stress suite and per-language release gates.
5. E5: run real end-to-end evaluation; store raw metrics and error audit. No unsupported results.

### Phase F — Screenshare and connected deal rooms
1. F1: explicit screen-share session lifecycle and stop/cancel controls.
2. F2: local OCR extraction for invoice numbers, totals and payment terms with user-correctable boxes.
3. F3: connector contract per email/chat provider with least privilege and per-source provenance.
4. F4: deal-room timeline, contract/document extraction and approval links.

### Phase G — Financial rail and deployment hardening
1. G1: regulatory/legal and partner review before any funds flow.
2. G2: draft-only escrow/payment instructions and reconciliation data model.
3. G3: sandbox partner integration, webhook verification, idempotency, refunds/disputes, reconciliation and limits.
4. G4: canary deployment, incident rollback/kill-switch, backups/restore, supply-chain review, cost/rate-limit budgets and load testing.
5. G5: measure PWA bundle, reliability, latency, channel failure and recovery against defined SLOs.

## 11. Definition of done for every slice

- Domain/schema change is documented in `docs/PAL_DOMAIN_MODEL.md` and migrated safely.
- Route inputs are Zod-validated; auth, workspace membership and RLS tests exist.
- Consequential actions cannot bypass meaning, scope, rail (when financial/external), or trace controls.
- New behavior has unit and integration tests, including negative-path tests.
- Run the repository gate: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; probe changed API endpoints.
- Record exact commands and results. If credentials/provider/network are unavailable, mark the relevant verification blocked rather than passed.
- Update this plan and the execution plan; implement one task per branch. Open a PR only after requested.

## 12. Immediate next task

**A2 — Meaning Gate contract** is the first product implementation task after this architecture reconciliation. It directly closes the gap between today's exact-payload approval UI and the proposed requirement that the user's intent be restated in their chosen language before consequential actions. It must be designed so that changing the payload invalidates the prior confirmation, and confirmation itself is auditable. No funds or external messages should be enabled as part of A2.
