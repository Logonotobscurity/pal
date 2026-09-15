import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

/**
 * Service-role Supabase client. BYPASSES RLS (§43).
 *
 * Constraints:
 *   - server-only import makes any accidental client bundle inclusion a
 *     build error;
 *   - never expose this client or its results unfiltered to the browser;
 *   - use only for operations that genuinely require privileged access
 *     (system workers, backfills). Ordinary request handling goes through
 *     the RLS-scoped server client.
 */
export function createPalAdminClient() {
  const env = getServerEnv();
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
