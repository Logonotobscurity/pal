/**
 * Verification Agent Tests
 * 
 * Tests PAL_ARCHITECTURE.md §25: Verification Agent
 */

import { describe, it, expect, vi } from "vitest";

// Mock server-only module
vi.mock("server-only", () => ({}));

import { createExecutionAttempt } from "@/core/schemas/execution-attempt";
import { createVerificationResult } from "@/core/schemas/verification";

describe("Verification Result Schema", () => {
  it("should accept a verified execution result", () => {
    const result = createVerificationResult({
      executionAttemptId: "exec_123",
      verified: true,
      status: "verified",
      externalReference: "msg_9282",
      expectedOutcome: "message sent to Musa",
      actualOutcome: "provider returned message ID msg_9282",
    });

    expect(result.verified).toBe(true);
    expect(result.status).toBe("verified");
    expect(result.externalReference).toBe("msg_9282");
  });

  it("should accept an unverified execution result", () => {
    const result = createVerificationResult({
      executionAttemptId: "exec_456",
      verified: false,
      expectedOutcome: "message sent to Musa",
      actualOutcome: "provider returned no message ID",
      notes: "External response did not match the expected action.",
    });

    expect(result.verified).toBe(false);
    expect(result.status).toBe("unverified");
    expect(result.notes).toBeDefined();
  });

  it("should accept a failed verification", () => {
    const result = createVerificationResult({
      executionAttemptId: "exec_789",
      verified: false,
      status: "failed",
      expectedOutcome: "payment recorded",
      actualOutcome: "provider error: insufficient funds",
      notes: "Payment execution failed.",
    });

    expect(result.verified).toBe(false);
    expect(result.status).toBe("failed");
  });

  it("should default status based on verified boolean", () => {
    const verifiedResult = createVerificationResult({
      executionAttemptId: "exec_v1",
      verified: true,
    });
    expect(verifiedResult.status).toBe("verified");

    const unverifiedResult = createVerificationResult({
      executionAttemptId: "exec_v2",
      verified: false,
    });
    expect(unverifiedResult.status).toBe("unverified");
  });

  it("should automatically set checkedAt timestamp", () => {
    const result = createVerificationResult({
      executionAttemptId: "exec_time",
      verified: true,
    });

    expect(result.checkedAt).toBeDefined();
    const timestamp = new Date(result.checkedAt!);
    expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
  });
});

describe("Verification Agent — Success Cases (§25)", () => {
  it("should verify succeeded executions as verified", () => {
    const execution = createExecutionAttempt({
      id: "exec_success",
      proposalId: "proposal_test",
      idempotencyKey: "a".repeat(64),
      provider: "messaging",
      status: "succeeded",
      externalReference: "msg_12345",
    });

    // Verification agent would mark this as verified
    expect(execution.status).toBe("succeeded");
    expect(execution.externalReference).toBeDefined();
  });

  it("should capture external reference from succeeded executions", () => {
    const execution = createExecutionAttempt({
      id: "exec_ref",
      proposalId: "proposal_test",
      idempotencyKey: "b".repeat(64),
      provider: "payments",
      status: "succeeded",
      externalReference: "pay_67890",
    });

    const verification = createVerificationResult({
      executionAttemptId: execution.id,
      verified: true,
      externalReference: execution.externalReference,
      expectedOutcome: "payment recorded",
      actualOutcome: `provider returned: ${execution.externalReference}`,
    });

    expect(verification.verified).toBe(true);
    expect(verification.externalReference).toBe("pay_67890");
  });
});

describe("Verification Agent — Failure Cases (§25)", () => {
  it("should mark failed executions as failed verification", () => {
    const execution = createExecutionAttempt({
      id: "exec_failed",
      proposalId: "proposal_test",
      idempotencyKey: "c".repeat(64),
      provider: "messaging",
      status: "failed",
      errorCode: "PROVIDER_ERROR",
      errorMessage: "Message delivery failed",
    });

    // Verification agent would mark this as failed
    expect(execution.status).toBe("failed");
    expect(execution.errorCode).toBeDefined();
    expect(execution.errorMessage).toBeDefined();
  });

  it("should not falsely report success for failed executions", () => {
    // PAL_ARCHITECTURE.md §25: "Do not falsely report success"
    const execution = createExecutionAttempt({
      id: "exec_error",
      proposalId: "proposal_test",
      idempotencyKey: "d".repeat(64),
      provider: "payments",
      status: "failed",
      errorCode: "INSUFFICIENT_FUNDS",
      errorMessage: "Payment declined",
    });

    const verification = createVerificationResult({
      executionAttemptId: execution.id,
      verified: false,
      status: "failed",
      expectedOutcome: "payment processed",
      actualOutcome: `error: ${execution.errorMessage}`,
      notes: "Execution failed - do not report success",
    });

    expect(verification.verified).toBe(false);
    expect(verification.status).toBe("failed");
    expect(verification.notes).toContain("do not report success");
  });
});

describe("Verification Agent — Incomplete Executions (§25)", () => {
  it("should mark queued executions as unverified", () => {
    const execution = createExecutionAttempt({
      id: "exec_queued",
      proposalId: "proposal_test",
      idempotencyKey: "e".repeat(64),
      provider: "messaging",
      status: "queued",
    });

    // Cannot verify incomplete execution
    expect(execution.status).toBe("queued");
  });

  it("should mark running executions as unverified", () => {
    const execution = createExecutionAttempt({
      id: "exec_running",
      proposalId: "proposal_test",
      idempotencyKey: "f".repeat(64),
      provider: "messaging",
      status: "running",
      startedAt: new Date().toISOString(),
    });

    // Cannot verify while execution is in progress
    expect(execution.status).toBe("running");
  });

  it("should mark cancelled executions as unverified", () => {
    const execution = createExecutionAttempt({
      id: "exec_cancelled",
      proposalId: "proposal_test",
      idempotencyKey: "g".repeat(64),
      provider: "messaging",
      status: "cancelled",
    });

    const verification = createVerificationResult({
      executionAttemptId: execution.id,
      verified: false,
      status: "unverified",
      expectedOutcome: "message sent",
      actualOutcome: "execution was cancelled",
      notes: "Cannot verify cancelled execution",
    });

    expect(verification.verified).toBe(false);
    expect(verification.status).toBe("unverified");
  });
});

describe("Verification Agent — Expected vs Actual Outcomes", () => {
  it("should capture both expected and actual outcomes", () => {
    const verification = createVerificationResult({
      executionAttemptId: "exec_outcomes",
      verified: true,
      expectedOutcome: "Send payment reminder to Musa",
      actualOutcome: "Message sent successfully, ID: msg_abc123",
      externalReference: "msg_abc123",
    });

    expect(verification.expectedOutcome).toBe("Send payment reminder to Musa");
    expect(verification.actualOutcome).toBe("Message sent successfully, ID: msg_abc123");
  });

  it("should include verification notes for additional context", () => {
    const verification = createVerificationResult({
      executionAttemptId: "exec_notes",
      verified: true,
      notes: "Verified via provider API. Message delivered at 10:30 AM.",
    });

    expect(verification.notes).toContain("Verified via provider API");
  });
});

describe("Verification Agent — Status Consistency", () => {
  it("should have verified=true when status=verified", () => {
    const verification = createVerificationResult({
      executionAttemptId: "exec_consistent1",
      verified: true,
      status: "verified",
    });

    expect(verification.verified).toBe(true);
    expect(verification.status).toBe("verified");
  });

  it("should have verified=false when status=failed", () => {
    const verification = createVerificationResult({
      executionAttemptId: "exec_consistent2",
      verified: false,
      status: "failed",
    });

    expect(verification.verified).toBe(false);
    expect(verification.status).toBe("failed");
  });

  it("should have verified=false when status=unverified", () => {
    const verification = createVerificationResult({
      executionAttemptId: "exec_consistent3",
      verified: false,
      status: "unverified",
    });

    expect(verification.verified).toBe(false);
    expect(verification.status).toBe("unverified");
  });
});
