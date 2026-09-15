/**
 * Proposal Detail Component
 *
 * Detailed view with full provenance chain and approval history.
 * Copy centers the ASK concept: PAL proposes; the owner decides.
 */

"use client";

import { useEffect, useState } from "react";
import type { ActionProposal } from "@/core/schemas/action-proposal";

type ProposalDetailProps = {
  proposalId: string;
};

type ProposalWithDecisions = ActionProposal & {
  approvalDecisions?: Array<{
    id: string;
    decision: "approved" | "rejected" | "edited";
    actorId: string;
    reason: string;
    checkedVersion: number;
    createdAt: string;
  }>;
};

function statusLabel(status: ActionProposal["status"]): string {
  switch (status) {
    case "pending":
      return "PAL is asking";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "edited":
      return "Edited";
    case "expired":
      return "Expired";
    case "executed":
      return "Executed";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

export function ProposalDetail({ proposalId }: ProposalDetailProps) {
  const [proposal, setProposal] = useState<ProposalWithDecisions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProposal() {
      try {
        const response = await fetch(`/api/proposals/${proposalId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch proposal");
        }

        const data = await response.json();
        if (!cancelled) {
          setProposal(data.proposal);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProposal();

    return () => {
      cancelled = true;
    };
  }, [proposalId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-neutral-400">Loading request…</p>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="rounded-md border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
        <p>Could not load request: {error || "Not found"}</p>
      </div>
    );
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isAsking = proposal.status === "pending";

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {isAsking ? "PAL is asking for your approval" : "Proposal"}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-neutral-100">{proposal.actionType}</h2>
            <p className="mt-1 text-sm text-neutral-400">Created {formatTime(proposal.createdAt)}</p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <span
              className={`rounded-md border px-3 py-1 text-xs font-medium ${
                isAsking
                  ? "border-emerald-900/50 bg-emerald-950/30 text-emerald-400"
                  : "border-neutral-700 bg-neutral-800 text-neutral-300"
              }`}
            >
              {statusLabel(proposal.status)}
            </span>
            <span className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs font-medium text-neutral-300">
              {proposal.riskClass}
            </span>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Action details
            </h3>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-neutral-500">Action type</p>
                <p className="mt-1 text-sm text-neutral-200">{proposal.actionType}</p>
              </div>
              {proposal.recipient && (
                <div>
                  <p className="text-xs text-neutral-500">Recipient</p>
                  <p className="mt-1 text-sm text-neutral-200">{proposal.recipient}</p>
                </div>
              )}
              {proposal.destination && (
                <div>
                  <p className="text-xs text-neutral-500">Destination</p>
                  <p className="mt-1 text-sm text-neutral-200">{proposal.destination}</p>
                </div>
              )}
              {proposal.scheduledFor && (
                <div>
                  <p className="text-xs text-neutral-500">Scheduled for</p>
                  <p className="mt-1 text-sm text-neutral-200">{proposal.scheduledFor}</p>
                </div>
              )}
            </div>
          </div>

          {proposal.policyDecision && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
                Why PAL is asking
              </h3>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs text-neutral-500">Allowed by policy</p>
                  <p className="mt-1 text-sm text-neutral-200">
                    {proposal.policyDecision.allowed ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Requires your approval</p>
                  <p className="mt-1 text-sm text-neutral-200">
                    {proposal.policyDecision.requiresApproval ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Reason</p>
                  <p className="mt-1 text-sm text-neutral-300">{proposal.policyDecision.reason}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {proposal.exactPayload !== null && proposal.exactPayload !== undefined ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
                Exact action (what will run if you approve)
              </h3>
              <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-neutral-950 p-4 text-xs text-neutral-300">
                {JSON.stringify(proposal.exactPayload, null, 2)}
              </pre>
            </div>
          ) : null}

          {proposal.evidenceRefs && proposal.evidenceRefs.length > 0 && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
                Evidence chain
              </h3>
              <div className="mt-4 space-y-3">
                {proposal.evidenceRefs.map((ref, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-neutral-800 px-2 py-0.5 font-mono text-xs text-neutral-400">
                        {ref.type}
                      </span>
                      <span className="text-xs text-neutral-500">{ref.id}</span>
                    </div>
                    {ref.source && (
                      <p className="mt-2 text-xs text-neutral-400">Source: {ref.source}</p>
                    )}
                    {ref.uri && (
                      <p className="mt-1 font-mono text-xs text-neutral-600">{ref.uri}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {proposal.approvalDecisions && proposal.approvalDecisions.length > 0 && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Decision history
          </h3>
          <div className="mt-4 space-y-3">
            {proposal.approvalDecisions.map((decision) => (
              <div
                key={decision.id}
                className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        decision.decision === "approved"
                          ? "bg-green-950/30 text-green-400"
                          : decision.decision === "rejected"
                            ? "bg-red-950/30 text-red-400"
                            : "bg-blue-950/30 text-blue-400"
                      }`}
                    >
                      {decision.decision}
                    </span>
                    <p className="mt-2 text-sm text-neutral-300">{decision.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-500">Version {decision.checkedVersion}</p>
                    <p className="mt-1 text-xs text-neutral-600">{formatTime(decision.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Metadata</h3>
        <div className="mt-4 grid gap-4 text-xs md:grid-cols-3">
          <div>
            <p className="text-neutral-500">Proposal ID</p>
            <p className="mt-1 font-mono text-neutral-300">{proposal.id}</p>
          </div>
          <div>
            <p className="text-neutral-500">Action plan ID</p>
            <p className="mt-1 font-mono text-neutral-300">{proposal.actionPlanId}</p>
          </div>
          <div>
            <p className="text-neutral-500">Version</p>
            <p className="mt-1 text-neutral-300">{proposal.version}</p>
          </div>
          <div>
            <p className="text-neutral-500">Created</p>
            <p className="mt-1 text-neutral-300">{formatTime(proposal.createdAt)}</p>
          </div>
          <div>
            <p className="text-neutral-500">Updated</p>
            <p className="mt-1 text-neutral-300">{formatTime(proposal.updatedAt)}</p>
          </div>
          {proposal.expiresAt && (
            <div>
              <p className="text-neutral-500">Expires</p>
              <p className="mt-1 text-neutral-300">{formatTime(proposal.expiresAt)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
