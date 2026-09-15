import { z } from "zod";

/**
 * Environment boundary (PAL_ARCHITECTURE.md §73 Rule 2, §64):
 * every variable is declared here and documented in .env.example.
 * Validation is lazy so builds never require a configured environment;
 * runtime callers fail fast with a structured error naming the variables.
 */

const PublicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const ServerEnvSchema = PublicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SAHARA_API_SECRET: z.string().min(1),
  SAHARA_WS_ENDPOINT: z.string().url().default("wss://api.sahara.ai/v1/stream"),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
});

export type PublicEnv = z.infer<typeof PublicEnvSchema>;
export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export class EnvConfigError extends Error {
  readonly missing: string[];

  constructor(missing: string[], invalid: string[]) {
    const parts: string[] = [];
    if (missing.length > 0) parts.push(`missing: ${missing.join(", ")}`);
    if (invalid.length > 0) parts.push(`invalid: ${invalid.join(", ")}`);
    super(`Environment is not configured (${parts.join("; ")}). See .env.example.`);
    this.name = "EnvConfigError";
    this.missing = [...missing, ...invalid];
  }
}

function parse<S extends z.ZodType>(
  schema: S,
  source: Record<string, string | undefined>,
): z.output<S> {
  const result = schema.safeParse(source);
  if (result.success) return result.data;

  const missing: string[] = [];
  const invalid: string[] = [];
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (source[key] === undefined || source[key] === "") missing.push(key);
    else invalid.push(key);
  }
  throw new EnvConfigError(missing, invalid);
}

/** Public (browser-safe) Supabase configuration. */
export function getPublicEnv(): PublicEnv {
  return parse(PublicEnvSchema, {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

/** Full server-side Supabase configuration, including the service role key. */
export function getServerEnv(): ServerEnv {
  return parse(ServerEnvSchema, {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SAHARA_API_SECRET: process.env.SAHARA_API_SECRET,
    SAHARA_WS_ENDPOINT: process.env.SAHARA_WS_ENDPOINT,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  });
}
