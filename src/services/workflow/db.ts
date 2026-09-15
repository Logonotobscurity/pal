/**
 * Workflow database service — ActionPlan persistence
 * 
 * Implements PAL_ARCHITECTURE.md §40: workspace-scoped workflow data with
 * explicit RLS enforcement through workspace membership checks.
 */

import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import type { ActionPlan } from "@/core/schemas/action-plan";

type DbActionPlan = {
  id: string;
  plan_id: string;
  meaning_state_id: string;
  workspace_id: string;
  workflow_ir: unknown;
  steps: unknown;
  side_effect_class: string;
  requires_approval: boolean;
  evidence_refs: unknown;
  rationale_summary: string;
  generated_by_agent: string;
  generated_by_model: string;
  generated_by_version: string;
  created_at: string;
};

export class WorkflowDbService {
  constructor(private readonly supabase: SupabaseClient) {}

  async createActionPlan(actionPlan: ActionPlan, workspaceId: string): Promise<void> {
    const { error } = await this.supabase.from("action_plans").insert({
      plan_id: actionPlan.id,
      meaning_state_id: actionPlan.meaningStateId,
      workspace_id: workspaceId,
      workflow_ir: actionPlan.workflowIR,
      steps: actionPlan.steps,
      side_effect_class: actionPlan.sideEffectClass,
      requires_approval: actionPlan.requiresApproval,
      evidence_refs: actionPlan.evidenceRefs,
      rationale_summary: actionPlan.rationaleSummary,
      generated_by_agent: actionPlan.generatedBy.agent,
      generated_by_model: actionPlan.generatedBy.model,
      generated_by_version: actionPlan.generatedBy.version,
    });

    if (error) {
      throw new Error(`Failed to create action plan: ${error.message}`);
    }
  }

  async getActionPlan(planId: string, workspaceId: string): Promise<ActionPlan | null> {
    const { data, error } = await this.supabase
      .from("action_plans")
      .select("*")
      .eq("plan_id", planId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw new Error(`Failed to get action plan: ${error.message}`);
    }

    return this.mapDbPlanToActionPlan(data as DbActionPlan);
  }

  async getActionPlansByMeaningState(meaningStateId: string, workspaceId: string): Promise<ActionPlan[]> {
    const { data, error } = await this.supabase
      .from("action_plans")
      .select("*")
      .eq("meaning_state_id", meaningStateId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to get action plans by meaning state: ${error.message}`);
    }

    return (data as DbActionPlan[]).map((row) => this.mapDbPlanToActionPlan(row));
  }

  async listActionPlansByWorkspace(
    workspaceId: string,
    options: { limit?: number; sideEffectClass?: string; requiresApproval?: boolean } = {},
  ): Promise<ActionPlan[]> {
    let query = this.supabase
      .from("action_plans")
      .select("*")
      .eq("workspace_id", workspaceId);

    if (options.sideEffectClass) {
      query = query.eq("side_effect_class", options.sideEffectClass);
    }

    if (options.requiresApproval !== undefined) {
      query = query.eq("requires_approval", options.requiresApproval);
    }

    query = query.order("created_at", { ascending: false }).limit(options.limit ?? 50);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list action plans: ${error.message}`);
    }

    return (data as DbActionPlan[]).map((row) => this.mapDbPlanToActionPlan(row));
  }

  private mapDbPlanToActionPlan(row: DbActionPlan): ActionPlan {
    return {
      id: row.plan_id,
      meaningStateId: row.meaning_state_id,
      workflowIR: row.workflow_ir as ActionPlan["workflowIR"],
      steps: row.steps as ActionPlan["steps"],
      sideEffectClass: row.side_effect_class as ActionPlan["sideEffectClass"],
      requiresApproval: row.requires_approval,
      evidenceRefs: (row.evidence_refs as ActionPlan["evidenceRefs"]) ?? [],
      rationaleSummary: row.rationale_summary,
      generatedBy: {
        agent: row.generated_by_agent,
        model: row.generated_by_model,
        version: row.generated_by_version,
      },
      createdAt: row.created_at,
    };
  }
}
