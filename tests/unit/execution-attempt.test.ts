import { describe, expect, it } from "vitest";
import { ExecutionAttemptSchema, createExecutionAttempt } from "@/core/schemas/execution-attempt";

describe("ExecutionAttempt", () => {
  it("accepts a queued execution attempt", () => {
    const parsed = ExecutionAttemptSchema.safeParse({
      id: "execution_123",
      proposalId: "proposal_123",
      idempotencyKey: "idem_123",
      provider: "sms",
      status: "queued",
      startedAt: "2026-09-15T09:00:00.000Z",
    });

    expect(parsed.success).toBe(true);
  });

  it("creates a successful execution record", () => {
    const attempt = createExecutionAttempt({
      id: "execution_456",
      proposalId: "proposal_456",
      idempotencyKey: "idem_456",
      provider: "whatsapp",
      status: "succeeded",
      externalReference: "msg_001",
      completedAt: "2026-09-15T09:01:00.000Z",
    });

    expect(attempt.status).toBe("succeeded");
    expect(attempt.externalReference).toBe("msg_001");
  });

  it("rejects a missing proposal id", () => {
    const parsed = ExecutionAttemptSchema.safeParse({
      id: "execution_789",
      proposalId: "",
      idempotencyKey: "idem_789",
      provider: "email",
      status: "running",
    });

    expect(parsed.success).toBe(false);
  });
});
