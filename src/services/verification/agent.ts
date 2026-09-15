/**
 * Verification Agent Service
 * 
 * Implements PAL_ARCHITECTURE.md §25: Verification Agent
 * 
 * After execution, the verification agent checks whether the external effect
 * matches expectations. For MVP, this is a simple check that execution succeeded.
 * 
 * Future: Provider-specific verification (check message delivery status,
 * confirm payment processing, verify external system state).
 */

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExecutionAttempt } from "@/core/schemas/execution-attempt";
import type { VerificationResult } from "@/core/schemas/verification";
import { createId } from "@/lib/utils/ids";
import { VerificationDatabaseService } from "./db";

export type VerificationAgentConfig = {
  workspaceId: string;
};

export type VerificationAgentLogger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

export class VerificationAgent {
  private readonly workspaceId: string;
  private readonly logger: VerificationAgentLogger;
  private readonly dbService: VerificationDatabaseService;

  constructor(
    supabase: SupabaseClient,
    config: VerificationAgentConfig,
    logger?: VerificationAgentLogger,
  ) {
    this.workspaceId = config.workspaceId;
    this.dbService = new VerificationDatabaseService(supabase);
    this.logger = logger ?? {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    };
  }

  /**
   * Verify an execution attempt
   * 
   * PAL_ARCHITECTURE.md §25:
   * - Check if external effect matches expectations
   * - Produce verification result
   * - Do not falsely report success
   * 
   * MVP Implementation:
   * - Simple check: execution succeeded → verified
   * - Captures external reference if available
   * 
   * Future Enhancement:
   * - Provider-specific verification
   * - Check message delivery status (Twilio, WhatsApp)
   * - Confirm payment processing (payment gateway)
   * - Verify external system state (CRM, database)
   */
  async verify(execution: ExecutionAttempt): Promise<VerificationResult> {
    this.logger.info("verification.agent.starting", {
      executionId: execution.id,
      status: execution.status,
    });

    // Simple MVP verification logic:
    // - If execution succeeded → verified
    // - If execution failed → unverified
    // - If execution not completed → cannot verify yet
    
    let verified: boolean;
    let status: VerificationResult["status"];
    let notes: string;
    let expectedOutcome: string;
    let actualOutcome: string;

    if (execution.status === "succeeded") {
      verified = true;
      status = "verified";
      expectedOutcome = `Execute capability: ${execution.provider}`;
      actualOutcome = execution.externalReference
        ? `Provider returned reference: ${execution.externalReference}`
        : "Provider execution succeeded";
      notes = "Execution completed successfully. External reference captured.";

      this.logger.info("verification.agent.verified", {
        executionId: execution.id,
        externalReference: execution.externalReference,
      });
    } else if (execution.status === "failed") {
      verified = false;
      status = "failed";
      expectedOutcome = `Execute capability: ${execution.provider}`;
      actualOutcome = execution.errorMessage
        ? `Provider error: ${execution.errorCode} - ${execution.errorMessage}`
        : `Provider error: ${execution.errorCode ?? "UNKNOWN"}`;
      notes = "Execution failed. External action was not completed.";

      this.logger.warn("verification.agent.failed", {
        executionId: execution.id,
        errorCode: execution.errorCode,
      });
    } else {
      // Execution not completed (queued, running, cancelled)
      verified = false;
      status = "unverified";
      expectedOutcome = `Execute capability: ${execution.provider}`;
      actualOutcome = `Execution status: ${execution.status}`;
      notes = `Cannot verify - execution is ${execution.status}`;

      this.logger.warn("verification.agent.unverified", {
        executionId: execution.id,
        executionStatus: execution.status,
      });
    }

    // Create verification result
    const verificationId = createId("verify");
    const verification = await this.dbService.createVerification({
      verificationId,
      workspaceId: this.workspaceId,
      executionId: execution.id,
      verified,
      status,
      externalReference: execution.externalReference,
      expectedOutcome,
      actualOutcome,
      notes,
    });

    this.logger.info("verification.agent.completed", {
      verificationId,
      verified,
      status,
    });

    return verification;
  }

  /**
   * Get verification results for an execution
   */
  async getVerificationsByExecution(executionId: string): Promise<VerificationResult[]> {
    return this.dbService.listVerificationsByExecution(executionId, this.workspaceId);
  }
}

/**
 * Create verification agent with configuration
 */
export function createVerificationAgent(
  supabase: SupabaseClient,
  config: VerificationAgentConfig,
  logger?: VerificationAgentLogger,
): VerificationAgent {
  return new VerificationAgent(supabase, config, logger);
}

