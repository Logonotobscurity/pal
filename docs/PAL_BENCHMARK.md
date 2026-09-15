# PAL Benchmark Methodology

> **Status: ACTIVE.** Defines how PAL's voice-to-action pipeline is measured for the Sahara CodeSwitch Africa Challenge and production evaluation.

**Target Challenge**: [Sahara CodeSwitch Africa Challenge](https://www.intron.io/sahara-v2-5/sahara-codeswitch-africa/)  
**Benchmark Version**: 1.0  
**Last Updated**: September 15, 2026

---

## Overview

PAL's benchmark measures the **full transformation quality** from code-switched speech to actionable business outcomes, not just transcription accuracy.

### The PAL Thesis

> **Speech quality determines action quality.**

We evaluate the entire pipeline:

```
Speech Audio
    ↓
Transcription (WER, code-switch accuracy)
    ↓
Critical Information Extraction (precision/recall)
    ↓
Semantic Understanding (intent accuracy, entity F1)
    ↓
Business State (field correctness, provenance)
    ↓
Workflow Generation (action validity, safety)
    ↓
Policy Enforcement (approval correctness)
    ↓
Action Outcome (task completion rate)
```

Traditional benchmarks stop at transcription. PAL measures whether the **right action** was taken.

---

## Primary Dataset

### AfriSwitchCare (Healthcare Domain)

**Source**: [Hugging Face - intronhealth/AfriSwitchCare](https://huggingface.co/datasets/intronhealth/AfriSwitchCare)  
**Access**: Gated (accept conditions on HF)  
**Description**: Clinical conversations with code-switching, medical terminology, and privacy-sensitive content

**Domain**: Healthcare consultations, patient-doctor conversations  
**Special Considerations**:
- Medical terminology accuracy
- Privacy/PII handling
- Critical information extraction (symptoms, medications, dates)
- Safety-critical fields

**Use Case**: High-stakes PAL deployment where errors have consequences

**Key Metrics**:
- Medical entity extraction F1
- Critical field confidence scores
- Safety blocking rate (when uncertain)
- Action proposal correctness

**Why AfriSwitchCare?**

AfriSwitchCare is the ideal dataset for evaluating PAL because:

1. **High-stakes domain**: Healthcare requires precision - errors have real consequences
2. **Code-switching patterns**: Matches PAL's target use case (African multilingual business contexts)
3. **Critical field extraction**: Tests PAL's core value proposition (safe extraction of business-critical data)
4. **Policy enforcement testing**: Medical decisions map directly to PAL's approval gates
5. **Sahara Challenge alignment**: Demonstrates practical value of superior code-switch handling

---

## Benchmark Metrics

### Tier 1: Transcription Quality (ASR Baseline)

Standard speech-to-text metrics to establish baseline:

| Metric | Definition | Target | Notes |
|--------|------------|--------|-------|
| **WER** | Word Error Rate | < 15% | Lower is better |
| **CER** | Character Error Rate | < 10% | Useful for morphologically rich languages |
| **Code-Switch Detection** | Accuracy of language span detection | > 90% | PAL's core capability |
| **Code-Switch Density** | Switches per utterance | Measured | Metadata for analysis |
| **Language Pair F1** | Per-pair identification accuracy | > 85% | By language combination |

### Tier 2: Information Extraction

PAL-specific: did critical business information survive transcription?

| Metric | Definition | Target | Notes |
|--------|------------|--------|-------|
| **Critical Field Recall** | % of ground-truth critical fields extracted | > 90% | Names, amounts, dates, negations |
| **Critical Field Precision** | % of extracted fields that are correct | > 95% | False positives are dangerous |
| **Entity F1** | Standard NER metric | > 85% | Person, organization, location, date, money |
| **Negation Accuracy** | Correct handling of "not", "no", "never" | > 95% | Safety-critical |
| **Numeric Accuracy** | Correct amounts, dates, times | > 98% | Zero tolerance for financial errors |

### Tier 3: Semantic Understanding

Did PAL understand **meaning**, not just words?

| Metric | Definition | Target | Notes |
|--------|------------|--------|-------|
| **Intent Accuracy** | % of correctly identified intents | > 85% | payment_request, reminder, query, etc. |
| **Constraint Detection** | % of constraints correctly identified | > 80% | "not before 9am", "if balance > X" |
| **Ambiguity Detection** | % of ambiguous utterances flagged | > 70% | Recall (catch ambiguity) |
| **Ambiguity Precision** | % of flags that are truly ambiguous | > 60% | Don't over-flag |
| **Context Sufficiency** | % correct insufficient/conflicting flags | > 75% | Clarification trigger |

### Tier 4: Action Quality (End-to-End)

Did PAL propose the **correct action** that a human would take?

| Metric | Definition | Target | Notes |
|--------|------------|--------|-------|
| **Action Validity** | % of generated actions that are valid | > 90% | Syntactically and semantically valid |
| **Action Correctness** | % of actions matching ground truth | > 80% | Human judgment |
| **Policy Compliance** | % of actions correctly classified by risk | 100% | No financial action without approval |
| **Approval Accuracy** | % of approval requirements correctly determined | > 95% | Safety gate effectiveness |
| **False Approval Rate** | % of actions incorrectly auto-approved | < 1% | CRITICAL: no dangerous auto-approvals |
| **Task Completion Rate** | % of end-to-end successful outcomes | > 75% | Real-world success metric |

### Tier 5: Safety & Reliability

PAL must fail safely:

| Metric | Definition | Target | Notes |
|--------|------------|--------|-------|
| **Critical Field Blocking** | % of low-confidence critical fields blocked | 100% | Never proceed with uncertain recipient/amount |
| **Hallucination Rate** | % of actions with invented information | < 2% | LLM-generated false facts |
| **Provenance Coverage** | % of fields with complete evidence chain | > 95% | Auditability |
| **Confidence Calibration** | Correlation between confidence and correctness | > 0.7 | Is model confidence trustworthy? |

---

## Evaluation Protocol

### Phase 1: Dataset Preparation

```python
from datasets import load_dataset

# Load AfriSwitchCare dataset (requires HF authentication)
afriswitch_care = load_dataset("intronhealth/AfriSwitchCare", use_auth_token=True)

# Split strategy: speaker-disjoint train/test
# Never allow same speaker in both sets (prevents memorization)
train_speakers = set(afriswitch_care['train']['speaker_id'])
test_speakers = set(afriswitch_care['test']['speaker_id'])
assert train_speakers.isdisjoint(test_speakers), "Speaker leakage detected!"

# Create PAL evaluation format
def format_for_pal(example):
    return {
        "audio_path": example["audio"],
        "reference_transcript": example["transcript"],
        "language_spans": example["language_spans"],
        "code_switches": example["code_switches"],
        "critical_fields": extract_critical_fields(example),
        "expected_intent": example.get("intent"),
        "expected_action": example.get("action"),
        "domain": "healthcare"
    }

eval_set = afriswitch_care['test'].map(format_for_pal)
```

### Phase 2: Model Comparison

Test **Sahara vs ≥2 other models** (Challenge requirement):

```python
models = [
    {
        "name": "Sahara v2.5",
        "provider": "sahara",
        "endpoint": "wss://api.sahara.ai/v1/stream",
    },
    {
        "name": "OpenAI Whisper Large-v3",
        "provider": "whisper",
        "model": "large-v3",
    },
    {
        "name": "AssemblyAI",
        "provider": "assemblyai",
        "endpoint": "https://api.assemblyai.com/v2",
    },
]

results = {}
for model in models:
    results[model["name"]] = evaluate_model(model, eval_set)
```

### Phase 3: Full Pipeline Evaluation

Run complete PAL pipeline for each model:

```
1. Audio → SpeechEvent (transcription + code-switch metadata)
2. SpeechEvent → MeaningState (semantic extraction)
3. MeaningState → ActionPlan (workflow generation)
4. ActionPlan → ActionProposal (policy enforcement)
5. ActionProposal → Approval Decision (safety check)
6. (Optional) Execute with mock executors
7. (Optional) Verify outcomes
```

**Evaluation Script**:

```python
async def evaluate_pal_pipeline(audio_sample, model_config):
    # Phase 1: Transcription
    speech_event = await transcribe_audio(
        audio_sample["audio_path"],
        model=model_config
    )
    
    # Measure Tier 1 metrics
    wer = compute_wer(speech_event.transcript, audio_sample["reference_transcript"])
    code_switch_accuracy = evaluate_code_switches(
        speech_event.codeSwitch,
        audio_sample["code_switches"]
    )
    
    # Phase 2: Semantic Extraction
    meaning_state = await semantic_agent.analyze(speech_event)
    
    # Measure Tier 2 metrics
    critical_field_metrics = evaluate_critical_fields(
        meaning_state,
        audio_sample["critical_fields"]
    )
    entity_f1 = evaluate_entities(
        meaning_state.entities,
        audio_sample["expected_entities"]
    )
    
    # Measure Tier 3 metrics
    intent_correct = (meaning_state.intent == audio_sample["expected_intent"])
    context_sufficient = (meaning_state.contextSufficiency == "sufficient")
    
    # Phase 3: Workflow Generation
    action_plan = await workflow_agent.generate(meaning_state)
    
    # Phase 4: Policy Enforcement
    action_proposal = await policy_engine.evaluate(action_plan)
    
    # Measure Tier 4 metrics
    action_valid = validate_action(action_proposal)
    action_correct = compare_actions(
        action_proposal,
        audio_sample["expected_action"]
    )
    approval_correct = (
        action_proposal.requiresApproval ==
        audio_sample["expected_requires_approval"]
    )
    
    # Measure Tier 5 metrics
    critical_fields_blocked = check_critical_field_blocking(
        meaning_state,
        action_proposal
    )
    has_provenance = all(
        field in meaning_state.evidenceRefs
        for field in extract_fields(action_proposal)
    )
    
    return {
        "wer": wer,
        "code_switch_accuracy": code_switch_accuracy,
        "critical_field_recall": critical_field_metrics["recall"],
        "critical_field_precision": critical_field_metrics["precision"],
        "entity_f1": entity_f1,
        "intent_accuracy": int(intent_correct),
        "action_validity": int(action_valid),
        "action_correctness": int(action_correct),
        "approval_accuracy": int(approval_correct),
        "critical_blocking": int(critical_fields_blocked),
        "provenance_coverage": int(has_provenance),
    }
```

### Phase 4: Healthcare-Specific Evaluation (AfriSwitchCare)

AfriSwitchCare is our primary evaluation dataset, chosen for its:
- **High-stakes domain**: Healthcare errors have real consequences
- **Rich code-switching**: Natural multilingual doctor-patient conversations
- **Critical field requirements**: Names, medications, dosages, dates must be exact
- **Policy enforcement testing**: Maps directly to PAL's approval gates

```python
# Healthcare domain evaluation with PAL pipeline
healthcare_eval = evaluate_pal_pipeline(
    afriswitch_care['test'],
    model_config,
    domain="healthcare"
)

# Additional healthcare metrics
healthcare_metrics = {
    "medical_entity_f1": evaluate_medical_entities(healthcare_eval),
    "pii_handling": check_pii_redaction(healthcare_eval),
    "safety_blocking_rate": compute_safety_blocks(healthcare_eval),
    "symptom_extraction_accuracy": evaluate_symptoms(healthcare_eval),
    "medication_accuracy": evaluate_medications(healthcare_eval),
    "date_time_precision": evaluate_temporal_entities(healthcare_eval),
}

print("AfriSwitchCare Healthcare Evaluation")
print(f"  Medical Entity F1: {healthcare_metrics['medical_entity_f1']:.1%}")
print(f"  Safety Blocking Rate: {healthcare_metrics['safety_blocking_rate']:.1%}")
print(f"  Medication Accuracy: {healthcare_metrics['medication_accuracy']:.1%}")
```

**Key Healthcare Insights**:

1. **Code-switch impact on medical terms**: How does language mixing affect medication/symptom extraction?
2. **Critical field blocking effectiveness**: Does PAL catch low-confidence medical data?
3. **Approval routing for medical decisions**: Are high-risk actions properly flagged?
4. **Evidence chain completeness**: Can we trace every medical decision back to utterance?

---

## Reproduction Instructions

### Environment Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local

# Required keys:
# - SAHARA_API_SECRET (for Sahara model)
# - OPENAI_API_KEY (for semantic/workflow agents)
# - ASSEMBLYAI_API_KEY (for comparison model)
# - HUGGINGFACE_TOKEN (for dataset access)

# 3. Accept dataset conditions on Hugging Face
# Visit: https://huggingface.co/datasets/intronhealth/AfriSwitchCare
# Click "Access repository" and accept terms

# 4. Install Python dependencies (for dataset loading)
pip install datasets huggingface_hub jiwer
```

### Running Benchmarks

```bash
# Install Python dependencies for dataset loading
npm run benchmark:setup

# Load and prepare AfriSwitchCare dataset
npm run benchmark:load

# Run full PAL pipeline evaluation
npm run benchmark:eval

# Quick smoke test (10 samples only)
npm run benchmark:quick

# Complete benchmark (load + evaluate)
npm run benchmark
```

### Expected Output

```
PAL Benchmark Results
=====================

Model: Sahara v2.5
Dataset: AfriSwitchCare (n=200)

Tier 1: Transcription
  WER: 13.8% ✓
  Code-Switch Detection: 93.5% ✓
  Language Pair F1: 91.2% ✓

Tier 2: Information Extraction (Healthcare)
  Critical Field Recall: 92.1% ✓
  Critical Field Precision: 97.2% ✓
  Medical Entity F1: 88.4% ✓

Tier 3: Semantic Understanding
  Intent Accuracy: 87.8% ✓
  Constraint Detection: 84.3% ✓
  Ambiguity Detection: 76.1% ✓

Tier 4: Action Quality
  Action Validity: 93.4% ✓
  Action Correctness: 83.9% ✓
  Approval Accuracy: 98.1% ✓

Tier 5: Safety (Critical for Healthcare)
  Critical Field Blocking: 100.0% ✓
  Provenance Coverage: 97.8% ✓
  No False Approvals: 100.0% ✓

Overall PAL Score: 90.2% (PASS)
```

---

## Model Comparison Format

For Sahara Challenge submission, provide comparison table:

| Metric | Sahara v2.5 | Whisper Large-v3 | AssemblyAI | Winner |
|--------|-------------|------------------|------------|--------|
| WER | 12.3% | 15.7% | 14.1% | Sahara |
| Code-Switch Accuracy | 94.2% | 82.3% | 86.7% | Sahara |
| Critical Field Recall | 91.5% | 78.2% | 81.9% | Sahara |
| Intent Accuracy | 86.4% | 79.1% | 82.3% | Sahara |
| Action Correctness | 81.7% | 68.4% | 72.1% | Sahara |
| **Overall (PAL Score)** | **88.4%** | **76.9%** | **79.8%** | **Sahara** |

---

## Reporting & Storage

### Results Location

```
benchmarks/
├── runs/
│   ├── 2026-09-15_sahara_afriswitch_care.json
│   ├── 2026-09-15_whisper_afriswitch_care.json
│   └── 2026-09-15_assemblyai_afriswitch_care.json
│
├── reports/
│   ├── comparison_2026-09-15.md
│   ├── visualizations/
│   │   ├── wer_comparison.png
│   │   └── pipeline_performance.png
│   └── challenge_submission.pdf
│
└── datasets/
    └── afriswitch_care_test.json
```

### Regression Detection

```python
# Compare against baseline
baseline = load_benchmark_run("benchmarks/runs/baseline.json")
current = load_benchmark_run("benchmarks/runs/current.json")

for metric in CRITICAL_METRICS:
    delta = current[metric] - baseline[metric]
    threshold = REGRESSION_THRESHOLDS[metric]
    
    if delta < -threshold:
        raise RegressionError(
            f"{metric} regressed by {abs(delta):.1%} "
            f"(threshold: {threshold:.1%})"
        )
```

**Regression Thresholds**:
- Critical metrics (safety): 0% tolerance
- Core metrics (WER, F1): 2% tolerance
- Secondary metrics: 5% tolerance

---

## Responsible AI Statement

For Sahara Challenge submission:

### Ethical Considerations

1. **Speaker Consent**: All datasets used have explicit speaker consent
2. **PII Protection**: Healthcare data is anonymized; PAL redacts PII in logs
3. **Bias Evaluation**: Performance measured across all language pairs
4. **Error Analysis**: Failure modes documented and categorized
5. **Safety First**: Critical field blocking prevents dangerous actions

### Limitations

1. **Domain Adaptation**: Trained primarily on business/healthcare conversations
2. **Language Coverage**: Best performance on English-Swahili; varies by pair
3. **Noise Sensitivity**: Performance degrades in high-noise environments
4. **Context Window**: Limited to single-turn interactions in MVP

### Intended Use

- **Recommended**: Business automation, healthcare transcription with human review
- **Not Recommended**: Fully autonomous financial decisions, emergency medical diagnosis

---

## Challenge Deliverables Checklist

For [Sahara CodeSwitch Africa Challenge](https://www.intron.io/sahara-v2-5/sahara-codeswitch-africa/):

- [ ] Problem/solution description
- [ ] Working prototype video demonstration
- [ ] Source code repository (public GitHub)
- [ ] Documentation (this file + architecture docs)
- [ ] Benchmark results (Sahara vs ≥2 other models)
- [ ] Responsible AI statement (see above)
- [ ] Dataset evaluation on AfriSwitch + AfriSwitchCare

---

## References

- [Sahara CodeSwitch Africa Challenge](https://www.intron.io/sahara-v2-5/sahara-codeswitch-africa/)
- [AfriSwitchCare Dataset](https://huggingface.co/datasets/intronhealth/AfriSwitchCare)
- PAL Architecture: `docs/PAL_ARCHITECTURE.md`
- PAL Execution Plan: `docs/PAL_EXECUTION_PLAN.md`

---

**Benchmark Version**: 1.0  
**Last Updated**: September 15, 2026  
**Status**: Ready for Challenge Evaluation
