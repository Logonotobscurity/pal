/**
 * Proposal Edit Page
 * 
 * Placeholder for editing ActionProposals
 * Full implementation requires clarification flow integration
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProposalEditPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
                Edit Proposal
              </h1>
            </div>
            <a
              href={`/approvals/${id}`}
              className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-400 hover:text-neutral-100"
            >
              Back
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-lg border border-yellow-900/50 bg-yellow-950/20 p-6">
          <h2 className="text-lg font-semibold text-yellow-400">
            Edit Feature Coming Soon
          </h2>
          <p className="mt-2 text-sm text-yellow-300/80">
            Proposal editing requires integration with the clarification flow and
            re-evaluation by the Policy Engine. This feature will be implemented in a
            future task.
          </p>
          <p className="mt-4 text-xs text-yellow-500">
            Task 3.3 implements the approval UI foundation. Editing requires additional
            workflow and semantic agent integration.
          </p>
        </div>
      </div>
    </main>
  );
}
