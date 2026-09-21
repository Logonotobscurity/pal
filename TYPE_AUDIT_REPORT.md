# Type Audit Report

Audit of type declarations, declaration-file accuracy, and strict type-checking
across the PAL (`wwhisper`) repository.

## Summary

| Metric | Count |
| --- | --- |
| Source files audited (`src/**/*.ts(x)`) | 83 |
| Script files audited (`scripts/**/*.ts`) | 1 |
| Test files audited (`tests/**/*.ts`) | 21 |
| Total `.ts`/`.tsx` files | 105 |
| Type-only declaration files (`.d.ts`) | 2 (`next-env.d.ts`, `src/types/env.d.ts`) |
| Plain-JS files in scope | 1 config (`eslint.config.mjs`) |
| Files with inline types / inferred types | 105 (all TS) |
| Missing declarations generated | 1 (`src/types/env.d.ts`) |
| Suppressed `any` / `@ts-ignore` removed | 1 (`as any` in benchmark) |
| Stale or mismatched declarations found | 0 |
| Strict compiler errors before | 67 |
| Strict compiler errors after | **0** |
| ESLint errors before | 2 |
| ESLint errors after | **0** |

### Verification (all green)

```
npm run typecheck   # tsc --noEmit        → 0 errors
npm run lint        # eslint .            → 0 errors, 0 warnings
npm test            # vitest run          → 21 files, 176 tests passed
npm run build       # next build          → compiled successfully
```

Final `tsc` output (exit code 0, no diagnostics):

```
$ npm run typecheck

> wwhisper@0.1.0 typecheck
> tsc --noEmit

$ echo $?
0
```

`tsc` prints nothing and exits `0` when there are zero errors; the CI job treats
a non-zero exit as failure, so exit `0` is the pass condition.

## Strict settings now enforced (`tsconfig.json`)

Added on top of the existing `strict: true`:

- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noPropertyAccessFromIndexSignature`
- `noImplicitOverride`
- `noImplicitReturns`
- `noFallthroughCasesInSwitch`
- `noUnusedLocals`
- `noUnusedParameters`
- `allowUnreachableCode: false`
- `allowUnusedLabels: false`

`include` already covers `**/*.ts`, `**/*.tsx`, and `.next/types/**/*.ts`, so
there are no unreferenced source folders; `exclude` remains `node_modules`.

## Files modified

| File | Change |
| --- | --- |
| `tsconfig.json` | Added 10 strict compiler options (unchecked index access, exact optional properties, no unused locals/params, etc.). |
| `src/types/env.d.ts` | New ambient `NodeJS.ProcessEnv` declarations for every env var the app reads, replacing index-signature `any` access. |
| `.env.example` | Documented the env vars declared in `env.d.ts` that were missing (`SAHARA_WS_ENDPOINT`, `OPENROUTER_*`). |
| `src/lib/auth/session.ts` | Added typed `readUserWorkspaceId()` that narrows the untyped Supabase `UserMetadata` index signature to `string`. |
| `src/app/api/verifications/[executionId]/route.ts` | Use `readUserWorkspaceId()`; prefix unused `request` params with `_`. |
| `src/app/api/executions/[proposalId]/route.ts` | Prefix unused `request` params with `_`. |
| `src/core/schemas/speech-event.ts` | Marked optional props `| undefined` for `exactOptionalPropertyTypes`. |
| `src/core/schemas/meaning-state.ts` | Marked optional props `| undefined`; stop writing `uri: undefined` into evidence refs. |
| `src/core/schemas/action-proposal.ts` | Marked optional props `| undefined` in `createActionProposal` / `createApprovalWorkflow`. |
| `src/core/schemas/verification.ts` | Marked optional props `| undefined` in `createVerificationResult`. |
| `src/providers/sahara.ts` | Extracted shared `SaharaCommitInput` type; marked optionals `| undefined`; added `partialTranscript` undefined. |
| `src/providers/sahara-websocket-adapter.ts` | Reuse `SaharaCommitInput` so the adapter's `commit` matches `SaharaProvider` exactly. |
| `src/providers/openai-llm.ts` | Marked optional `SemanticExtractionInput` props `| undefined`. |
| `src/providers/openai-workflow.ts` | Marked optional `WorkflowGenerationInput.businessContext` `| undefined`. |
| `src/services/semantic/agent.ts` | `businessContext` field typed `string | undefined`; optional-evidence spread. |
| `src/services/workflow/agent.ts` | `businessContext` field typed `string | undefined`; optional-evidence spread. |
| `src/services/policy/engine.ts` | Optional-evidence spread at both proposal construction sites. |
| `src/services/policy/db.ts` | Marked `listProposalsByWorkspace` option props `| undefined`. |
| `src/services/execution/db.ts` | Marked `updateAttemptStatus` input optionals `| undefined`. |
| `src/services/verification/db.ts` | Marked `createVerification` input optionals `| undefined`. |
| `scripts/benchmark/evaluate-pipeline.ts` | Removed unused imports; replaced `as any` with `Record<string, unknown>` narrowing; exported reusable helpers; prefixed unused params. |
| `tests/unit/sahara-provider.test.ts` | Mock provider now uses the shared `SaharaCommitInput` type. |
| `eslint.config.mjs` | Enforced `@typescript-eslint/no-unused-vars` with `^_` ignore patterns so intentional unused params are explicit. |
| `src/app/page.tsx` | Escaped raw `"` in JSX text (`react/no-unescaped-entities`). |
| `src/components/approvals/proposal-detail.tsx` | Added missing `workspaceId` effect dependency. |

## Alignment matrix

| File | Has Inline Types | Has .d.ts | Types Match Exports | Action Needed |
| --- | --- | --- | --- | --- |
| `src/**/*.ts` | Yes | Inferred (no `.d.ts` emitted, `noEmit`) | Yes | None |
| `src/**/*.tsx` | Yes | Inferred | Yes | None |
| `src/types/env.d.ts` | Yes (ambient) | Yes | Yes | Added |
| `next-env.d.ts` | Yes | Yes | n/a (framework) | None |
| `scripts/**/*.ts` | Yes | Inferred | Yes | Cleaned |
| `tests/**/*.ts` | Yes | Inferred | Yes | Aligned |
| `eslint.config.mjs` | n/a (config) | n/a | n/a | Lint rule hardened |

## Reproduce the clean type-check

```bash
npm ci
npm run typecheck   # tsc --noEmit  → Found 0 errors
npm run lint        # eslint .      → 0 problems
npm test            # vitest run    → 176 passing
npm run build       # next build
```

## Notes and constraints honored

- No `@ts-ignore` / `@ts-expect-error` was introduced; the one existing `as any`
  was replaced with a checked `Record<string, unknown>` narrowing.
- Public API signatures were not changed — only the optional-property *variance*
  was widened with `| undefined`, which is backward compatible for callers.
- No generated `.d.ts` files were committed; the project uses `noEmit: true`.
- The only new declaration file (`src/types/env.d.ts`) is hand-written and ambient.
