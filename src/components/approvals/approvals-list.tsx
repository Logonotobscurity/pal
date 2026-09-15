/**
 * Approvals List Component
 * 
 * Client component that fetches and displays proposals requiring approval
 * Implements PAL_ARCHITECTURE.md §59: Approvals view
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
        const params = new URLSearchParams();
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

    // Poll for updates every 5 seconds
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
      const params = new URLSearchParams();
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
          reason: "Approved by user",
          version: currentVersion,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve");
      }

      // Refresh list
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
          reason,
          version: currentVersion,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reject");
      }

      // Refresh list
      await fetchProposals();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reject proposal");
    }
  }

  if (loading && proposals.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-neutral-400">Loading proposals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
        <p>Error loading proposals: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("pending")}
          className={`rounded-md px-3 py-1.5 text-sm transition ${
            filter === "pending"
              ? "bg-neutral-800 text-neutral-100"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter("approved")}
          className={`rounded-md px-3 py-1.5 text-sm transition ${
            filter === "approved"
              ? "bg-neutral-800 text-neutral-100"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => setFilter("rejected")}
          className={`rounded-md px-3 py-1.5 text-sm transition ${
            filter === "rejected"
              ? "bg-neutral-800 text-neutral-100"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Rejected
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`rounded-md px-3 py-1.5 text-sm transition ${
            filter === "all"
              ? "bg-neutral-800 text-neutral-100"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          All
        </button>
      </div>

      {/* Proposals */}
      {proposals.length === 0 ? (
        <div className="rounded-md border border-neutral-800 px-6 py-12 text-center">
          <p className="text-sm text-neutral-400">
            {filter === "pending"
              ? "No pending proposals"
              : `No ${filter} proposals`}
          </p>
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
