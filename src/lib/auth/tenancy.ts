import "server-only";

import { createPalServerClient } from "@/lib/db/server";
import type { WorkspaceRole } from "@/core/schemas/workspace";

/**
 * Tenancy authorization primitives (§41, §63).
 *
 * Authorization path: auth.user → workspace_members → workspace_id →
 * resource. Every server mutation that touches a workspace-owned resource
 * must resolve membership through here (or equivalent RLS enforcement)
 * before proceeding.
 */

export type WorkspaceSummary = {
  id: string;
  name: string;
  role: WorkspaceRole;
  createdAt: string;
};

export type Membership = {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
};

/** Workspaces the user belongs to (RLS already scopes this query). */
export async function listWorkspacesForUser(): Promise<WorkspaceSummary[]> {
  const supabase = await createPalServerClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, created_at, workspace_members(role)")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to list workspaces: ${error.message}`);

  return (data ?? []).map((row) => {
    const member = row.workspace_members?.[0];
    return {
      id: row.id,
      name: row.name,
      role: (member?.role ?? "member") satisfies WorkspaceRole as WorkspaceRole,
      createdAt: row.created_at,
    };
  });
}

/** The user's membership in a specific workspace, or null. */
export async function getMembership(
  workspaceId: string,
): Promise<Membership | null> {
  const supabase = await createPalServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id, user_id, role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;
  return {
    workspaceId: data.workspace_id,
    userId: data.user_id,
    role: data.role as WorkspaceRole,
  };
}
