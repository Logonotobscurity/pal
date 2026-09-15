/**
 * Execution Service
 * 
 * Implements PAL_ARCHITECTURE.md §30: Execution Service
 * 
 * The execution service is the only component allowed to call external write APIs.
 * 
 * Flow:
 * 1. Approved Proposal
 * 2. Capability Registry lookup
 * 3. Credential lookup (placeholder)
 * 4. Idempotency check
 * 5. External API call
 * 6. Response capture
 * 7. Verification (placeholder)
 * 8. Audit
 */

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionProposal } from "@/core/schemas/action-proposal";
import type { ExecutionAttempt } from "@/core/schemas/execution-attempt";
import { getCapability } from "@/core/capabilities/registry";
import { generateIdempotencyKey } from "@/lib/utils/idempotency";
import { createId } from "@/lib/utils/ids";
import { ExecutionDatabaseService } from "./db";
import { executeMockCapability } from "./executors/mock";

export type ExecutionServiceConfig = {
  workspaceId: string;
};

export type ExecutionServiceLogger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

export type ExecutionResult = {
  attempt: ExecutionAttempt;
  alreadyExecuted: boolean;
};

export class ExecutionService {
  private readonly workspaceId: string;
  private readonly logger: ExecutionServiceLogger;
  private readonly dbService: ExecutionDatabaseService;

  constructor(
    supabase: SupabaseClient,
    config: ExecutionServiceConfig,
    logger?: ExecutionServiceLogger,
  ) {
    this.workspaceId = config.workspaceId;
    this.dbService = new ExecutionDatabaseService(supabase);
    this.logger = logger ?? {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    };
  }

  /**
   * Execute an approved proposal
   * 
   * PAL_ARCHITECTURE.md §30:
   * - Only execute approved proposals
   * - Perform idempotency check
   * - Call external API via capability executor
   * - Capture response
   * - Audit
   */
  async execute(proposal: ActionProposal): Promise<ExecutionResult> {
    this.logger.info("execution.service.starting", {
      proposalId: proposal.id,
      actionType: proposal.actionType,
      status: proposal.status,
    });

    // 1. Validate proposal is approved
    if (proposal.status !== "approved") {
      throw new Error(`Cannot execute proposal with status: ${proposal.status}`);
    }

    if (!proposal.policyDecision?.allowed) {
      throw new Error("Cannot execute proposal that was not allowed by policy");
    }

    // 2. Capability Registry lookup
    const capability = getCapability(proposal.actionType);
    if (!capability) {
      throw new Error(`Unknown capability: ${proposal.actionType}`);
    }

    this.logger.info("execution.service.capability_found", {
      capability: capability.name,
      operation: capability.operation,
      provider: capability.provider,
    });

    // 3. Generate idempotency key (§33)
    const idempotencyKey = await generateIdempotencyKey(
      proposal.workspaceId,
      proposal.id,
      proposal.version,
    );

    this.logger.info("execution.service.idempotency_key_generated", {
      idempotencyKey,
    });

    // 4. Idempotency check
    const existingAttempt = await this.dbService.getAttemptByIdempotencyKey(
      idempotencyKey,
      this.workspaceId,
    );

    if (existingAttempt) {
      this.logger.warn("execution.service.already_executed", {
        existingAttemptId: existingAttempt.id,
        existingStatus: existingAttempt.status,
      });

      return {
        attempt: existingAttempt,
        alreadyExecuted: true,
      };
    }

    // 5. Create execution attempt record (queued)
    const executionId = createId("exec");
    const queuedAttempt = await this.dbService.createAttempt({
      executionId,
      workspaceId: this.workspaceId,
      proposalId: proposal.id,
      idempotencyKey,
      capability: capability.name,
      provider: capability.provider,
      inputPayload: proposal.exactPayload,
      status: "queued",
    });

    this.logger.info("execution.service.attempt_created", {
      executionId: queuedAttempt.id,
      status: queuedAttempt.status,
    });

    // 6. Update to running status
    await this.dbService.updateAttemptStatus({
      executionId,
      workspaceId: this.workspaceId,
      status: "running",
      startedAt: new Date().toISOString(),
    });

    this.logger.info("execution.service.executing", {
      executionId,
    });

    try {
      // 7. Execute capability (external API call)
      // For MVP, use mock executors. Real executors would call actual APIs.
      const executorResponse = await executeMockCapability(capability, proposal.exactPayload);

      if (executorResponse.success) {
        // Success - update attempt
        const succeededAttempt = await this.dbService.updateAttemptStatus({
          executionId,
          workspaceId: this.workspaceId,
          status: "succeeded",
          completedAt: new Date().toISOString(),
          externalReference: executorResponse.externalReference,
          outputPayload: executorResponse.outputPayload,
        });

        this.logger.info("execution.service.succeeded", {
          executionId,
          externalReference: executorResponse.externalReference,
        });

        return {
          attempt: succeededAttempt,
          alreadyExecuted: false,
        };
      } else {
        // Failure - update attempt with error
        const failedAttempt = await this.dbService.updateAttemptStatus({
          executionId,
          workspaceId: this.workspaceId,
          status: "failed",
          completedAt: new Date().toISOString(),
          errorCode: executorResponse.errorCode,
          errorMessage: executorResponse.errorMessage,
        });

        this.logger.error("execution.service.failed", {
          executionId,
          errorCode: executorResponse.errorCode,
          errorMessage: executorResponse.errorMessage,
        });

        return {
          attempt: failedAttempt,
          alreadyExecuted: false,
        };
      }
    } catch (err) {
      // Unexpected error during execution
      const error = err instanceof Error ? err : new Error("Unknown error");

      this.logger.error("execution.service.exception", {
        executionId,
        error: error.message,
      });

      const failedAttempt = await this.dbService.updateAttemptStatus({
        executionId,
        workspaceId: this.workspaceId,
        status: "failed",
        completedAt: new Date().toISOString(),
        errorCode: "EXECUTION_EXCEPTION",
        errorMessage: error.message,
      });

      return {
        attempt: failedAttempt,
        alreadyExecuted: false,
      };
    }
  }
}

/**
 * Create execution service with configuration
 */
export function createExecutionService(
  supabase: SupabaseClient,
  config: ExecutionServiceConfig,
  logger?: ExecutionServiceLogger,
): ExecutionService {
  return new ExecutionService(supabase, config, logger);
}

