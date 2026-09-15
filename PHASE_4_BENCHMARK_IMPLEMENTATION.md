# Phase 4.1: Benchmark Infrastructure Implementation

**Date**: September 15, 2026  
**Status**: Infrastructure Complete, Ready for Dataset Loading  
**Challenge**: [Sahara CodeSwitch Africa Challenge](https://www.intron.io/sahara-v2-5/sahara-codeswitch-africa/)

---

## Summary

Implemented complete benchmark evaluation infrastructure for PAL pipeline using **AfriSwitchCare** dataset (healthcare domain). Infrastructure supports 5-tier evaluation methodology from transcription quality through safety & reliability.

---

## What Was Built

### 1. Dataset Loader (`scripts/benchmark/load-dataset.py`)

Python script that:
- Authenticates with Hugging Face using `HUGGINGFACE_TOKEN`
- Loads AfriSwitchCare dataset (`intronhealth/AfriSwitchCare`)
- Validates speaker-disjoint splits (prevents memorization)
- Formats samples for PAL pipeline evaluation
- Saves processed datasets to `benchmarks/datasets/`

**Key Features**:
- Gated dataset access with HF authentication
- Speaker leakage detection
- Critical field extraction framework
- Healthcare domain metadata preservation

### 2. Pipeline Evaluator (`scripts/benchmark/evaluate-pipeline.ts`)

TypeScript script that:
- Loads formatted dataset samples
- Runs complete PAL pipeline on each sample:
  - Audio → SpeechEvent (transcription)
  - SpeechEvent → MeaningState (semantic extraction)
  - MeaningState → ActionPlan (workflow generation)
  - ActionPlan → ActionProposal (policy enforcement)
- Measures all 5-tier metrics
- Generates JSON results and markdown reports

**Evaluation Tiers**:
1. **Tier 1**: WER, CER, code-switch detection, language identification
2. **Tier 2**: Critical field recall/precision, entity F1
3. **Tier 3**: Intent accuracy, context sufficiency, ambiguity detection
4. **Tier 4**: Action validity, correctness, policy compliance, approval accuracy
5. **Tier 5**: Critical field blocking, provenance coverage, hallucination prevention

**Current Status**: Framework complete, full pipeline integration pending

### 3. Transcription Metrics (`scripts/benchmark/metrics/transcription.py`)

Python module implementing Tier 1 metrics:
- `compute_wer()` - Word Error Rate using jiwer
- `compute_cer()` - Character Error Rate
- `evaluate_code_switches()` - Detection, boundary (IoU), language accuracy
- `compute_code_switch_density()` - Switches per minute
- `evaluate_transcription()` - Comprehensive Tier 1 evaluation

### 4. NPM Scripts (`package.json`)

```bash
npm run benchmark:setup    # Install Python dependencies
npm run benchmark:load     # Load and format AfriSwitchCare
npm run benchmark:eval     # Run full PAL pipeline evaluation
npm run benchmark:quick    # Quick test (10 samples only)
npm run benchmark          # Complete flow (load + eval)
```

### 5. Documentation

- `scripts/benchmark/README.md` - Complete setup and usage guide
- `docs/PAL_BENCHMARK.md` - Updated with AfriSwitchCare-only focus
- `PHASE_4_BENCHMARK_IMPLEMENTATION.md` - This document

---

## Dataset: AfriSwitchCare

**Source**: https://huggingface.co/datasets/intronhealth/AfriSwitchCare  
**Access**: Gated (requires HF token and accepting conditions)

**Why AfriSwitchCare?**

1. **High-stakes domain**: Healthcare requires precision - errors have real consequences
2. **Rich code-switching**: Natural multilingual doctor-patient conversations
3. **Critical field testing**: Names, medications, dosages, dates must be exact
4. **Policy enforcement alignment**: Medical decisions map to PAL's approval gates
5. **Challenge relevance**: Demonstrates practical value of superior code-switch handling

**Dataset Schema** (to be confirmed after loading):
- Audio files (medical consultations)
- Reference transcripts with code-switch annotations
- Language span markers
- Speaker IDs (for split validation)
- Metadata (duration, language pairs, code-switch density)

---

## File Structure

```
wwhisper/
├── scripts/
│   └── benchmark/
│       ├── README.md                    # Setup and usage guide
│       ├── requirements.txt             # Python dependencies
│       ├── load-dataset.py              # AfriSwitchCare loader
│       ├── evaluate-pipeline.ts         # PAL pipeline evaluator
│       └── metrics/
│           └── transcription.py         # Tier 1 metrics
│
├── benchmarks/                          # Created on first run
│   ├── datasets/
│   │   ├── afriswitch_care_train.json
│   │   ├── afriswitch_care_test.json
│   │   └── afriswitch_care_validation.json
│   │
│   └── runs/
│       ├── YYYY-MM-DD_model_afriswitch_care.json
│       └── YYYY-MM-DD_model_report.md
│
├── docs/
│   └── PAL_BENCHMARK.md                 # Updated benchmark methodology
│
└── package.json                         # Updated with benchmark scripts
```

---

## Dependencies Added

### Python (via `requirements.txt`)
- `datasets>=2.14.0` - Hugging Face dataset loader
- `huggingface-hub>=0.19.0` - Authentication
- `jiwer>=3.0.0` - WER/CER computation
- `numpy>=1.24.0` - Numerical operations
- `pandas>=2.0.0` - Data analysis
- `scipy>=1.11.0` - Scientific computing

### Node.js (via `package.json`)
- `tsx` - TypeScript executor (dev dependency)

---

## Environment Setup

### Required Environment Variables

Add to `.env.local`:

```bash
# Already configured
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...

# New for Phase 4
HUGGINGFACE_TOKEN=your_huggingface_token_here

# Optional for model comparison
SAHARA_API_SECRET=...              # For Sahara v2.5
OPENAI_API_KEY=...                 # For semantic/workflow agents
ASSEMBLYAI_API_KEY=...             # For comparison model (optional)
```

---

## Next Steps

### Immediate (Required for Benchmark Execution)

1. **Accept Dataset Conditions** (USER ACTION REQUIRED)
   - Visit: https://huggingface.co/datasets/intronhealth/AfriSwitchCare
   - Click "Access repository"
   - Accept conditions
   - Verify access with HF token

2. **Install Python Dependencies**
   ```bash
   npm run benchmark:setup
   ```

3. **Load AfriSwitchCare Dataset**
   ```bash
   npm run benchmark:load
   ```
   
   This will:
   - Download dataset from Hugging Face
   - Validate speaker-disjoint splits
   - Format samples for PAL pipeline
   - Save to `benchmarks/datasets/`

4. **Inspect Dataset Schema**
   After loading, review actual schema:
   ```bash
   cat benchmarks/datasets/afriswitch_care_test.json | head -n 50
   ```
   
   Update `extract_critical_fields()` in `load-dataset.py` based on actual fields

### Phase 4.2 Implementation

Once dataset is loaded and inspected:

1. **Implement Sahara Transcription Adapter**
   - Connect to Sahara WebSocket API
   - Stream audio files
   - Parse SpeechEvent output
   - Measure Tier 1 metrics

2. **Integrate Full PAL Pipeline**
   - Wire up semantic agent with OpenAI
   - Connect workflow agent
   - Enable policy engine
   - Measure Tiers 2-5

3. **Model Comparison**
   - Implement Whisper adapter (optional)
   - Implement AssemblyAI adapter (optional)
   - Run all models on same test set
   - Generate comparison table

4. **Report Generation**
   - Visualization scripts (WER comparison, tier performance)
   - Challenge submission package
   - Responsible AI statement

---

## Current Limitations

### 1. Mock Transcription

Currently using mock `SpeechEvent` data. Real Sahara integration needed for actual evaluation.

**TODO**: Implement Sahara adapter in `evaluate-pipeline.ts`:
```typescript
async function saharaTranscribe(audioPath: string): Promise<SpeechEvent> {
  // 1. Load audio file
  // 2. Connect to Sahara WebSocket
  // 3. Stream audio chunks
  // 4. Parse streaming response
  // 5. Construct SpeechEvent
}
```

### 2. Semantic/Workflow Integration

Full PAL pipeline integration commented out pending OpenAI configuration.

**TODO**: Uncomment and configure in `evaluateSample()`:
```typescript
const semanticAgent = new SemanticAgent({
  extractor: createOpenAISemanticExtractor(),
  businessContext: sample.domain,
});
```

### 3. Critical Field Extraction

`extract_critical_fields()` in `load-dataset.py` returns empty list pending actual dataset inspection.

**TODO**: After loading dataset, implement based on actual schema:
```python
def extract_critical_fields(example: Dict[str, Any]) -> List[Dict[str, Any]]:
    fields = []
    
    # Extract based on actual AfriSwitchCare schema
    if 'patient_name' in example:
        fields.append({
            'field': 'patient_name',
            'value': example['patient_name'],
            'type': 'PERSON',
        })
    
    # Add medication, dosage, symptoms, etc.
    return fields
```

---

## Testing

### Unit Tests

All existing tests still passing:

```
✓ 176 tests passing
✓ Typecheck clean
✓ Lint clean
```

### Benchmark Scripts

To test infrastructure:

```bash
# Quick smoke test (10 samples)
npm run benchmark:quick

# Check output
cat benchmarks/runs/latest_report.md
```

---

## Documentation Updates

### Updated Files

1. **`docs/PAL_BENCHMARK.md`**
   - Removed AfriSwitch references
   - Focused exclusively on AfriSwitchCare
   - Added "Why AfriSwitchCare?" section
   - Updated code examples
   - Updated expected output
   - Fixed dataset URLs

2. **`scripts/benchmark/README.md`**
   - Complete setup guide
   - Usage examples
   - Troubleshooting section
   - Metrics reference
   - Challenge submission checklist

3. **`package.json`**
   - Added benchmark scripts
   - Added tsx dependency

---

## Success Criteria

### Infrastructure Complete ✅

- [x] Dataset loader implemented
- [x] Pipeline evaluator framework ready
- [x] Tier 1 metrics implemented
- [x] NPM scripts configured
- [x] Documentation complete
- [x] All tests passing
- [x] Typecheck clean

### Ready for Execution (Pending)

- [ ] User accepts AfriSwitchCare conditions on HF
- [ ] Python dependencies installed
- [ ] Dataset loaded and inspected
- [ ] Critical field extraction updated for actual schema
- [ ] Sahara transcription adapter implemented
- [ ] Full PAL pipeline integration complete

---

## Risk Assessment

### Low Risk ✅

- Infrastructure design is sound
- Evaluation framework is comprehensive
- Documentation is complete
- Tests are passing

### Medium Risk ⚠️

- **Dataset access**: Requires user action (accept HF conditions)
- **Schema assumptions**: Need to validate actual AfriSwitchCare schema
- **API integration**: Sahara/OpenAI adapters need testing

### Mitigation

- Clear user instructions for dataset access
- Flexible schema handling in loader
- Mock implementations for testing without API keys

---

## Timeline Estimate

### Completed Today (2-3 hours)
- [x] Infrastructure design
- [x] Dataset loader implementation
- [x] Evaluation framework
- [x] Metrics module
- [x] Documentation
- [x] Testing

### Next Session (3-4 hours)
- [ ] Accept dataset conditions (5 minutes)
- [ ] Install dependencies (5 minutes)
- [ ] Load dataset (10 minutes)
- [ ] Inspect schema (15 minutes)
- [ ] Update critical field extraction (30 minutes)
- [ ] Implement Sahara adapter (2 hours)
- [ ] Integration testing (1 hour)

### Phase 4.2 (Full benchmark execution)
- [ ] Run full evaluation (6-8 hours with API rate limits)
- [ ] Model comparison (if needed)
- [ ] Report generation
- [ ] Challenge submission preparation

---

## References

- **Challenge**: https://www.intron.io/sahara-v2-5/sahara-codeswitch-africa/
- **Dataset**: https://huggingface.co/datasets/intronhealth/AfriSwitchCare
- **Benchmark Methodology**: `docs/PAL_BENCHMARK.md`
- **Architecture**: `docs/PAL_ARCHITECTURE.md`
- **Execution Plan**: `docs/PAL_EXECUTION_PLAN.md`

---

**Status**: Phase 4.1 infrastructure complete ✅  
**Next**: User action required - accept AfriSwitchCare dataset conditions on Hugging Face

