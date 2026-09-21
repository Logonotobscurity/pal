/**
 * Ambient environment-variable declarations.
 *
 * `@types/node` types `ProcessEnv` as an open index signature, so every
 * variable reads back as `string | undefined` and `noPropertyAccessFromIndexSignature`
 * rejects dotted access. Declaring the variables here keeps `process.env.X`
 * checked and makes the set of variables the application depends on explicit.
 *
 * Rule (PAL_ARCHITECTURE.md §73 Rule 2): every variable declared here must also
 * be documented in `.env.example`.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    /** Supabase project URL (public). */
    NEXT_PUBLIC_SUPABASE_URL?: string;
    /** Supabase anon/publishable key (public, subject to RLS). */
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    /** Supabase service-role key. Server-only; bypasses RLS. */
    SUPABASE_SERVICE_ROLE_KEY?: string;
    /** Sahara API secret. Server-only. */
    SAHARA_API_SECRET?: string;
    /** Sahara streaming endpoint. Server-only. */
    SAHARA_WS_ENDPOINT?: string;
    /** OpenAI (or OpenRouter) API key. Server-only. */
    OPENAI_API_KEY?: string;
    /** Chat model used by the semantic and workflow agents. */
    OPENAI_MODEL?: string;
    /** OpenRouter API key. Takes precedence over `OPENAI_API_KEY` when set. */
    OPENROUTER_API_KEY?: string;
    /** OpenRouter API base URL. */
    OPENROUTER_BASE_URL?: string;
    /** OpenRouter attribution header (`HTTP-Referer`). */
    OPENROUTER_HTTP_REFERER?: string;
    /** OpenRouter attribution header (`X-Title`). */
    OPENROUTER_X_TITLE?: string;
  }
}
