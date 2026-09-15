import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";

/**
 * Server-side Supabase client bound to the request's cookies.
 * Runs as the authenticated user: all queries are RLS-scoped.
 * This is the default client for server components, server actions,
 * and route handlers.
 */
export async function createPalServerClient() {
  const env = getPublicEnv();
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a server component: cookies cannot be mutated.
            // Session refresh is handled by middleware.
          }
        },
      },
    },
  );
}
