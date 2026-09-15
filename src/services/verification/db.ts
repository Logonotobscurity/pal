/**
 * Verification Database Service
 * 
 * Implements PAL_ARCHITECTURE.md §25: Verification Agent persistence
 */

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { VerificationResult } from "@/core/schemas/verification";

type DbVerificationResult = {
  id: string;
  verification_id: string;
  workspace_id: string;
  execution_id: string;
  verified: boolean;
  status: string;
  external_reference: string | null;
  expected_outcome: string | null;
  actual_outcome: string | null;
  notes: string | null;
  created_at: string;
  checked_at: string;
};

export class VerificationDatabaseService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new verification result
   */
  async createVerification(input: {
    verificationId: string;
    workspaceId: string;
    executionId: string;
    verified: boolean;
    status: VerificationResult["status"];
    externalReference?: string;
    expectedOutcome?: string;
    actualOutcome?: string;
    notes?: string;
    checkedAt?: string;
  }): Promise<VerificationResult> {
    const { data, error } = await this.supabase
      .from("verification_results")
      .insert({
        verification_id: input.verificationId,
        workspace_id: input.workspaceId,
        execution_id: input.executionId,
        verified: input.verified,
        status: input.status,
        external_reference: input.externalReference,
        expected_outcome: input.expectedOutcome,
        actual_outcome: input.actualOutcome,
        notes: input.notes,
        checked_at: input.checkedAt ?? new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create verification result: ${error.message}`);
    }

    return this.mapDbVerificationToVerificationResult(data as DbVerificationResult);
  }

  /**
   * Get verification result by ID
   */
  async getVerificationById(
    verificationId: string,
    workspaceId: string,
  ): Promise<VerificationResult | null> {
    const { data, error } = await this.supabase
      .from("verification_results")
      .select("*")
      .eq("verification_id", verificationId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      throw new Error(`Failed to get verification result: ${error.message}`);
    }

    return this.mapDbVerificationToVerificationResult(data as DbVerificationResult);
  }

  /**
   * List verification results for an execution
   */
  async listVerificationsByExecution(
    executionId: string,
    workspaceId: string,
  ): Promise<VerificationResult[]> {
    const { data, error } = await this.supabase
      .from("verification_results")
      .select("*")
      .eq("execution_id", executionId)
      .eq("workspace_id", workspaceId)
      .order("checked_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list verification results: ${error.message}`);
    }

    return (data as DbVerificationResult[]).map((row) =>
      this.mapDbVerificationToVerificationResult(row),
    );
  }

  private mapDbVerificationToVerificationResult(
    row: DbVerificationResult,
  ): VerificationResult {
    return {
      executionAttemptId: row.execution_id,
      verified: row.verified,
      status: row.status as VerificationResult["status"],
      externalReference: row.external_reference ?? undefined,
      expectedOutcome: row.expected_outcome ?? undefined,
      actualOutcome: row.actual_outcome ?? undefined,
      notes: row.notes ?? undefined,
      checkedAt: row.checked_at,
    };
  }
}

