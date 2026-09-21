import { z } from "zod";
import { PolicyDecisionSchema } from "./policy-engine";

export const ProposalEvidenceRefSchema = z.object({
  id: z.string().trim().min(1),
  type: z.string().trim().min(1),
  source: z.string().trim().min(1),
  uri: z.string().url().optional(),
});

export const ActionProposalSchema = z.object({
  id: z.string().trim().min(1),
  workspaceId: z.string().trim().min(1),
  actionPlanId: z.string().trim().min(1),
  actionType: z.string().trim().min(1),
  exactPayload: z.unknown(),
  destination: z.string().trim().min(1).optional(),
  recipient: z.string().trim().min(1).optional(),
  scheduledFor: z.string().min(1).optional(),
  riskClass: z.enum(["read", "draft", "external_write", "financial", "destructive"]),
  evidenceRefs: z.array(ProposalEvidenceRefSchema).default([]),
  status: z.enum(["pending", "approved", "edited", "rejected", "expired", "executed", "failed"]),
  policyDecision: PolicyDecisionSchema.optional(),
  version: z.number().int().positive().default(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  expiresAt: z.string().min(1).optional(),
});

export type ActionProposal = z.infer<typeof ActionProposalSchema>;

export const ApprovalDecisionSchema = z.object({
  proposalId: z.string().trim().min(1),
  decision: z.enum(["approved", "rejected", "edited"]),
  actorId: z.string().trim().min(1),
  reason: z.string().trim().min(1).max(500),
  decidedAt: z.string().min(1),
});

export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;

export const ApprovalWorkflowHistoryEntrySchema = z.object({
  decision: z.enum(["pending", "approved", "edited", "rejected"]),
  actorId: z.string().trim().min(1).optional(),
  reason: z.string().trim().min(1).max(500).optional(),
  decidedAt: z.string().min(1),
});

export const ApprovalWorkflowSchema = z.object({
  proposalId: z.string().trim().min(1),
  state: z.enum(["pending", "approved", "edited", "rejected"]),
  proposalStatus: z.enum(["pending", "approved", "edited", "rejected", "expired", "executed", "failed"]),
  policyDecision: PolicyDecisionSchema.optional(),
  requiresApproval: z.boolean().default(true),
  actorId: z.string().trim().min(1).optional(),
  reason: z.string().trim().min(1).max(500).optional(),
  decidedAt: z.string().min(1).default(() => new Date().toISOString()),
  history: z.array(ApprovalWorkflowHistoryEntrySchema).default([]),
});

export type ApprovalWorkflow = z.infer<typeof ApprovalWorkflowSchema>;

export function createActionProposal(input: {
  id: string;
  workspaceId: string;
  actionPlanId: string;
  actionType: string;
  exactPayload: unknown;
  destination?: string | undefined;
  recipient?: string | undefined;
  scheduledFor?: string | undefined;
  riskClass: "read" | "draft" | "external_write" | "financial" | "destructive";
  evidenceRefs?: Array<{ id: string; type: string; source: string; uri?: string | undefined }> | undefined;
  status: "pending" | "approved" | "edited" | "rejected" | "expired" | "executed" | "failed";
  policyDecision?: z.infer<typeof PolicyDecisionSchema> | undefined;
  version?: number | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  expiresAt?: string | undefined;
}): ActionProposal {
  const now = new Date().toISOString();
  return ActionProposalSchema.parse({
    ...input,
    version: input.version ?? 1,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  });
}

export function bindPolicyDecisionToProposal(
  proposal: ActionProposal,
  policyDecision: z.infer<typeof PolicyDecisionSchema>,
): ActionProposal {
  const status = policyDecision.allowed
    ? policyDecision.status === "approved"
      ? "approved"
      : policyDecision.status === "pending"
        ? "pending"
        : "edited"
    : "rejected";

  return ActionProposalSchema.parse({
    ...proposal,
    status,
    policyDecision,
  });
}

export function createApprovalWorkflow(input: {
  proposalId: string;
  proposalStatus: "pending" | "approved" | "edited" | "rejected" | "expired" | "executed" | "failed";
  policyDecision?: z.infer<typeof PolicyDecisionSchema> | undefined;
  requiresApproval?: boolean | undefined;
  actorId?: string | undefined;
  reason?: string | undefined;
}): ApprovalWorkflow {
  const state = input.proposalStatus === "approved" ? "approved" : input.proposalStatus === "rejected" ? "rejected" : input.proposalStatus === "edited" ? "edited" : "pending";
  const decidedAt = new Date().toISOString();

  return ApprovalWorkflowSchema.parse({
    proposalId: input.proposalId,
    state,
    proposalStatus: input.proposalStatus,
    policyDecision: input.policyDecision,
    requiresApproval: input.requiresApproval ?? true,
    actorId: input.actorId,
    reason: input.reason,
    decidedAt,
    history: [
      {
        decision: state,
        actorId: input.actorId,
        reason: input.reason,
        decidedAt,
      },
    ],
  });
}

export function transitionApprovalWorkflow(
  workflow: ApprovalWorkflow,
  input: {
    decision: "pending" | "approved" | "edited" | "rejected";
    actorId?: string;
    reason?: string;
  },
): ApprovalWorkflow {
  const nextState = input.decision;
  const decidedAt = new Date().toISOString();

  const history = [
    ...workflow.history,
    {
      decision: nextState,
      actorId: input.actorId ?? workflow.actorId,
      reason: input.reason ?? workflow.reason,
      decidedAt,
    },
  ];

  return ApprovalWorkflowSchema.parse({
    ...workflow,
    state: nextState,
    proposalStatus: nextState === "approved" ? "approved" : nextState === "rejected" ? "rejected" : nextState === "edited" ? "edited" : "pending",
    actorId: input.actorId ?? workflow.actorId,
    reason: input.reason ?? workflow.reason,
    decidedAt,
    history,
  });
}
