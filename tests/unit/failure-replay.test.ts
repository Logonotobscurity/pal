import { describe, expect, it } from "vitest";
import { FailureReplaySchema, createFailureReplay } from "@/core/schemas/failure-replay";

describe("FailureReplay", () => {
  it("accepts a replay record for a recorded failure", () => {
    const result = FailureReplaySchema.safeParse({
      id: "replay_123",
      executionAttemptId: "exec_123",
      failureType: "policy_blocked",
      rootCause: "Critical route was blocked by the policy engine.",
      inputSnapshot: { proposalId: "proposal_123", riskClass: "destructive" },
      status: "queued",
      replayer: "manual",
      createdAt: "2026-09-15T10:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("creates a replay record with sane defaults", () => {
    const replay = createFailureReplay({
      id: "replay_456",
      executionAttemptId: "exec_456",
      failureType: "verification_failed",
      rootCause: "External response did not match expected outcome.",
      inputSnapshot: { action: "send_message", recipient: "musa@example.com" },
      status: "running",
      replayer: "automated",
    });

    expect(replay.status).toBe("running");
    expect(replay.createdAt).toBeTruthy();
  });

  it("rejects invalid replay payloads", () => {
    const result = FailureReplaySchema.safeParse({
      id: "",
      executionAttemptId: "",
      failureType: "policy_blocked",
      rootCause: "",
      status: "queued",
      replayer: "manual",
    });

    expect(result.success).toBe(false);
  });
});
