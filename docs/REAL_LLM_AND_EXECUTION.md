# Real LLM Key and Native Execution Path

This note describes the minimum configuration required for a functioning end-to-end flow with a real LLM and a native (non-webhook) executor.

## 1. Real LLM key

The semantic and workflow agents use `llmConfigFromEnv()` in `src/providers/openai-llm.ts`.

**Preferred (OpenRouter):**
```bash
OPENROUTER_API_KEY=sk-or-...
OPENAI_MODEL=openai/gpt-4o-mini
# optional
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_HTTP_REFERER=https://your-app.example
OPENROUTER_X_TITLE=PAL
```

**Direct OpenAI:**
```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

OpenRouter takes precedence when both are set.

The public `/command` demo endpoint (`/api/demo/pipeline`) also uses this path. Without a key it falls back to a local stub so the UI still works.

## 2. Native executor

`src/services/execution/executors/native.ts` writes approved `message.send` actions into the `outbound_messages` table (migration `0009_outbound_messages_and_realtime.sql`).

This path requires no external webhook. It is selected when the Execution Service is given a Supabase client and the capability is `message.send` (wiring is in the executor router once the relevant PRs are merged).

## 3. Realtime transcript broadcast

- Server: `src/lib/realtime/transcripts.ts` broadcasts `partial` and `final` events on channel `transcripts:${workspaceId}:${sessionId}`.
- Called from `VoiceDbService` on session update (partial) and speech event create (final).
- Client: `src/components/voice/transcript-listener.tsx` subscribes and displays the text.

Migration `0009` also adds `voice_sessions` to the `supabase_realtime` publication.

## 4. End-to-end functioning checklist

1. Set either `OPENROUTER_API_KEY` or `OPENAI_API_KEY` in `.env.local`.
2. Apply migration `0009` (`supabase db push` or the dashboard SQL editor).
3. Sign in and open a voice session (or use the `/command` demo).
4. Approve a `message.send` proposal — the native executor records it in `outbound_messages`.
5. Open the transcript listener for a session to see live partial/final text.

No secrets are committed. Rotate any previously exposed keys before use.
