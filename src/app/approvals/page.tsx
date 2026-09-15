/**
 * Approvals Page
 *
 * Implements PAL_ARCHITECTURE.md §29: Approval Flow.
 * Surface where PAL asks the owner before acting.
 */

import { createClient } from "@/lib/supabase/server";
import { ApprovalsList } from "@/components/approvals/approvals-list";
import { redirect } from "next/navigation";
import Link from "next/link";

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
    <main className="min-h-screen bg-neutral-950">
      <div className="border-b border-neutral-800">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
                PAL
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-neutral-100">
                PAL is asking
              </h1>
              <p className="mt-1 text-sm text-neutral-400">
                Review each request. Nothing consequential happens without you.
              </p>
            </div>
            <Link
              href="/"
              className="shrink-0 rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-400 hover:text-neutral-100"
            >
              Command
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <ApprovalsList workspaceId={workspaceId} />
      </div>
    </main>
  );
}
