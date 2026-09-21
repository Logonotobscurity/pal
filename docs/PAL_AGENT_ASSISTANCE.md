# PAL Agent Assistance Guide

How OpenHands (and by extension other coding agents) can assist on the `wwhisper`
/ PAL repository. This document complements `AGENTS.md` — that file holds the
rules every agent must follow; this one describes working agreements, the
verification gate, and the environment's known limits.

## 1. What an agent can do here

Work is scoped to the project's own model: **one issue-sized task from
`docs/PAL_EXECUTION_PLAN.md` at a time**, implemented fully, then stopped.

| Capability | Notes |
| --- | --- |
| Implement a task from the execution plan | One task per change; no phase batching |
| Add / update schemas in `src/core/schemas` | Must be reflected in `docs/PAL_DOMAIN_MODEL.md` in the same change |
| Add or fix API route handlers | Follow the existing Zod-validation + fail-closed pattern |
| Add tests | Vitest, `tests/unit/**/*.test.ts`; new behavior gets tests, bug fixes get a regression test |
| Harden types / fix CI | `tsc`, ESLint, and build fixes with no suppressions |
| Review a diff or PR | Focused review against the architecture and security docs |
| Audit documentation vs. code | Flag drift and fix one side — never silently work around |

## 2. The verification gate

Nothing is "done" until all four pass locally. These are exactly the commands CI
runs (`.github/workflows/ci.yml`):

```bash
npm ci
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm test            # vitest run
npm run build       # next build
```

CI runs typecheck, lint, and unit tests on Node.js 24. `npm run build` is not in
CI but should be run locally for changes touching routes, pages, or config.

For changes to an HTTP route, also start the server and exercise the endpoint —
static checks do not catch runtime request/response defects:

```bash
npm run build && npm run start
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/<route>"
```

## 3. Known environment limits

These are real constraints of a sandboxed session, not bugs. State them honestly
rather than reporting a false pass.

- **No Supabase credentials.** `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not set. Every Supabase-backed route stops
  at the config check and returns a typed `EnvConfigError`. Data paths behind
  authentication cannot be exercised without a real project or a local stub.
  Pages `/approvals` and `/approvals/[id]` return 500 for the same reason.
- **Node version skew.** CI uses Node 24; a sandbox may run Node 22 (`node -v`).
  Verify with the local version, but treat Node 24 as authoritative for CI.
- **No network to Supabase.** Even with credentials, tenant data lives in an
  external project the sandbox cannot reach.

## 4. Constraints an agent must honor

Restated from `AGENTS.md` and `docs/PAL_SECURITY.md` because they are the most
common source of rejected changes:

- No `any`, `@ts-ignore`, or `@ts-expect-error` without a TODO linking a tracking
  issue. The compiler config is already maximal: `strict`,
  `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
  `noPropertyAccessFromIndexSignature`, `noImplicitOverride`,
  `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUnusedLocals`,
  `noUnusedParameters`, `allowUnreachableCode: false`, `allowUnusedLabels: false`.
- Domain changes are not local edits. New fields, states, or transitions go into
  `docs/PAL_DOMAIN_MODEL.md` in the same change.
- Architecture deviations are proposed in `docs/PAL_ARCHITECTURE.md` *before* the
  code changes, not after.
- Security rules are hard constraints — no convenience overrides, including in
  tests.
- No new dependencies without stating why. No drive-by refactors; keep diffs
  minimal and reviewable.
- Match the optional-property convention already in the codebase: optional
  fields are written `prop?: T | undefined` so they are sound under
  `exactOptionalPropertyTypes`.

## 5. Path-specific rules

`.github/instructions/` holds additional rules that apply by file type. Read the
relevant file before editing:

- `backend.instructions.md` — services, providers, route handlers
- `database.instructions.md` — migrations under `supabase/`, RLS, queries
- `frontend.instructions.md` — components, pages, client state

## 6. Working agreement for a session

1. **Read first**: `docs/PAL_ARCHITECTURE.md`, `docs/PAL_DOMAIN_MODEL.md`,
   `docs/PAL_EXECUTION_PLAN.md`. If a doc and the code disagree, surface it.
2. **Pick one task** from the execution plan and confirm scope if ambiguous.
3. **Implement** the minimal change that satisfies the task.
4. **Test**: run the four-command gate; for routes, probe the endpoint live.
5. **Report honestly** — including anything that could not be verified and why.
6. **Push to a branch**, not to `main`. Open a PR only when asked.

## 7. Reference

- Architecture: `docs/PAL_ARCHITECTURE.md`
- Domain model: `docs/PAL_DOMAIN_MODEL.md`
- Execution plan: `docs/PAL_EXECUTION_PLAN.md`
- Security: `docs/PAL_SECURITY.md`
- Type audit: `TYPE_AUDIT_REPORT.md`
- OpenHands documentation: <https://docs.openhands.dev/>
