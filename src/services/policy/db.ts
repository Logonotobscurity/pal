/**
 * Policy database service — ActionProposal and ApprovalDecision persistence
 * 
 * Implements PAL_ARCHITECTURE.md §40: workspace-scoped policy data with
 * explicit RLS enforcement through workspace membership checks.
 */

import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import type { ActionProposal, ApprovalDecision } from "@/core/schemas/action-proposal";

type DbActionProposal = {
  id: string;
  proposal_id: string;
  workspace_id: string;
  action_plan_id: string;
  action_type: string;
  exact_payload: unknown;
  destination: string | null;
  recipient: string | null;
  scheduled_for: string | null;
  risk_class: string;
  evidence_refs: unknown;
  status: string;
  policy_decision: unknown;
  version: number;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
};

type DbApprovalDecision = {
  id: string;
  decision_id: string;
  proposal_id: string;
  workspace_id: string;
  proposal_version: number;
  decision: string;
  actor_id: string;
  reason: string;
  decided_at: string;
  created_at: string;
};

export class PolicyDbService {
  constructor(private readonly supabase: SupabaseClient) {}

  async createProposal(proposal: ActionProposal, workspaceId: string): Promise<void> {
    const { error } = await this.supabase.from("action_proposals").insert({
      proposal_id: proposal.id,
      workspace_id: workspaceId,
      action_plan_id: proposal.actionPlanId,
      action_type: proposal.actionType,
      exact_payload: proposal.exactPayload,
      destination: proposal.destination ?? null,
      recipient: proposal.recipient ?? null,
      scheduled_for: proposal.scheduledFor ?? null,
      risk_class: proposal.riskClass,
      evidence_refs: proposal.evidenceRefs,
      status: proposal.status,
      policy_decision: proposal.policyDecision,
      version: 1,
      expires_at: proposal.expiresAt ?? null,
    });

    if (error) {
      throw new Error(`Failed to create action proposal: ${error.message}`);
    }
  }

  async getProposal(proposalId: string, workspaceId: string): Promise<ActionProposal | null> {
    const { data, error } = await this.supabase
      .from("action_proposals")
      .select("*")
      .eq("proposal_id", proposalId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw new Error(`Failed to get action proposal: ${error.message}`);
    }

    return this.mapDbProposalToActionProposal(data as DbActionProposal);
  }

  async listProposalsByWorkspace(
    workspaceId: string,
    options: { limit?: number | undefined; status?: string | undefined; riskClass?: string | undefined } = {},
  ): Promise<ActionProposal[]> {
    let query = this.supabase
      .from("action_proposals")
      .select("*")
      .eq("workspace_id", workspaceId);

    if (options.status) {
      query = query.eq("status", options.status);
    }

    if (options.riskClass) {
      query = query.eq("risk_class", options.riskClass);
    }

    query = query.order("created_at", { ascending: false }).limit(options.limit ?? 50);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list action proposals: ${error.message}`);
    }

    return (data as DbActionProposal[]).map((row) => this.mapDbProposalToActionProposal(row));
  }

  async listPendingProposals(workspaceId: string): Promise<ActionProposal[]> {
    return this.listProposalsByWorkspace(workspaceId, { status: "pending" });
  }

  async updateProposalStatus(
    proposalId: string,
    workspaceId: string,
    status: ActionProposal["status"],
    currentVersion: number,
  ): Promise<{ success: boolean; currentVersion?: number }> {
    // Optimistic locking: only update if version matches
    const { error } = await this.supabase
      .from("action_proposals")
      .update({
        status,
        version: currentVersion + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("proposal_id", proposalId)
      .eq("workspace_id", workspaceId)
      .eq("version", currentVersion)
      .select("version")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Version mismatch - stale approval
        const { data: current } = await this.supabase
          .from("action_proposals")
          .select("version")
          .eq("proposal_id", proposalId)
          .eq("workspace_id", workspaceId)
          .single();

        return {
          success: false,
          currentVersion: (current as { version: number })?.version,
        };
      }
      throw new Error(`Failed to update proposal status: ${error.message}`);
    }

    return { success: true };
  }

  async createApprovalDecision(
    decision: ApprovalDecision,
    workspaceId: string,
    proposalVersion: number,
  ): Promise<void> {
    const { error } = await this.supabase.from("approval_decisions").insert({
      decision_id: `decision_${decision.proposalId}_${Date.now()}`,
      proposal_id: decision.proposalId,
      workspace_id: workspaceId,
      proposal_version: proposalVersion,
      decision: decision.decision,
      actor_id: decision.actorId,
      reason: decision.reason,
      decided_at: decision.decidedAt,
    });

    if (error) {
      throw new Error(`Failed to create approval decision: ${error.message}`);
    }
  }

  async listDecisionsByProposal(
    proposalId: string,
    workspaceId: string,
  ): Promise<ApprovalDecision[]> {
    const { data, error } = await this.supabase
      .from("approval_decisions")
      .select("*")
      .eq("proposal_id", proposalId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to list approval decisions: ${error.message}`);
    }

    return (data as DbApprovalDecision[]).map((row) => this.mapDbDecisionToApprovalDecision(row));
  }

  private mapDbProposalToActionProposal(row: DbActionProposal): ActionProposal {
    return {
      id: row.proposal_id,
      workspaceId: row.workspace_id,
      actionPlanId: row.action_plan_id,
      actionType: row.action_type,
      exactPayload: row.exact_payload,
      destination: row.destination ?? undefined,
      recipient: row.recipient ?? undefined,
      scheduledFor: row.scheduled_for ?? undefined,
      riskClass: row.risk_class as ActionProposal["riskClass"],
      evidenceRefs: (row.evidence_refs as ActionProposal["evidenceRefs"]) ?? [],
      status: row.status as ActionProposal["status"],
      policyDecision: row.policy_decision as ActionProposal["policyDecision"],
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      expiresAt: row.expires_at ?? undefined,
    };
  }

  private mapDbDecisionToApprovalDecision(row: DbApprovalDecision): ApprovalDecision {
    return {
      proposalId: row.proposal_id,
      decision: row.decision as ApprovalDecision["decision"],
      actorId: row.actor_id,
      reason: row.reason,
      decidedAt: row.decided_at,
    };
  }
}
