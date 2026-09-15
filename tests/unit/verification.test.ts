import { describe, expect, it } from "vitest";
import { VerificationResultSchema, createVerificationResult } from "@/core/schemas/verification";

describe("VerificationResult", () => {
  it("accepts a verified execution result", () => {
    const result = VerificationResultSchema.safeParse({
      executionAttemptId: "exec_123",
      verified: true,
      status: "verified",
      externalReference: "msg_9282",
      expectedOutcome: "message sent to Musa",
      actualOutcome: "provider returned message ID msg_9282",
      checkedAt: "2026-09-15T10:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("creates a verification result with a sane default status", () => {
    const result = createVerificationResult({
      executionAttemptId: "exec_456",
      verified: false,
      expectedOutcome: "message sent to Musa",
      actualOutcome: "provider returned no message ID",
      notes: "External response did not match the expected action.",
    });

    expect(result.verified).toBe(false);
    expect(result.status).toBe("unverified");
  });

  it("rejects missing execution attempt id", () => {
    const result = VerificationResultSchema.safeParse({
      verified: true,
      status: "verified",
    });

    expect(result.success).toBe(false);
  });
});
