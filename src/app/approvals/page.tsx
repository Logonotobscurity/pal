/**
 * Approvals Page
 *
 * Implements PAL_ARCHITECTURE.md §29: Approval Flow.
 * Surface where PAL asks the owner before acting.
 */

import { createClient } from "@/lib/supabase/server";
import { ApprovalsList } from "@/components/approvals/approvals-list";
import { AppHeader } from "@/components/layout/app-header";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspaceId = user.user_metadata?.workspace_id ?? "default";

  return (
    <>
      <AppHeader active="approvals" signedIn />
      <main className="min-h-screen bg-neutral-950">
        <div className="border-b border-neutral-800">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
              Approvals
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-neutral-100">PAL is asking</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Review each request. Nothing consequential happens without you.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-6 py-8">
          <ApprovalsList workspaceId={workspaceId} />
        </div>
      </main>
    </>
  );
}
