/**
 * Approvals Page
 * 
 * Implements PAL_ARCHITECTURE.md §29: Approval Flow
 * Displays all pending action proposals requiring user approval
 */

import { createClient } from "@/lib/supabase/server";
import { ApprovalsList } from "@/components/approvals/approvals-list";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's workspace (placeholder: assuming workspace_id from metadata or default)
  // In a real app, this would come from user session or workspace context
  const workspaceId = user.user_metadata?.workspace_id ?? "default";

  return (
    <main className="min-h-screen bg-neutral-950">
      {/* Header */}
      <div className="border-b border-neutral-800">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
                PAL
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-neutral-100">
                Approvals
              </h1>
              <p className="mt-1 text-sm text-neutral-400">
                Review and approve pending actions
              </p>
            </div>
            <Link
              href="/"
              className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-400 hover:text-neutral-100"
            >
              Command
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <ApprovalsList workspaceId={workspaceId} />
      </div>
    </main>
  );
}
