# RN-02 — PAL Cultural Collapse Benchmark

Objective: test whether explicit cultural/contextual representation improves interpretation and deployment appropriateness beyond lexical or semantic retrieval.

## Conditions
A zero-shot LLM
B literal-translation + LLM
C semantic retrieval
D culturalized-naive control
E PAL contextual retrieval/policy

Do not assume any condition wins.

## Test strata
- literal-vs-pragmatic meaning
- discourse position
- relational/power context
- false cultural cue
- Yoruba-English code-switch
- Nigerian Pidgin paraphrase
- exception/boundary conditions
- refusal-required context
- regional/variant disagreement

## Metrics
- interpretation correctness
- culturally salient frame recovery
- discourse alignment
- relational appropriateness
- evidence coverage
- context sufficiency
- clarification quality
- inappropriate deployment
- over-culturalization
- refusal precision/recall

## Required reporting split
1. item quality
2. set completeness
3. ontology coverage
4. cultural salience

A high average score cannot compensate for systematic failure on culturally decisive cases.

## Ten-case pilot
Create ten hand-reviewed challenge cases where a native speaker can dispute:
- literal reading
- generic English analogy
- moralization
- power/register mismatch
- discourse-position mismatch

Only expand the benchmark after the pilot produces a stable error taxonomy.

## Provenance rule
PAL v0.1 annotations are preliminary; they are not publication-ready cultural facts without independent validation.
