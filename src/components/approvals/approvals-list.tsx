/**
 * Approvals List Component
 *
 * Client component that fetches and displays proposals requiring approval.
 * Implements PAL_ARCHITECTURE.md §59: Approvals view.
 *
 * Copy centers the ASK concept: PAL asks; the owner decides.
 */

"use client";

import { useEffect, useState } from "react";
import type { ActionProposal } from "@/core/schemas/action-proposal";
import { ProposalCard } from "./proposal-card";

type ApprovalsListProps = {
  workspaceId: string;
};

export function ApprovalsList({ workspaceId }: ApprovalsListProps) {
  const [proposals, setProposals] = useState<ActionProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  useEffect(() => {
    let cancelled = false;

    async function loadProposals() {
      try {
        const params = new URLSearchParams({ workspaceId });
        if (filter !== "all") {
          params.append("status", filter);
        }

        const response = await fetch(`/api/proposals?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch proposals");
        }

        const data = await response.json();
        if (!cancelled) {
          setProposals(data.proposals || []);
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

    loadProposals();

    const interval = setInterval(() => {
      if (!cancelled) {
        loadProposals();
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [filter, workspaceId]);

  async function fetchProposals() {
    try {
      const params = new URLSearchParams({ workspaceId });
      if (filter !== "all") {
        params.append("status", filter);
      }

      const response = await fetch(`/api/proposals?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch proposals");
      }

      const data = await response.json();
      setProposals(data.proposals || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(proposalId: string, currentVersion: number) {
    try {
      const response = await fetch(`/api/proposals/${proposalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          reason: "Approved by user",
          version: currentVersion,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve");
      }

      await fetchProposals();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to approve proposal");
    }
  }

  async function handleReject(proposalId: string, currentVersion: number, reason: string) {
    try {
      const response = await fetch(`/api/proposals/${proposalId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          reason,
          version: currentVersion,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reject");
      }

      await fetchProposals();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reject proposal");
    }
  }

  if (loading && proposals.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-neutral-400">Checking what PAL is asking…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
        <p>Could not load requests: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("pending")}
          className={`rounded-lg px-3 py-1.5 text-sm transition ${
            filter === "pending"
              ? "bg-emerald-950/50 text-emerald-300"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Asking
        </button>
        <button
          onClick={() => setFilter("approved")}
          className={`rounded-lg px-3 py-1.5 text-sm transition ${
            filter === "approved"
              ? "bg-neutral-800 text-neutral-100"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => setFilter("rejected")}
          className={`rounded-lg px-3 py-1.5 text-sm transition ${
            filter === "rejected"
              ? "bg-neutral-800 text-neutral-100"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Rejected
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`rounded-lg px-3 py-1.5 text-sm transition ${
            filter === "all"
              ? "bg-neutral-800 text-neutral-100"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          All
        </button>
      </div>

      {proposals.length === 0 ? (
        <div className="rounded-xl border border-neutral-800 px-6 py-12 text-center">
          <p className="text-sm text-neutral-300">
            {filter === "pending"
              ? "Nothing needs your decision right now."
              : filter === "all"
                ? "No proposals yet."
                : `No ${filter} proposals.`}
          </p>
          {filter === "pending" && (
            <p className="mt-2 text-xs text-neutral-500">
              When PAL understands a request that needs approval, it will appear here.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
