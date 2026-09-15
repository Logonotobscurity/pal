/**
 * Semantic database service — MeaningState persistence
 * 
 * Implements PAL_ARCHITECTURE.md §40: workspace-scoped semantic data with
 * explicit RLS enforcement through workspace membership checks.
 */

import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import type { MeaningState } from "@/core/schemas/meaning-state";

type DbMeaningState = {
  id: string;
  meaning_id: string;
  speech_event_id: string;
  workspace_id: string;
  intent_type: string;
  intent_summary: string;
  intent_confidence: number;
  entities: unknown;
  constraints: unknown;
  temporal_relations: unknown;
  ambiguities: unknown;
  evidence_refs: unknown;
  overall_confidence: number;
  field_confidence: unknown;
  context_sufficiency: string;
  model_provider: string;
  model_name: string;
  model_version: string;
  created_at: string;
};

export class SemanticDbService {
  constructor(private readonly supabase: SupabaseClient) {}

  async createMeaningState(meaningState: MeaningState, workspaceId: string): Promise<void> {
    const { error } = await this.supabase.from("meaning_states").insert({
      meaning_id: meaningState.id,
      speech_event_id: meaningState.speechEventId,
      workspace_id: workspaceId,
      intent_type: meaningState.intent.type,
      intent_summary: meaningState.intent.summary,
      intent_confidence: meaningState.intent.confidence,
      entities: meaningState.entities,
      constraints: meaningState.constraints,
      temporal_relations: meaningState.temporalRelations,
      ambiguities: meaningState.ambiguities,
      evidence_refs: meaningState.evidenceRefs,
      overall_confidence: meaningState.confidence.overall,
      field_confidence: meaningState.confidence.fields,
      context_sufficiency: meaningState.contextSufficiency,
      model_provider: meaningState.model.provider,
      model_name: meaningState.model.model,
      model_version: meaningState.model.version,
    });

    if (error) {
      throw new Error(`Failed to create meaning state: ${error.message}`);
    }
  }

  async getMeaningState(meaningId: string, workspaceId: string): Promise<MeaningState | null> {
    const { data, error } = await this.supabase
      .from("meaning_states")
      .select("*")
      .eq("meaning_id", meaningId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw new Error(`Failed to get meaning state: ${error.message}`);
    }

    return this.mapDbStateToMeaningState(data as DbMeaningState);
  }

  async getMeaningStatesBySpeechEvent(speechEventId: string, workspaceId: string): Promise<MeaningState[]> {
    const { data, error } = await this.supabase
      .from("meaning_states")
      .select("*")
      .eq("speech_event_id", speechEventId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to get meaning states by speech event: ${error.message}`);
    }

    return (data as DbMeaningState[]).map((row) => this.mapDbStateToMeaningState(row));
  }

  async listMeaningStatesByWorkspace(
    workspaceId: string,
    options: { limit?: number; intentType?: string; contextSufficiency?: string } = {},
  ): Promise<MeaningState[]> {
    let query = this.supabase
      .from("meaning_states")
      .select("*")
      .eq("workspace_id", workspaceId);

    if (options.intentType) {
      query = query.eq("intent_type", options.intentType);
    }

    if (options.contextSufficiency) {
      query = query.eq("context_sufficiency", options.contextSufficiency);
    }

    query = query.order("created_at", { ascending: false }).limit(options.limit ?? 50);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list meaning states: ${error.message}`);
    }

    return (data as DbMeaningState[]).map((row) => this.mapDbStateToMeaningState(row));
  }

  private mapDbStateToMeaningState(row: DbMeaningState): MeaningState {
    return {
      id: row.meaning_id,
      speechEventId: row.speech_event_id,
      intent: {
        type: row.intent_type as MeaningState["intent"]["type"],
        summary: row.intent_summary,
        confidence: row.intent_confidence,
      },
      entities: (row.entities as MeaningState["entities"]) ?? [],
      constraints: (row.constraints as MeaningState["constraints"]) ?? [],
      temporalRelations: (row.temporal_relations as MeaningState["temporalRelations"]) ?? [],
      ambiguities: (row.ambiguities as MeaningState["ambiguities"]) ?? [],
      evidenceRefs: (row.evidence_refs as MeaningState["evidenceRefs"]) ?? [],
      confidence: {
        overall: row.overall_confidence,
        fields: (row.field_confidence as Record<string, number>) ?? {},
      },
      contextSufficiency: row.context_sufficiency as MeaningState["contextSufficiency"],
      model: {
        provider: row.model_provider,
        model: row.model_name,
        version: row.model_version,
      },
    };
  }
}
