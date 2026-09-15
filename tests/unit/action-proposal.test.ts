import { describe, expect, it } from "vitest";
import {
  ActionProposalSchema,
  ApprovalDecisionSchema,
  bindPolicyDecisionToProposal,
  createActionProposal,
  createApprovalWorkflow,
  transitionApprovalWorkflow,
} from "@/core/schemas/action-proposal";

describe("ActionProposal and approval", () => {
  it("accepts a valid proposal awaiting approval", () => {
    const result = ActionProposalSchema.safeParse({
      id: "proposal_123",
      workspaceId: "ws_123",
      actionPlanId: "plan_123",
      actionType: "message.send",
      exactPayload: { recipient: "ngozi@example.com", message: "Payment reminder" },
      destination: "sms",
      recipient: "ngozi@example.com",
      scheduledFor: "2026-09-15T09:00:00+01:00",
      riskClass: "draft",
      evidenceRefs: [{ id: "ev_1", type: "transcript", source: "speech_123" }],
      status: "pending",
      version: 1,
      createdAt: "2026-09-14T12:00:00.000Z",
      updatedAt: "2026-09-14T12:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("approves a proposal and stores the decision", () => {
    const proposal = createActionProposal({
      id: "proposal_456",
      workspaceId: "ws_123",
      actionPlanId: "plan_456",
      actionType: "message.send",
      exactPayload: { recipient: "ngozi@example.com", message: "Reminder" },
      destination: "sms",
      recipient: "ngozi@example.com",
      riskClass: "draft",
      evidenceRefs: [{ id: "ev_2", type: "transcript", source: "speech_456" }],
      status: "pending",
    });

    const approval = ApprovalDecisionSchema.parse({
      proposalId: proposal.id,
      decision: "approved",
      actorId: "user_123",
      reason: "Owner approved the reminder",
      decidedAt: new Date().toISOString(),
    });

    expect(proposal.status).toBe("pending");
    expect(approval.decision).toBe("approved");
  });

  it("rejects a proposal that is too risky", () => {
    const result = ActionProposalSchema.safeParse({
      id: "proposal_789",
      workspaceId: "ws_123",
      actionPlanId: "plan_789",
      actionType: "delete.customer",
      exactPayload: { customerId: "cust_123" },
      riskClass: "destructive",
      evidenceRefs: [{ id: "ev_3", type: "database", source: "customer_123" }],
      status: "rejected",
      version: 1,
      createdAt: "2026-09-14T12:00:00.000Z",
      updatedAt: "2026-09-14T12:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("binds policy evaluation to a proposal and creates an approval workflow", () => {
    const proposal = createActionProposal({
      id: "proposal_policy_123",
      workspaceId: "ws_123",
      actionPlanId: "plan_123",
      actionType: "message.send",
      exactPayload: { recipient: "ngozi@example.com", message: "Payment reminder" },
      riskClass: "draft",
      status: "pending",
    });

    const bound = bindPolicyDecisionToProposal(proposal, {
      allowed: true,
      status: "approved",
      reason: "low-risk action passed policy validation.",
      riskClass: "draft",
      actionType: "message.send",
      workspaceId: "ws_123",
      requiresApproval: true,
      evidenceRefs: [{ id: "ev_policy_1", type: "transcript", source: "speech_123" }],
    });

    expect(bound.status).toBe("approved");
    expect(bound.policyDecision?.allowed).toBe(true);

    const workflow = createApprovalWorkflow({
      proposalId: bound.id,
      proposalStatus: bound.status,
      policyDecision: bound.policyDecision,
      requiresApproval: true,
      actorId: "user_123",
      reason: "Owner approved after policy validation",
    });

    expect(workflow.state).toBe("approved");
    expect(workflow.proposalId).toBe(bound.id);
  });

  it("transitions an approval workflow through persisted decision states", () => {
    const workflow = createApprovalWorkflow({
      proposalId: "proposal_transition_1",
      proposalStatus: "pending",
      requiresApproval: true,
    });

    const approved = transitionApprovalWorkflow(workflow, {
      decision: "approved",
      actorId: "user_123",
      reason: "owner approved after review",
    });

    expect(approved.state).toBe("approved");
    expect(approved.history).toHaveLength(2);
    expect(approved.history[0]?.decision).toBe("pending");

    const rejected = transitionApprovalWorkflow(approved, {
      decision: "rejected",
      actorId: "user_123",
      reason: "action exceeded approval bounds",
    });

    expect(rejected.state).toBe("rejected");
    expect(rejected.history.at(-1)?.decision).toBe("rejected");
  });
});
