# Real LLM Key and Native Execution Path

This note describes the minimum configuration required for a functioning end-to-end flow with a real LLM and a native (non-webhook) executor.

## 1. Real LLM key

The semantic and workflow agents (and the `/command` demo) use `llmConfigFromEnv()` / `workflowConfigFromEnv()`.

**Priority (first match wins):**
1. `XAI_API_KEY` (Grok / xAI)
2. `GROQ_API_KEY` (Groq inference)
3. `OPENROUTER_API_KEY`
4. `OPENAI_API_KEY`

**Grok / xAI (preferred):**
```bash
XAI_API_KEY=xai-...
XAI_MODEL=grok-4.1
```

**Groq (fast open models — recommended for PAL semantic + workflow):**
```bash
GROQ_API_KEY=gsk_...
# Best practical default for quality + speed + JSON mode:
GROQ_MODEL=llama-3.3-70b-versatile
# Faster triage option:
# GROQ_MODEL=llama-3.1-8b-instant
# Strong structured-output option (if available on your account):
# GROQ_MODEL=openai/gpt-oss-120b
```

**OpenRouter:**
```bash
OPENROUTER_API_KEY=sk-or-...
OPENAI_MODEL=openai/gpt-4o-mini
```

**Direct OpenAI:**
```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

The public `/command` demo endpoint (`/api/demo/pipeline`) calls `llmConfigFromEnv()` directly. Without any key it falls back to a local stub.

**Security:** Never commit real keys. Keep them in `.env.local` only. Rotate any key that has been shared in chat, email, or a PR.

## 2. Native executor

`src/services/execution/executors/native.ts` writes approved `message.send` actions into the `outbound_messages` table. The router in `src/services/execution/executors/index.ts` selects it by default.

## 3. Realtime transcript broadcast

- Server: `src/lib/realtime/transcripts.ts`
- Client: `src/components/voice/transcript-listener.tsx`

## 4. End-to-end functioning checklist

1. Set `GROQ_API_KEY` (or `XAI_API_KEY`) in `.env.local` only.
2. Apply migration `0009`.
3. Use `/command` — it will call the live pipeline with the configured key and the best available model.
4. Approve a `message.send` — the native executor records it in `outbound_messages`.

No secrets are committed.
