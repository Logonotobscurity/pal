import "server-only";

import type { User } from "@supabase/supabase-js";
import { createPalServerClient } from "@/lib/db/server";

/**
 * Session helpers on top of the RLS-scoped server client.
 * auth.getUser() validates the JWT against the auth server — never use
 * getSession() alone for authorization decisions.
 */

export async function getUser(): Promise<User | null> {
  const supabase = await createPalServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
