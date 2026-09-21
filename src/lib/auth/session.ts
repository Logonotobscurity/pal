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

/**
 * Read the `workspace_id` claim from user metadata.
 *
 * `UserMetadata` is an open index signature, so the value is `any`; narrowing
 * here keeps downstream workspace scoping a real `string`.
 */
export function readUserWorkspaceId(metadata: User["user_metadata"] | undefined): string {
  const value = metadata?.["workspace_id"];
  return typeof value === "string" ? value : "default";
}
