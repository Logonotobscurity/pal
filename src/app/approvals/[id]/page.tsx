/**
 * Proposal Detail Page
 * 
 * Detailed view of a single ActionProposal with full provenance chain
 * Implements PAL_ARCHITECTURE.md §29: Approval Flow
 */

import { listWorkspacesForUser } from "@/lib/auth/tenancy";
import { ProposalDetail } from "@/components/approvals/proposal-detail";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProposalDetailPage({ params }: Props) {
  const { id } = await params;
  const workspaces = await listWorkspacesForUser();

  if (workspaces.length === 0) {
    redirect("/register");
  }

  const workspace = workspaces[0]!;

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
                Proposal Detail
              </h1>
            </div>
            <Link
              href="/approvals"
              className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-400 hover:text-neutral-100"
            >
              Back to Approvals
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <ProposalDetail proposalId={id} workspaceId={workspace.id} />
      </div>
    </main>
  );
}
