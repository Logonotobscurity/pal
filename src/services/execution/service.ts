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
import { executeCapability } from "./executors";

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

  async execute(proposal: ActionProposal): Promise<ExecutionResult> {
    this.logger.info("execution.service.starting", {
      proposalId: proposal.id,
      actionType: proposal.actionType,
      status: proposal.status,
    });

    if (proposal.status !== "approved") {
      throw new Error(`Cannot execute proposal with status: ${proposal.status}`);
    }

    if (!proposal.policyDecision?.allowed) {
      throw new Error("Cannot execute proposal that was not allowed by policy");
    }

    const capability = getCapability(proposal.actionType);
    if (!capability) {
      throw new Error(`Unknown capability: ${proposal.actionType}`);
    }

    this.logger.info("execution.service.capability_found", {
      capability: capability.name,
      operation: capability.operation,
      provider: capability.provider,
    });

    const idempotencyKey = await generateIdempotencyKey(
      proposal.workspaceId,
      proposal.id,
      proposal.version,
    );

    this.logger.info("execution.service.idempotency_key_generated", {
      idempotencyKey,
    });

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
      const executorResponse = await executeCapability(capability, proposal.exactPayload);

      if (executorResponse.success) {
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

export function createExecutionService(
  supabase: SupabaseClient,
  config: ExecutionServiceConfig,
  logger?: ExecutionServiceLogger,
): ExecutionService {
  return new ExecutionService(supabase, config, logger);
}
