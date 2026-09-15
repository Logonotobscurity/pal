import { z } from "zod";

export const PolicyDecisionSchema = z.object({
  allowed: z.boolean(),
  status: z.enum(["approved", "pending", "rejected", "edited"]),
  reason: z.string().trim().min(1).max(500),
  riskClass: z.enum(["read", "draft", "external_write", "financial", "destructive"]),
  actionType: z.string().trim().min(1),
  workspaceId: z.string().trim().min(1),
  requiresApproval: z.boolean().optional(),
  evidenceRefs: z.array(z.object({ id: z.string().trim().min(1), type: z.string().trim().min(1), source: z.string().trim().min(1) })).default([]),
});

export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

export const PolicyEngine = {
  evaluate(input: {
    riskClass: "read" | "draft" | "external_write" | "financial" | "destructive";
    actionType: string;
    workspaceId: string;
    requiresApproval?: boolean;
    evidenceRefs?: Array<{ id: string; type: string; source: string }>;
  }): PolicyDecision {
    const lowRisk = ["read", "draft"].includes(input.riskClass);
    const destructive = input.riskClass === "destructive";
    const financial = input.riskClass === "financial";

    if (destructive) {
      return PolicyDecisionSchema.parse({
        allowed: false,
        status: "rejected",
        reason: "High-risk destructive action is blocked by policy.",
        riskClass: input.riskClass,
        actionType: input.actionType,
        workspaceId: input.workspaceId,
        requiresApproval: input.requiresApproval ?? true,
        evidenceRefs: input.evidenceRefs ?? [],
      });
    }

    if (financial) {
      return PolicyDecisionSchema.parse({
        allowed: false,
        status: "pending",
        reason: "Financial action requires explicit approval before execution.",
        riskClass: input.riskClass,
        actionType: input.actionType,
        workspaceId: input.workspaceId,
        requiresApproval: input.requiresApproval ?? true,
        evidenceRefs: input.evidenceRefs ?? [],
      });
    }

    return PolicyDecisionSchema.parse({
      allowed: true,
      status: "approved",
      reason: lowRisk ? "low-risk action passed policy validation." : "Action approved with approval gate.",
      riskClass: input.riskClass,
      actionType: input.actionType,
      workspaceId: input.workspaceId,
      requiresApproval: input.requiresApproval ?? true,
      evidenceRefs: input.evidenceRefs ?? [],
    });
  },
};
