# wwhisper — PAL

**PAL — Meaning-to-Action Intelligence.** Voice-first agentic layer that
converts African code-switched speech into structured business meaning and
safe, reviewable workflows.

> Speak naturally. PAL understands the meaning, builds the work, and asks
> before it acts.

Built for the **Sahara CodeSwitch Africa Challenge** (submission: 15 Sep 2026).

## Challenge submission (start here)

**Full package:** [`SUBMISSION.md`](./SUBMISSION.md)  
**Repo:** https://github.com/Logonotobscurity/pal  
**Submit form:** https://forms.gle/RV43DXHAJCTYr98U7  
**Challenge site:** https://www.intron.io/compete/

## Source of truth

- `AGENTS.md` — permanent engineering rules
- `docs/PAL_ARCHITECTURE.md` — architecture specification (v2.0)
- `docs/PAL_DOMAIN_MODEL.md`, `docs/PAL_EXECUTION_PLAN.md`,
  `docs/PAL_BENCHMARK.md`, `docs/PAL_SECURITY.md`
- `SUBMISSION.md` — challenge deliverables package

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 ·
Zod · Vitest · ESLint · Supabase · Sahara voice · OpenAI / OpenRouter

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
confirms. **No LLM may directly execute an external side effect.**

---

## Sahara CodeSwitch Africa Challenge

**Status:** Pipeline operational (voice → meaning → plan → policy → approval → execution → verification)  
**Category:** Fintech / Telco / CX (SME ops)

### Datasets (official)

- [intronhealth/AfriSwitch](https://huggingface.co/datasets/intronhealth/AfriSwitch)
- [intronhealth/AfriSwitchCare](https://huggingface.co/datasets/intronhealth/AfriSwitchCare)
- [intronhealth/NigBench-MAMAI-Speech-QA](https://huggingface.co/datasets/intronhealth/NigBench-MAMAI-Speech-QA)

### Evaluation approach

Thesis: **Speech quality determines action quality.**

1. Transcription (WER, code-switch detection)
2. Critical field extraction (name, amount, date)
3. Semantic understanding (intent, entities)
4. Action quality (correct constrained workflows)
5. Safety (approval gate, provenance, zero unsupervised side effects)

Methodology: `docs/PAL_BENCHMARK.md`  
Results table template: `SUBMISSION.md` §4

### Model comparison (required ≥3 including Sahara)

| Model | Role |
|--------|------|
| Intron Sahara API | Primary code-switch STT |
| Whisper (e.g. large-v3 / medium) | Global baseline |
| AfriSpeech-Whisper or AssemblyAI / other | Third system |

### Responsible AI

See **SUBMISSION.md §5**. Summary: dataset consent terms; RLS tenancy; human approval for consequential actions; provenance chain; not for unsupervised high-risk automation.

### Deliverables checklist

- [x] Source code (this repo)
- [x] Documentation (architecture + benchmark + SUBMISSION.md)
- [x] Responsible AI statement (SUBMISSION.md)
- [ ] Benchmark numeric table (fill §4 before/with submit)
- [ ] Short prototype video
- [ ] Form submission (https://forms.gle/RV43DXHAJCTYr98U7)

---
