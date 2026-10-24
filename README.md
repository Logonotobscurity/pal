# PAL — Meaning-to-Action Intelligence

**Voice-to-action system for African code-switching that always asks before it acts.**

> Sahara CodeSwitch Africa Challenge submission (September 2026).  
> No LLM has direct execution authority. Human approval is required for consequential actions.

---

## What problem does this solve?

African business owners routinely code-switch mid-sentence. Generic voice assistants mishear names, amounts, and dates, then execute immediately. The result is lost money, broken trust, and zero adoption. PAL converts natural speech into structured meaning and a constrained action plan, then presents it for explicit human approval before any external side effect.

## What is implemented

Full pipeline (176 tests at last reported run):

1. Voice ingestion (Sahara STT with code-switch metadata)
2. Semantic extraction (intent + critical entities)
3. Action planning
4. Deterministic policy engine
5. Human approval UI
6. Execution service (only component allowed to call external APIs)
7. Verification

Architecture principle: **Speech → Meaning → State → Plan → Policy → Approval → Action → Verification**.

## Architecture

```
Voice (code-switched) → Sahara STT → MeaningState → ActionPlan
    → Policy Engine → 🔴 ASK (Human Approval) 🔴 → Execute → Verify
```

- Semantic and workflow agents extract and plan; they have no execution authority.
- Policy engine is deterministic (not an LLM).
- Critical-field blocking: low confidence on recipient, amount, or date blocks the action.
- Full provenance from audio through approval to outcome.

## What a reviewer can run

```bash
git clone https://github.com/Logonotobscurity/pal.git
cd pal
npm install
cp .env.example .env.local   # configure Supabase + optional Sahara / OpenAI keys
npm run dev                  # http://localhost:3000
```

Approval flow demo: register → `/approvals`.

Tests:
```bash
npm test
npm run typecheck
```

## Evidence that it works

- Architecture-enforced safety: every external write and financial action requires human approval (Tier 5 = 100% by design).
- Pipeline implemented end-to-end with test coverage across voice ingestion, semantic agent, policy engine, and approval.
- Benchmark methodology documented in `docs/PAL_BENCHMARK.md` (transcription, extraction, semantic, action quality, safety).

## Honest limitations

- End-to-end benchmark numbers are not yet published. Do not present methodology targets as achieved results.
- Best demonstrated on English–Swahili; performance varies by language pair.
- MVP is single-turn; not suitable for unsupervised high-stakes decisions.

## Portfolio value

Strongest evidence for African-language AI, speech-to-action, semantic understanding, and action safety.  
Best suited for: Awarri (Senior AI Engineer), Vennote (Conversational AI / Agentic Systems), and voice-related ElevenLabs roles.

## Further reading

- `docs/PAL_ARCHITECTURE.md` — source of truth
- `docs/PAL_BENCHMARK.md`, `docs/PAL_SECURITY.md`, `CHALLENGE_SUBMISSION.md`
