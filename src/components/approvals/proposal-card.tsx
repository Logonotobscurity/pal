/**
 * Proposal Card Component
 * 
 * Displays a single ActionProposal with approve/reject actions
 * Implements PAL_ARCHITECTURE.md §29: Approval UI mockup
 */

"use client";

import { useState } from "react";
import type { ActionProposal } from "@/core/schemas/action-proposal";

type ProposalCardProps = {
  proposal: ActionProposal;
  onApprove: (proposalId: string, version: number) => Promise<void>;
  onReject: (proposalId: string, version: number, reason: string) => Promise<void>;
};

export function ProposalCard({ proposal, onApprove, onReject }: ProposalCardProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    if (isSubmitting || proposal.status !== "pending") return;
    setIsSubmitting(true);
    try {
      await onApprove(proposal.id, proposal.version);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (isSubmitting || proposal.status !== "pending") return;
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }
    setIsSubmitting(true);
    try {
      await onReject(proposal.id, proposal.version, rejectReason);
      setShowRejectDialog(false);
      setRejectReason("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status badge color
  const getStatusColor = (status: ActionProposal["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-950/30 text-yellow-400 border-yellow-900/50";
      case "approved":
        return "bg-green-950/30 text-green-400 border-green-900/50";
      case "rejected":
        return "bg-red-950/30 text-red-400 border-red-900/50";
      case "expired":
        return "bg-neutral-800 text-neutral-500 border-neutral-700";
      default:
        return "bg-neutral-800 text-neutral-400 border-neutral-700";
    }
  };

  // Get risk badge color
  const getRiskColor = (riskClass: ActionProposal["riskClass"]) => {
    switch (riskClass) {
      case "read":
        return "bg-blue-950/30 text-blue-400 border-blue-900/50";
      case "draft":
        return "bg-cyan-950/30 text-cyan-400 border-cyan-900/50";
      case "external_write":
        return "bg-orange-950/30 text-orange-400 border-orange-900/50";
      case "financial":
        return "bg-purple-950/30 text-purple-400 border-purple-900/50";
      case "destructive":
        return "bg-red-950/30 text-red-400 border-red-900/50";
      default:
        return "bg-neutral-800 text-neutral-400 border-neutral-700";
    }
  };

  const isPending = proposal.status === "pending";
  const isExpired = proposal.expiresAt && new Date(proposal.expiresAt) < new Date();

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-medium text-neutral-100">
            {proposal.actionType}
          </h3>
          <p className="mt-1 text-sm text-neutral-400">
            {formatTime(proposal.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <span
            className={`rounded-md border px-2 py-1 text-xs font-medium ${getStatusColor(proposal.status)}`}
          >
            {proposal.status}
          </span>
          <span
            className={`rounded-md border px-2 py-1 text-xs font-medium ${getRiskColor(proposal.riskClass)}`}
          >
            {proposal.riskClass}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3 border-t border-neutral-800 pt-4">
        {proposal.recipient && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Recipient
            </p>
            <p className="mt-1 text-sm text-neutral-200">{proposal.recipient}</p>
          </div>
        )}

        {proposal.destination && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Destination
            </p>
            <p className="mt-1 text-sm text-neutral-200">{proposal.destination}</p>
          </div>
        )}

        {proposal.scheduledFor && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Schedule
            </p>
            <p className="mt-1 text-sm text-neutral-200">{proposal.scheduledFor}</p>
          </div>
        )}

        {proposal.policyDecision && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Policy Reason
            </p>
            <p className="mt-1 text-sm text-neutral-300">{proposal.policyDecision.reason}</p>
          </div>
        )}

        {proposal.exactPayload !== null && proposal.exactPayload !== undefined && typeof proposal.exactPayload === "object" ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Exact Payload
            </p>
            <pre className="mt-1 max-h-40 overflow-auto rounded bg-neutral-950 p-3 text-xs text-neutral-300">
              {JSON.stringify(proposal.exactPayload, null, 2)}
            </pre>
          </div>
        ) : null}

        {/* Evidence References */}
        {proposal.evidenceRefs && proposal.evidenceRefs.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Source Evidence
            </p>
            <div className="mt-2 space-y-1">
              {proposal.evidenceRefs.map((ref, idx) => (
                <div key={idx} className="text-xs text-neutral-400">
                  <span className="font-mono text-neutral-500">{ref.type}:</span>{" "}
                  <span>{ref.id}</span>
                  {ref.uri && <span className="text-neutral-600"> · {ref.uri}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {isExpired && (
          <div className="rounded-md border border-red-900/50 bg-red-950/20 px-3 py-2 text-xs text-red-400">
            This proposal has expired
          </div>
        )}
      </div>

      {/* Actions */}
      {isPending && !isExpired && (
        <div className="mt-6 flex gap-3 border-t border-neutral-800 pt-4">
          <button
            onClick={() => setShowRejectDialog(true)}
            disabled={isSubmitting}
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:border-red-700 hover:text-red-400 disabled:opacity-50"
          >
            Reject
          </button>
          <a
            href={`/approvals/${proposal.id}/edit`}
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-500 hover:text-neutral-100"
          >
            Edit
          </a>
          <button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="ml-auto rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-green-500 disabled:opacity-50"
          >
            {isSubmitting ? "Approving..." : "Approve"}
          </button>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-900 p-6">
            <h3 className="text-lg font-medium text-neutral-100">Reject Proposal</h3>
            <p className="mt-2 text-sm text-neutral-400">
              Please provide a reason for rejecting this action.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="mt-4 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
              rows={4}
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectReason("");
                }}
                disabled={isSubmitting}
                className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-500 hover:text-neutral-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isSubmitting || !rejectReason.trim()}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {isSubmitting ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
