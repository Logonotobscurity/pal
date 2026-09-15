# Sahara CodeSwitch Africa Challenge — Submission Package

**Project:** PAL (Meaning-to-Action Intelligence)  
**Repo:** https://github.com/Logonotobscurity/pal  
**Deadline:** 15 September 2026, 23:59 GMT  
**Category:** Fintech / Telco / Customer Experience (SME ops) — also Other High-Impact

---

## 1. Problem & Solution

### Problem
Africans rarely speak one language at a time. SME owners and operators issue voice instructions that mix English with Yoruba, Igbo, Hausa, Swahili, and others. Generic speech systems drop critical fields (names, amounts, deadlines). Fully autonomous agents then act on incomplete meaning — a safety failure in payments, reminders, and customer messaging.

### Solution
**PAL** is a voice-first agentic layer:

```text
Code-switched speech (Sahara)
  → MeaningState (structured intent, entities, constraints, confidence)
  → ActionPlan / WorkflowIR (constrained, capability-registry only)
  → Policy gate
  → Owner approval ("PAL is asking")
  → Execution
  → Verification + provenance
```

**Core promise:** *Speak naturally. PAL understands the meaning, builds the work, and asks before it acts.*

**Safety invariant:** No LLM may directly execute an external side effect. Agents propose; policy decides; the owner approves; the executor acts; the verifier confirms.

---

## 2. Working Prototype

**Code:** https://github.com/Logonotobscurity/pal  

**What to demo (2–3 min video script):**

1. Open Command / home — show pipeline: Speak → Understand → Plan → **Ask** → Act → Verify.  
2. Open **Approvals** — title “PAL is asking”; filter “Asking”; empty state: “Nothing needs your decision right now.”  
3. (If live data) Show a pending proposal: exact payload, risk class, “Why PAL is asking”, buttons **Yes, do this** / **No, reject**.  
4. State the invariant: models never call WhatsApp/pay APIs directly.  
5. Optional: one code-switched example (“Remind Ngozi to pay ₦85,000 by tomorrow”) through meaning → plan → ask.

**Live app:** use your deployed URL if available; otherwise screen-record `npm run dev` locally.

---

## 3. Code & Docs

| Resource | Path / URL |
|----------|------------|
| Source | https://github.com/Logonotobscurity/pal |
| Architecture | `docs/PAL_ARCHITECTURE.md` |
| Benchmark method | `docs/PAL_BENCHMARK.md` |
| Implementation status | `docs/PAL_IMPLEMENTATION_STATUS.md` (open PR) |
| Security | `docs/PAL_SECURITY.md` |
| This package | `SUBMISSION.md` |

**Stack:** Next.js App Router · TypeScript · Supabase · Sahara voice · OpenAI/OpenRouter LLMs · Zod contracts · approval + optimistic locking.

**Pipeline status:** Voice → SpeechEvent → MeaningState → ActionPlan → Policy → Proposal → Approval → Execution → Verification (backend integrated; UI approvals live).

---

## 4. Benchmark Results (template — fill numbers before submit)

**Thesis:** Speech quality determines action quality. We evaluate beyond WER.

### Models compared (≥3, including Sahara)

| # | Model | Type | Role in eval |
|---|--------|------|----------------|
| 1 | **Intron Sahara** (API) | Code-switch STT | Primary |
| 2 | OpenAI Whisper Large-v3 (or medium) | Global open/commercial | Baseline |
| 3 | intronhealth / afrispeech-whisper (or AssemblyAI / Google) | African-tuned or commercial | Third system |

### Datasets

- [AfriSwitch](https://huggingface.co/datasets/intronhealth/AfriSwitch) — in-the-wild African code-switched speech  
- [AfriSwitchCare](https://huggingface.co/datasets/intronhealth/AfriSwitchCare) — clinical code-switching  
- [NigBench-MAMAI-Speech-QA](https://huggingface.co/datasets/intronhealth/NigBench-MAMAI-Speech-QA) — Nigerian spoken QA  

*(If gated: accept HF terms; note sample size N in the table.)*

### Metrics (report what you measured)

| Metric | Sahara | Model 2 | Model 3 | Notes |
|--------|--------|---------|---------|--------|
| WER (code-switched clips) | _TBD_ | _TBD_ | _TBD_ | Lower better |
| Code-switch span detection (F1) | _TBD_ | _TBD_ | _TBD_ | |
| Critical field recall (name, amount, date) | _TBD_ | _TBD_ | _TBD_ | PAL focus |
| Intent accuracy (downstream) | _TBD_ | _TBD_ | _TBD_ | Via MeaningState |
| Unsafe action rate (no approval) | **0** (by design) | n/a | n/a | Architecture |

**How PAL uses the STT output:** transcript + segments + code-switch metadata → Semantic Agent → MeaningState → Workflow Agent → proposal only if policy requires approval.

*If full numbers are not finished: submit methodology in `docs/PAL_BENCHMARK.md` + partial table + note “results computed on N samples; full report in repo.”*

---

## 5. Responsible AI

**Privacy & consent**  
- Evaluation uses public challenge datasets (AfriSwitch family) under their licenses and speaker-consent terms.  
- Production path: workspace tenancy (Supabase RLS); no training on customer audio without explicit agreement.

**Safety**  
- Hard rule: models **propose** only. External side effects require policy + **human approval**.  
- Critical fields with low confidence block progression (insufficient / conflicting context).  
- Full provenance: action ← proposal ← meaning ← transcript ← audio evidence refs.

**PII**  
- Prefer minimization in logs; avoid logging full transcripts in production observability (see security policy).

**Bias & language**  
- Designed for African code-switching; performance varies by pair and noise. Limitations documented; not a medical device or unsupervised payment system.

**Intended use**  
- SME / ops assistance (reminders, messages, lookups) with a human in the loop for consequential actions.  
- Not for fully autonomous high-risk decisions without oversight.

---

## 6. Team & links

- **Repository:** https://github.com/Logonotobscurity/pal  
- **Challenge page:** https://www.intron.io/compete/  
- **Register / submit:** https://forms.gle/RV43DXHAJCTYr98U7  

---

## One-paragraph abstract (paste into form)

PAL is a meaning-to-action system for African code-switched speech. It uses Sahara (and comparable STT models) to turn mixed-language voice into structured MeaningState, then constrained workflows that **never** execute external side effects without policy checks and explicit owner approval (“PAL is asking”). Built for SME fintech/CX tasks such as payment reminders and customer messages, PAL prioritizes provenance, critical-field confidence, and human control—so speech quality improves action quality without sacrificing safety.
