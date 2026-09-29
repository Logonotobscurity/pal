# Contradiction / Drift Register

## CON-001 — AfriSwitchCare split mismatch
Status: OPEN — P0.
The existing PAL benchmark methodology assumes train/test speaker-disjoint splitting. The current dataset card says AfriSwitchCare is a single evaluation-only test split.
Resolution: use the published test benchmark as an external evaluation set; remove unsupported train/test assumptions.

## CON-002 — Sahara endpoint drift
Status: OPEN — P1.
Historical project notes contain multiple endpoint forms.
Resolution: pin the exact endpoint from the current Sahara developer/onboarding docs and update .env.example plus benchmark docs together.

## CON-003 — Implementation vs verification
Status: OPEN — P0.
Implementation reports describe completed components, while current implementation status explicitly says benchmark run artifacts are not yet published and some integrations remain mocked.
Resolution: every capability gets implementation_state and verification_state.

## CON-004 — Cultural annotation strength vs validation state
Status: OPEN — P0.
PAL v0.1 contains detailed semantic/causal interpretations while labeling them preliminary.
Resolution: retain as hypotheses/scholar-derived notes until expert/community validation.

## CON-005 — Destructive policy semantics
Status: OPEN — P1.
The matrix describes destructive actions as requiring approval, but current evaluation rejects them in MVP.
Resolution: represent destructive as BLOCKED in current state until a separately tested destructive-action policy exists.

## CON-006 — Read auto-approval vs context sufficiency
Status: OPEN — P1.
Read operations may be low-risk, but insufficient/conflicting context is still blocked.
Resolution: add read-only clarification/data-gathering cases to distinguish information gathering from consequential action.

## CON-007 — Synthetic vs in-the-wild benchmarks
Status: OPEN — P1.
AfriSwitchCare is simulated clinical speech; AfriSwitch is in-the-wild speech. They must be reported separately by dataset, language and task.
