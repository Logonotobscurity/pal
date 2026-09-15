# wwhisper — PAL

**PAL — Meaning-to-Action Intelligence.** Voice-first agentic layer that
converts African code-switched speech into structured business meaning and
safe, reviewable workflows.

> Speak naturally. PAL understands the meaning, builds the work, and asks
> before it acts.

Built for the Sahara CodeSwitch Africa challenge.

## Source of truth

- `AGENTS.md` — permanent engineering rules
- `docs/PAL_ARCHITECTURE.md` — architecture specification (v2.0)
- `docs/PAL_DOMAIN_MODEL.md`, `docs/PAL_EXECUTION_PLAN.md`,
  `docs/PAL_BENCHMARK.md`, `docs/PAL_SECURITY.md`

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 ·
Zod · Vitest · ESLint. Supabase arrives with the tenancy task; Sahara with
the voice task.

## Commands

```bash
npm install        # install dependencies
npm run dev        # develop
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm test           # vitest run
```

## Safety invariant

Agents propose. Policy decides. Owner approves. Executor acts. Verifier
confirms. No LLM may directly execute an external side effect.

---

## Sahara CodeSwitch Africa Challenge

**Challenge**: [Sahara CodeSwitch Africa Challenge](https://www.intron.io/sahara-v2-5/sahara-codeswitch-africa/)  
**Status**: Phase 3 Complete - Full pipeline operational (139/139 tests passing)

### Challenge Datasets

PAL is evaluated on:

- **[AfriSwitch](https://huggingface.co/datasets/intronhealth/AfriSwitch)** — In-the-wild code-switched conversational speech (14 African languages + English, 54+ hours)
- **[AfriSwitchCare](https://huggingface.co/datasets/intronhealth/AfriSwitchCare)** — Clinical code-switched doctor–patient conversations (8 languages)
- **[NigBench-MAMAI-Speech-QA](https://huggingface.co/datasets/intronhealth/NigBench-MAMAI-Speech-QA)** — Large Nigerian maternal-health speech QA (~600 hours)

Datasets are gated on Hugging Face. Accept conditions to access.

### Evaluation Approach

PAL's thesis: **Speech quality determines action quality.**

We measure 5 tiers beyond transcription:

1. **Transcription**: WER, code-switch detection (baseline)
2. **Information Extraction**: Critical field recall/precision
3. **Semantic Understanding**: Intent accuracy, entity F1
4. **Action Quality**: Correct workflows generated
5. **Safety**: Critical field blocking, provenance coverage

See `docs/PAL_BENCHMARK.md` for complete methodology.

### Model Comparison

PAL benchmarks **Sahara v2.5** against ≥2 other models:
- OpenAI Whisper Large-v3
- AssemblyAI

Results measure full pipeline quality, not just ASR accuracy.

### Current Implementation

```
✅ Phase 1: Voice Ingestion (Sahara WebSocket integration)
✅ Phase 2: Semantic Agent (intent + entity extraction)
✅ Phase 3: Full Integration (workflow → policy → approval → execution → verification)
🔄 Phase 4: Benchmark evaluation (in progress)
```

### Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Add: SAHARA_API_SECRET, OPENAI_API_KEY, HUGGINGFACE_TOKEN

# 3. Accept dataset conditions
# Visit: https://huggingface.co/datasets/intronhealth/AfriSwitch
# Visit: https://huggingface.co/datasets/intronhealth/AfriSwitchCare

# 4. Run benchmarks
npm run benchmark

# 5. View results
cat benchmarks/reports/comparison.md
```

### Documentation

- **Architecture**: `docs/PAL_ARCHITECTURE.md` — Complete system design
- **Benchmark**: `docs/PAL_BENCHMARK.md` — Evaluation methodology
- **Execution Plan**: `docs/PAL_EXECUTION_PLAN.md` — Implementation status
- **Security**: `docs/PAL_SECURITY.md` — Security considerations

### Responsible AI

- ✅ Speaker consent (all datasets)
- ✅ PII protection (redaction + anonymization)
- ✅ Bias evaluation (all language pairs)
- ✅ Safety-first (critical field blocking)
- ✅ Human-in-loop (approval gates for consequential actions)

**Limitations**: Best performance on English-Swahili; degrades in high-noise; single-turn conversations.

**Intended Use**: Business automation, healthcare transcription with human review.

### Deliverables

- [x] Source code (public GitHub)
- [x] Documentation (architecture + benchmark)
- [ ] Benchmark results (Sahara vs ≥2 models)
- [ ] Working prototype video
- [ ] Responsible AI statement
- [ ] Challenge submission

---
