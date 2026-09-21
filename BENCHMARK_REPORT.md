# PAL — Public Benchmark Report

**Challenge:** Sahara CodeSwitch Africa Challenge 2026  
**Report status:** NOT RUN  
**Last updated:** 2026-09-21

## Public access

This report is intentionally stored in the public repository so a reviewer can open it without an account, permission request, or private-file access.

## Current status

No completed model-comparison benchmark run is published.

The declared comparison is:

- Intron Sahara
- Whisper Large-v3
- AfriSpeech-Whisper

Earlier numeric figures in planning material were targets and are not measured challenge results. They are therefore not reproduced here.

## Published methodology

See [docs/PAL_BENCHMARK.md](docs/PAL_BENCHMARK.md) for:

- dataset and evaluation protocol;
- WER/CER and code-switch metrics;
- critical-field extraction;
- semantic understanding;
- action quality;
- approval routing and safety metrics;
- reproduction instructions.

## Safety architecture

PAL separates model output from execution authority:

Speech → Meaning → Plan → Policy → Human Approval → Execute → Verify

External-write and financial actions require approval. Low-confidence critical fields are blocked from progressing to consequential actions.

## Dataset references

- [AfriSwitch](https://huggingface.co/datasets/intronhealth/AfriSwitch)
- [AfriSwitchCare](https://huggingface.co/datasets/intronhealth/AfriSwitchCare)

## Important reporting rule

Numeric benchmark claims will be added only after a completed, reproducible run with stored run artifacts and sample counts.

For the submission package, this file is the stable GitHub-hosted public report entry.
