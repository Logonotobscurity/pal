# Experiment Runbook

## Freeze inputs
Record:
- timestamp
- repository commit
- provider/model version
- dataset/config/version
- environment
- prompt/config hash

## Baseline first
Run the baseline under identical input and evaluation conditions before testing the proposed intervention.

## Failure is a first-class result
Record successes, false positives, false negatives, unknowns and evaluator disagreement.

## Preserve raw artifacts
Raw provider outputs and evaluator records are stored separately from derived metrics.

## Human sample review
Inspect representative success, failure, borderline and disagreement cases.

## Claim updates
A claim may move:
MODEL_HYPOTHESIS → OBSERVED_IN_RUN → VERIFIED
only when the verification method justifies the stronger status.

## Publication lint
Before reporting results confirm:
- exact n and denominator
- evaluation population
- dataset/version
- evaluator method
- subgroup coverage
- uncertainty where appropriate
- limitations
- no unsupported "state of the art" statement

## Artifact layout
runs/<YYYY-MM-DD>/<STREAM>/<RUN_ID>/

Expected:
config.json
inputs_manifest.json
raw_outputs.jsonl
metrics.json
error_analysis.md
claim_delta.md
limitations.md
