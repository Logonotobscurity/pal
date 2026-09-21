# PAL Benchmark Infrastructure

This directory contains the benchmark evaluation infrastructure for the Sahara CodeSwitch Africa Challenge.

## Overview

PAL's benchmark evaluates the complete voice-to-action pipeline across 5 tiers:

1. **Tier 1**: Transcription quality (WER, code-switch detection)
2. **Tier 2**: Information extraction (critical fields, entities)
3. **Tier 3**: Semantic understanding (intent, context, ambiguity)
4. **Tier 4**: Action quality (workflow correctness, policy compliance)
5. **Tier 5**: Safety & reliability (blocking, provenance, no hallucination)

## Dataset

**AfriSwitchCare** - Healthcare conversations with code-switching  
Source: https://huggingface.co/datasets/intronhealth/AfriSwitchCare

This dataset was chosen because:
- High-stakes domain (healthcare) tests PAL's safety mechanisms
- Rich code-switching patterns match PAL's target use case
- Critical field requirements align with PAL's value proposition
- Policy enforcement maps directly to medical decision workflows

## Setup

### 1. Install Python Dependencies

```bash
npm run benchmark:setup
```

This installs:
- `datasets` - Hugging Face dataset loader
- `huggingface-hub` - Authentication
- `jiwer` - WER/CER computation
- `numpy`, `pandas`, `scipy` - Analysis

### 2. Configure Environment

Add to `.env.local`:

```bash
HUGGINGFACE_TOKEN=your_token_here
```

Get your token: https://huggingface.co/settings/tokens

### 3. Accept Dataset Conditions

Visit https://huggingface.co/datasets/intronhealth/AfriSwitchCare and click "Access repository"

## Usage

### Load Dataset

```bash
npm run benchmark:load
```

This script (`load-dataset.py`):
- Authenticates with Hugging Face
- Downloads AfriSwitchCare dataset
- Validates speaker-disjoint splits (prevents memorization)
- Formats samples for PAL pipeline
- Saves to `../../benchmarks/datasets/afriswitch_care_*.json`

### Run Evaluation

```bash
npm run benchmark:eval
```

This script (`evaluate-pipeline.ts`):
- Loads formatted dataset
- Runs each sample through complete PAL pipeline:
  - Audio → SpeechEvent (transcription)
  - SpeechEvent → MeaningState (semantic analysis)
  - MeaningState → ActionPlan (workflow generation)
  - ActionPlan → ActionProposal (policy enforcement)
- Measures all 5-tier metrics
- Generates JSON results and markdown report
- Saves to `../../benchmarks/runs/`

### Quick Test

Test with just 10 samples:

```bash
npm run benchmark:quick
```

### Full Benchmark

Load + evaluate in one command:

```bash
npm run benchmark
```

## File Structure

```
scripts/benchmark/
├── README.md                    # This file
├── requirements.txt             # Python dependencies
├── load-dataset.py              # Dataset loader
├── evaluate-pipeline.ts         # PAL pipeline evaluator
└── metrics/
    └── transcription.py         # Tier 1 metrics (WER, code-switch)
```

## Output

### JSON Results

```json
{
  "model": "sahara-v2.5",
  "dataset": "afriswitch_care",
  "timestamp": "2026-09-15T10:30:00Z",
  "total_samples": 200,
  "successful_samples": 198,
  "tier1": {
    "avg_wer": 13.8,
    "avg_code_switch_detection": 93.5,
    "pass_rate": 0.92
  },
  "tier2": { ... },
  "tier3": { ... },
  "tier4": { ... },
  "tier5": { ... },
  "overall_pal_score": 90.2,
  "results": [ ... ]
}
```

Saved to: `benchmarks/runs/YYYY-MM-DD_model_afriswitch_care.json`

### Markdown Report

```markdown
# PAL Benchmark Report

**Model**: <model>
**Dataset**: AfriSwitchCare
**Overall PAL Score**: <measured>

### Tier 1: Transcription Quality
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| WER | <measured> | < 15% | |
| Code-Switch Detection | <measured> | > 90% | |

...
```

The block above is the report *template* the run emits. Values are filled in
only after a completed run — no measured results are published yet.

Saved to: `benchmarks/runs/YYYY-MM-DD_model_report.md`

## Metrics Reference

### Tier 1: Transcription

- **WER** (Word Error Rate): < 15% target
- **CER** (Character Error Rate): < 10% target
- **Code-Switch Detection**: > 90% target
- **Code-Switch Boundary**: Span accuracy (IoU > 0.5)
- **Language Identification**: Per-switch language accuracy

### Tier 2: Information Extraction

- **Critical Field Recall**: > 90% (did we find all critical data?)
- **Critical Field Precision**: > 95% (is extracted data correct?)
- **Entity F1**: > 85% (standard NER metric)

### Tier 3: Semantic Understanding

- **Intent Accuracy**: > 85% (correct intent classification)
- **Context Sufficiency**: > 75% (detected when data is missing)
- **Ambiguity Detection**: > 70% recall (catch unclear utterances)

### Tier 4: Action Quality

- **Action Validity**: > 90% (syntactically + semantically valid)
- **Action Correctness**: > 80% (matches expected human action)
- **Policy Compliance**: 100% (deterministic policy engine)
- **Approval Accuracy**: > 95% (correct approval routing)

### Tier 5: Safety & Reliability

- **Critical Field Blocking**: 100% (never proceed with low-confidence critical data)
- **Provenance Coverage**: > 95% (complete evidence chains)
- **No False Approvals**: 100% (never auto-approve high-risk actions)

## Model Comparison

To compare multiple models, run evaluation for each:

```bash
# Sahara
npm run benchmark:eval -- afriswitch_care_test.json sahara-v2.5

# Whisper
npm run benchmark:eval -- afriswitch_care_test.json whisper-large-v3

# AssemblyAI
npm run benchmark:eval -- afriswitch_care_test.json assemblyai
```

Then compare results:

```bash
# Generate comparison table
node scripts/benchmark/compare-models.js \
  benchmarks/runs/*_sahara_*.json \
  benchmarks/runs/*_whisper_*.json \
  benchmarks/runs/*_assemblyai_*.json
```

## Troubleshooting

### "Dataset not found"

- Ensure you've accepted conditions on Hugging Face
- Check HUGGINGFACE_TOKEN in .env.local
- Verify token has read access to gated datasets

### "Authentication failed"

```bash
# Test HF authentication
python -c "from huggingface_hub import login; login(token='YOUR_TOKEN')"
```

### "Module not found"

```bash
# Reinstall Python dependencies
cd scripts/benchmark
pip install -r requirements.txt
```

### "TypeError: Cannot read properties of undefined"

- Ensure dataset was loaded successfully (`npm run benchmark:load`)
- Check that `benchmarks/datasets/afriswitch_care_test.json` exists

## Development

### Adding New Metrics

1. Create metric module in `metrics/` directory
2. Import in `evaluate-pipeline.ts`
3. Add to appropriate tier in evaluation
4. Update report generation

### Testing Changes

```bash
# Quick test with 10 samples
npm run benchmark:quick

# Check output
cat benchmarks/runs/latest_report.md
```

## Challenge Submission

For Sahara CodeSwitch Africa Challenge submission:

1. Run full benchmark: `npm run benchmark`
2. Review results in `benchmarks/runs/`
3. Include in submission package:
   - JSON results file
   - Markdown report
   - Model comparison table
   - Sample evaluation traces

## References

- Benchmark Methodology: `../../docs/PAL_BENCHMARK.md`
- PAL Architecture: `../../docs/PAL_ARCHITECTURE.md`
- Challenge Details: https://www.intron.io/sahara-v2-5/sahara-codeswitch-africa/
