import { describe, expect, it } from "vitest";
import { Executor, ExecutorResultSchema } from "@/core/schemas/executor";

describe("Executor", () => {
  it("executes an approved proposal and creates an execution attempt", () => {
    const result = Executor.execute({
      proposal: {
        id: "proposal_exec_1",
        workspaceId: "ws_123",
        actionPlanId: "plan_123",
        actionType: "message.send",
        exactPayload: { recipient: "musa@example.com", message: "Reminder" },
        destination: "sms",
        recipient: "musa@example.com",
        riskClass: "draft",
        evidenceRefs: [{ id: "ev_1", type: "transcript", source: "speech_123" }],
        status: "approved",
        policyDecision: {
          allowed: true,
          status: "approved",
          reason: "low-risk action passed policy validation.",
          riskClass: "draft",
          actionType: "message.send",
          workspaceId: "ws_123",
          requiresApproval: true,
          evidenceRefs: [{ id: "ev_1", type: "transcript", source: "speech_123" }],
        },
        createdAt: "2026-09-15T10:00:00.000Z",
      },
      approvalWorkflow: {
        proposalId: "proposal_exec_1",
        state: "approved",
        proposalStatus: "approved",
        policyDecision: {
          allowed: true,
          status: "approved",
          reason: "low-risk action passed policy validation.",
          riskClass: "draft",
          actionType: "message.send",
          workspaceId: "ws_123",
          requiresApproval: true,
          evidenceRefs: [{ id: "ev_1", type: "transcript", source: "speech_123" }],
        },
        requiresApproval: true,
        actorId: "user_123",
        reason: "Owner approved the reminder",
        decidedAt: "2026-09-15T10:00:00.000Z",
        history: [{ decision: "approved", actorId: "user_123", reason: "Owner approved the reminder", decidedAt: "2026-09-15T10:00:00.000Z" }],
      },
      provider: "log",
      idempotencyKey: "key_exec_1",
    });

    expect(result.attempt.proposalId).toBe("proposal_exec_1");
    expect(result.attempt.status).toBe("queued");
    expect(result.attempt.provider).toBe("log");
  });

  it("refuses to execute a proposal that has not been approved", () => {
    expect(() =>
      Executor.execute({
        proposal: {
          id: "proposal_exec_2",
          workspaceId: "ws_123",
          actionPlanId: "plan_123",
          actionType: "message.send",
          exactPayload: { recipient: "musa@example.com", message: "Reminder" },
          riskClass: "draft",
          evidenceRefs: [],
          status: "pending",
          createdAt: "2026-09-15T10:00:00.000Z",
        },
        provider: "log",
        idempotencyKey: "key_exec_2",
      })
    ).toThrow(/approved/i);
  });

  it("refuses to execute a proposal without a valid policy decision", () => {
    expect(() =>
      Executor.execute({
        proposal: {
          id: "proposal_exec_policy_1",
          workspaceId: "ws_123",
          actionPlanId: "plan_123",
          actionType: "message.send",
          exactPayload: { recipient: "musa@example.com", message: "Reminder" },
          riskClass: "draft",
          evidenceRefs: [],
          status: "approved",
          policyDecision: {
            allowed: false,
            status: "rejected",
            reason: "Policy blocked the action.",
            riskClass: "draft",
            actionType: "message.send",
            workspaceId: "ws_123",
            evidenceRefs: [],
          },
          createdAt: "2026-09-15T10:00:00.000Z",
        },
        provider: "log",
        idempotencyKey: "key_exec_policy_1",
      })
    ).toThrow(/policy/i);
  });

  it("requires a matching persisted approval workflow before execution", () => {
    expect(() =>
      Executor.execute({
        proposal: {
          id: "proposal_exec_approval_1",
          workspaceId: "ws_123",
          actionPlanId: "plan_123",
          actionType: "message.send",
          exactPayload: { recipient: "musa@example.com", message: "Reminder" },
          riskClass: "draft",
          evidenceRefs: [],
          status: "approved",
          policyDecision: {
            allowed: true,
            status: "approved",
            reason: "low-risk action passed policy validation.",
            riskClass: "draft",
            actionType: "message.send",
            workspaceId: "ws_123",
            evidenceRefs: [],
          },
          createdAt: "2026-09-15T10:00:00.000Z",
        },
        approvalWorkflow: {
          proposalId: "proposal_exec_other_1",
          state: "pending",
          proposalStatus: "pending",
          policyDecision: {
            allowed: true,
            status: "approved",
            reason: "low-risk action passed policy validation.",
            riskClass: "draft",
            actionType: "message.send",
            workspaceId: "ws_123",
            evidenceRefs: [],
          },
          requiresApproval: true,
          history: [],
          decidedAt: "2026-09-15T10:00:00.000Z",
        },
        provider: "log",
        idempotencyKey: "key_exec_approval_1",
      })
    ).toThrow(/approval workflow|proposal/i);
  });

  it("validates the executor output contract", () => {
    const parsed = ExecutorResultSchema.safeParse({
      attempt: {
        id: "exec_123",
        proposalId: "proposal_exec_3",
        idempotencyKey: "key_exec_3",
        provider: "log",
        status: "queued",
      },
      verified: false,
    });

    expect(parsed.success).toBe(true);
  });
});
