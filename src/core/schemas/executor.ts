import { z } from "zod";
import { ExecutionAttemptSchema, type ExecutionAttempt } from "./execution-attempt";
import { type PolicyDecision } from "./policy-engine";

export const ExecutorResultSchema = z.object({
  attempt: ExecutionAttemptSchema,
  verified: z.boolean().default(false),
  message: z.string().trim().min(1).optional(),
});

export type ExecutorResult = z.infer<typeof ExecutorResultSchema>;

export type ApprovalWorkflowState = {
  proposalId: string;
  state: "pending" | "approved" | "edited" | "rejected";
  proposalStatus: "pending" | "approved" | "edited" | "rejected" | "expired" | "executed" | "failed";
  policyDecision?: PolicyDecision;
  requiresApproval?: boolean;
  actorId?: string;
  reason?: string;
  decidedAt: string;
  history?: Array<{ decision: "pending" | "approved" | "edited" | "rejected"; actorId?: string; reason?: string; decidedAt: string }>;
};

export const Executor = {
  execute(input: {
    proposal: {
      id: string;
      workspaceId: string;
      actionPlanId: string;
      actionType: string;
      exactPayload: unknown;
      destination?: string;
      recipient?: string;
      scheduledFor?: string;
      riskClass: "read" | "draft" | "external_write" | "financial" | "destructive";
      evidenceRefs?: Array<{ id: string; type: string; source: string; uri?: string }>;
      status: "pending" | "approved" | "edited" | "rejected" | "expired" | "executed" | "failed";
      policyDecision?: PolicyDecision;
      createdAt?: string;
      expiresAt?: string;
    };
    approvalWorkflow?: ApprovalWorkflowState;
    provider: string;
    idempotencyKey: string;
  }): ExecutorResult {
    if (input.proposal.status !== "approved") {
      throw new Error("Executor requires an approved proposal before execution.");
    }

    if (!input.proposal.policyDecision || input.proposal.policyDecision.allowed !== true || input.proposal.policyDecision.status !== "approved") {
      throw new Error("Executor requires a policy-approved proposal before execution.");
    }

    if (!input.approvalWorkflow) {
      throw new Error("Executor requires a persisted approval workflow before execution.");
    }

    if (input.approvalWorkflow.proposalId !== input.proposal.id) {
      throw new Error("Executor requires the approval workflow to match the proposal being executed.");
    }

    if (input.approvalWorkflow.state !== "approved" || input.approvalWorkflow.proposalStatus !== "approved") {
      throw new Error("Executor requires an approved approval workflow before execution.");
    }

    if (!input.approvalWorkflow.policyDecision || input.approvalWorkflow.policyDecision.allowed !== true || input.approvalWorkflow.policyDecision.status !== "approved") {
      throw new Error("Executor requires a policy-approved approval workflow before execution.");
    }

    const attempt: ExecutionAttempt = {
      id: `exec_${Date.now()}`,
      proposalId: input.proposal.id,
      idempotencyKey: input.idempotencyKey,
      provider: input.provider,
      status: "queued",
    };

    return ExecutorResultSchema.parse({
      attempt,
      verified: false,
      message: "Execution queued for provider dispatch.",
    });
  },
};
