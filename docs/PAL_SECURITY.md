# PAL Security Rules

> **Status: ACTIVE.** Hard constraints. No deviation for convenience, demos, or tests without explicit written approval and an update to this document.

These rules implement the non-negotiable architectural principle from `PAL_ARCHITECTURE.md`:

> No AI model may directly execute an external side effect.

Agents propose. Policy decides. Owner approves. Executor acts. Verifier confirms.

---

## 1. Threat Model (Summary)

### Assets
- User speech audio and transcripts (potentially sensitive business/clinical content)
- Structured meaning, action plans, and proposals
- Workspace data and membership
- External integration credentials and side-effect capabilities
- Audit / provenance chain

### Actors
- Authenticated workspace members (varying roles)
- Unauthenticated internet callers
- Compromised or low-quality LLM outputs
- Malicious or mistaken internal agents
- Supply-chain attackers (dependencies, CI)

### Trust Boundaries
- Browser ↔ Next.js (public surface)
- Next.js route handlers ↔ Supabase (RLS + service role)
- PAL services ↔ external providers (Sahara, OpenAI, future integrations)
- LLM output ↔ policy / approval gate (never trusted for side effects)

### Primary Risks
1. LLM or agent directly triggering external writes / financial actions.
2. Secrets leakage (env files, logs, client bundles).
3. Cross-workspace data access (tenancy breach).
4. Replay / duplicate execution of approved actions.
5. Prompt injection or poisoned transcripts leading to high-risk proposals.
6. Insufficient verification of external effects.

---

## 2. Rules (Hard Constraints)

1. **No direct side effects by models**  
   Semantic, Workflow, Research, Clarification, and Verification agents must never call external write APIs, payment systems, messaging providers, or mutate customer records. They may only produce typed domain objects.

2. **Policy is deterministic**  
   The policy engine is not an LLM. Risk classification, critical-field confidence thresholds, and approval requirements are code + configuration.

3. **Approval required for consequential actions**  
   `external_write`, `financial`, and `destructive` risk classes require explicit owner approval showing the *exact payload*. Read and pure-draft actions may be auto-approved under policy.

4. **All external input validated at the boundary**  
   Every API route and provider adapter must parse input with Zod (or equivalent) before domain logic. Reject unknown fields aggressively.

5. **Workspace tenancy is non-negotiable**  
   Every query that touches workspace-scoped data must be filtered by `workspace_id` and protected by RLS. Service-role usage is limited to carefully audited server-side paths.

6. **Idempotency for side effects**  
   Execution attempts must use deterministic idempotency keys. Duplicate calls must not produce duplicate external effects.

7. **Verification never lies**  
   The verification agent must not report success unless the external effect is confirmed. Incomplete or ambiguous outcomes are reported as such.

8. **Secrets never enter the client bundle**  
   Service-role keys, provider API secrets, and database credentials must never be prefixed with `NEXT_PUBLIC_` or appear in client-side code.

9. **Provenance is required**  
   Material fields in MeaningState, ActionPlan, and ActionProposal should carry evidence references. Actions without provenance are high-risk.

10. **Fail closed**  
    On ambiguity, insufficient context, low confidence on critical fields, or policy denial → do not execute. Prefer clarification or rejection over action.

---

## 3. Handling Secrets

- **Never commit real values.** `.env`, `.env.local`, and any file containing secrets are gitignored. `.env.example` contains only placeholders and comments.
- **Rotate immediately** if any secret appears in git history, logs, screenshots, or chat.
- Prefer platform secret stores (Vercel, Supabase, GitHub Actions secrets) over long-lived files on disk.
- Service-role key and Sahara/OpenAI keys are server-only. Document every new secret in `.env.example` with a clear comment about its scope.
- Database passwords and connection strings must never appear in application code or client-visible configuration.

**Incident response (secrets):**  
1. Rotate the secret in the provider dashboard.  
2. Scrub the value from the repository (history rewrite if necessary and the repo is not yet public/widely shared).  
3. Audit access logs if available.  
4. Update this document or open a security issue noting the rotation.

---

## 4. Dependencies

- Prefer well-maintained packages with clear licenses (MIT, Apache-2.0, BSD preferred).
- Pin major versions; review changelogs for security-relevant updates.
- Do not add new runtime dependencies without a documented reason and an update to the relevant architecture or execution-plan section.
- Run `npm audit` (or equivalent) as part of CI once the workflow is in place. Critical vulnerabilities block merge.
- Avoid packages that execute arbitrary code at install time when alternatives exist.

---

## 5. Reporting

If you discover a security issue during development:

1. Do **not** open a public GitHub issue that discloses exploitable details.
2. Document the finding privately (or in a private issue / security advisory if the repository later supports it).
3. For immediate high-severity issues (e.g. live secrets, authentication bypass, tenancy violation), stop related work and notify the repository owner.
4. Fix the issue in a dedicated branch, update tests, and update this document if a new rule or process is required.

For questions about whether a change violates these rules, treat the answer as “yes until proven otherwise” and escalate.

---

## 6. Evolution

This document is the source of truth for security constraints. Any intentional relaxation requires:

- Explicit approval,
- An update to this file in the same change,
- Corresponding tests or policy-engine adjustments.

Last major update: 2026-09-15 (initial concrete policy).
