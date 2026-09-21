/**
 * Execution Database Service
 * 
 * Implements PAL_ARCHITECTURE.md §30: Execution Service persistence
 */

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExecutionAttempt } from "@/core/schemas/execution-attempt";

type DbExecutionAttempt = {
  id: string;
  execution_id: string;
  workspace_id: string;
  proposal_id: string;
  idempotency_key: string;
  capability: string;
  provider: string;
  input_payload: unknown;
  output_payload: unknown;
  status: string;
  external_reference: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export class ExecutionDatabaseService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new execution attempt
   */
  async createAttempt(input: {
    executionId: string;
    workspaceId: string;
    proposalId: string;
    idempotencyKey: string;
    capability: string;
    provider: string;
    inputPayload: unknown;
    status: ExecutionAttempt["status"];
  }): Promise<ExecutionAttempt> {
    const { data, error } = await this.supabase
      .from("execution_attempts")
      .insert({
        execution_id: input.executionId,
        workspace_id: input.workspaceId,
        proposal_id: input.proposalId,
        idempotency_key: input.idempotencyKey,
        capability: input.capability,
        provider: input.provider,
        input_payload: input.inputPayload,
        status: input.status,
      })
      .select()
      .single();

    if (error) {
      // Check for idempotency key conflict
      if (error.code === "23505" && error.message.includes("idempotency_key")) {
        throw new Error("IDEMPOTENCY_CONFLICT");
      }
      throw new Error(`Failed to create execution attempt: ${error.message}`);
    }

    return this.mapDbAttemptToExecutionAttempt(data as DbExecutionAttempt);
  }

  /**
   * Get execution attempt by idempotency key
   */
  async getAttemptByIdempotencyKey(
    idempotencyKey: string,
    workspaceId: string,
  ): Promise<ExecutionAttempt | null> {
    const { data, error } = await this.supabase
      .from("execution_attempts")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .eq("workspace_id", workspaceId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      throw new Error(`Failed to get execution attempt: ${error.message}`);
    }

    return this.mapDbAttemptToExecutionAttempt(data as DbExecutionAttempt);
  }

  /**
   * Get execution attempt by ID
   */
  async getAttemptById(
    executionId: string,
    workspaceId: string,
  ): Promise<ExecutionAttempt | null> {
    const { data, error } = await this.supabase
      .from("execution_attempts")
      .select("*")
      .eq("execution_id", executionId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      throw new Error(`Failed to get execution attempt: ${error.message}`);
    }

    return this.mapDbAttemptToExecutionAttempt(data as DbExecutionAttempt);
  }

  /**
   * List execution attempts for a proposal
   */
  async listAttemptsByProposal(
    proposalId: string,
    workspaceId: string,
  ): Promise<ExecutionAttempt[]> {
    const { data, error } = await this.supabase
      .from("execution_attempts")
      .select("*")
      .eq("proposal_id", proposalId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list execution attempts: ${error.message}`);
    }

    return (data as DbExecutionAttempt[]).map((row) =>
      this.mapDbAttemptToExecutionAttempt(row),
    );
  }

  /**
   * Update execution attempt status
   */
  async updateAttemptStatus(input: {
    executionId: string;
    workspaceId: string;
    status: ExecutionAttempt["status"];
    startedAt?: string | undefined;
    completedAt?: string | undefined;
    externalReference?: string | undefined;
    outputPayload?: unknown;
    errorCode?: string | undefined;
    errorMessage?: string | undefined;
  }): Promise<ExecutionAttempt> {
    const updates: Partial<DbExecutionAttempt> = {
      status: input.status,
    };

    if (input.startedAt) updates.started_at = input.startedAt;
    if (input.completedAt) updates.completed_at = input.completedAt;
    if (input.externalReference) updates.external_reference = input.externalReference;
    if (input.outputPayload) updates.output_payload = input.outputPayload;
    if (input.errorCode) updates.error_code = input.errorCode;
    if (input.errorMessage) updates.error_message = input.errorMessage;

    const { data, error } = await this.supabase
      .from("execution_attempts")
      .update(updates)
      .eq("execution_id", input.executionId)
      .eq("workspace_id", input.workspaceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update execution attempt: ${error.message}`);
    }

    return this.mapDbAttemptToExecutionAttempt(data as DbExecutionAttempt);
  }

  private mapDbAttemptToExecutionAttempt(row: DbExecutionAttempt): ExecutionAttempt {
    return {
      id: row.execution_id,
      proposalId: row.proposal_id,
      idempotencyKey: row.idempotency_key,
      provider: row.provider,
      status: row.status as ExecutionAttempt["status"],
      externalReference: row.external_reference ?? undefined,
      startedAt: row.started_at ?? undefined,
      completedAt: row.completed_at ?? undefined,
      errorCode: row.error_code ?? undefined,
      errorMessage: row.error_message ?? undefined,
    };
  }
}

