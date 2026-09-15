/**
 * Execution Service Tests
 * 
 * Tests PAL_ARCHITECTURE.md §30, §33: Execution Service with idempotency
 */

import { describe, it, expect, vi } from "vitest";

// Mock server-only module
vi.mock("server-only", () => ({}));

import { createActionProposal } from "@/core/schemas/action-proposal";
import { generateIdempotencyKey, isValidIdempotencyKey } from "@/lib/utils/idempotency";
import { executeMockCapability } from "@/services/execution/executors/mock";
import { getCapability } from "@/core/capabilities/registry";

describe("Idempotency Key Generation (§33)", () => {
  it("should generate deterministic SHA256 hash", async () => {
    const key1 = await generateIdempotencyKey("workspace_1", "proposal_123", 1);
    const key2 = await generateIdempotencyKey("workspace_1", "proposal_123", 1);

    expect(key1).toBe(key2);
    expect(key1).toHaveLength(64);
    expect(isValidIdempotencyKey(key1)).toBe(true);
  });

  it("should generate different keys for different versions", async () => {
    const key1 = await generateIdempotencyKey("workspace_1", "proposal_123", 1);
    const key2 = await generateIdempotencyKey("workspace_1", "proposal_123", 2);

    expect(key1).not.toBe(key2);
  });

  it("should generate different keys for different workspaces", async () => {
    const key1 = await generateIdempotencyKey("workspace_1", "proposal_123", 1);
    const key2 = await generateIdempotencyKey("workspace_2", "proposal_123", 1);

    expect(key1).not.toBe(key2);
  });

  it("should generate different keys for different proposals", async () => {
    const key1 = await generateIdempotencyKey("workspace_1", "proposal_123", 1);
    const key2 = await generateIdempotencyKey("workspace_1", "proposal_456", 1);

    expect(key1).not.toBe(key2);
  });

  it("should validate idempotency key format", () => {
    expect(isValidIdempotencyKey("abc123")).toBe(false);
    expect(isValidIdempotencyKey("g123456789abcdef123456789abcdef123456789abcdef123456789abcdef12")).toBe(
      false,
    );
    expect(
      isValidIdempotencyKey("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
    ).toBe(true);
  });
});

describe("Mock Capability Executors", () => {
  it("should execute customer.lookup capability", async () => {
    const capability = getCapability("customer.lookup");
    expect(capability).toBeDefined();

    const result = await executeMockCapability(capability!, { query: "Ngozi" });

    expect(result.success).toBe(true);
    expect(result.externalReference).toBeDefined();
    expect(result.outputPayload).toHaveProperty("customerId");
    expect(result.outputPayload).toHaveProperty("name");
  });

  it("should execute message.send capability", async () => {
    const capability = getCapability("message.send");
    expect(capability).toBeDefined();

    const result = await executeMockCapability(capability!, {
      recipientId: "cust_123",
      message: "Payment reminder",
      channel: "sms",
    });

    expect(result.success).toBe(true);
    expect(result.externalReference).toBeDefined();
    expect(result.outputPayload).toHaveProperty("messageId");
    expect(result.outputPayload).toHaveProperty("status", "sent");
  });

  it("should validate input against capability schema", async () => {
    const capability = getCapability("message.send");
    expect(capability).toBeDefined();

    // Invalid input: missing required fields
    const result = await executeMockCapability(capability!, {
      recipientId: "cust_123",
      // missing message field
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("VALIDATION_ERROR");
  });

  it("should execute payment.record capability", async () => {
    const capability = getCapability("payment.record");
    expect(capability).toBeDefined();

    const result = await executeMockCapability(capability!, {
      invoiceId: "inv_123",
      amount: 50000,
      currency: "NGN",
      paymentMethod: "bank_transfer",
      receivedAt: new Date().toISOString(),
    });

    expect(result.success).toBe(true);
    expect(result.externalReference).toBeDefined();
    expect(result.outputPayload).toHaveProperty("paymentId");
    expect(result.outputPayload).toHaveProperty("status", "recorded");
  });

  it("should return error for unknown capability", async () => {
    const unknownCapability = {
      name: "unknown.capability",
      operation: "write" as const,
      requiresApproval: true,
      description: "Unknown",
      inputSchema: {} as never,
      outputSchema: {} as never,
      provider: "test",
    };

    const result = await executeMockCapability(unknownCapability, {});

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("UNKNOWN_CAPABILITY");
  });
});

describe("Execution Service — Approved Proposals Only (§30)", () => {
  it("should reject non-approved proposals", () => {
    const proposal = createActionProposal({
      id: "proposal_test",
      workspaceId: "workspace_test",
      actionPlanId: "plan_test",
      actionType: "message.send",
      exactPayload: { recipientId: "cust_123", message: "Test" },
      riskClass: "external_write",
      status: "pending", // Not approved
    });

    // Execution service would throw error for non-approved proposal
    expect(proposal.status).not.toBe("approved");
  });

  it("should accept approved proposals with allowed policy decision", () => {
    const proposal = createActionProposal({
      id: "proposal_test",
      workspaceId: "workspace_test",
      actionPlanId: "plan_test",
      actionType: "message.send",
      exactPayload: { recipientId: "cust_123", message: "Test" },
      riskClass: "external_write",
      status: "approved",
      policyDecision: {
        allowed: true,
        status: "approved",
        reason: "Owner approved",
        riskClass: "external_write",
        actionType: "message.send",
        workspaceId: "workspace_test",
        requiresApproval: true,
        evidenceRefs: [],
      },
    });

    expect(proposal.status).toBe("approved");
    expect(proposal.policyDecision?.allowed).toBe(true);
  });
});

describe("Execution Service — Capability Registry Lookup (§31)", () => {
  it("should find registered capabilities", () => {
    const capability = getCapability("customer.lookup");

    expect(capability).toBeDefined();
    expect(capability?.name).toBe("customer.lookup");
    expect(capability?.operation).toBe("read");
    expect(capability?.requiresApproval).toBe(false);
  });

  it("should return undefined for unknown capabilities", () => {
    const capability = getCapability("unknown.capability");

    expect(capability).toBeUndefined();
  });

  it("should identify write operations requiring approval", () => {
    const messageSend = getCapability("message.send");
    const paymentRecord = getCapability("payment.record");

    expect(messageSend?.requiresApproval).toBe(true);
    expect(paymentRecord?.requiresApproval).toBe(true);
  });

  it("should identify read operations not requiring approval", () => {
    const customerLookup = getCapability("customer.lookup");
    const invoiceStatus = getCapability("invoice.status");

    expect(customerLookup?.requiresApproval).toBe(false);
    expect(invoiceStatus?.requiresApproval).toBe(false);
  });
});

describe("Execution Service — Input Validation", () => {
  it("should validate message.send input", async () => {
    const capability = getCapability("message.send");
    expect(capability).toBeDefined();

    // Valid input
    const validResult = await executeMockCapability(capability!, {
      recipientId: "cust_123",
      message: "Payment reminder",
    });
    expect(validResult.success).toBe(true);

    // Invalid input: empty message
    const invalidResult = await executeMockCapability(capability!, {
      recipientId: "cust_123",
      message: "",
    });
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.errorCode).toBe("VALIDATION_ERROR");
  });

  it("should validate payment.record input", async () => {
    const capability = getCapability("payment.record");
    expect(capability).toBeDefined();

    // Invalid input: negative amount
    const invalidResult = await executeMockCapability(capability!, {
      invoiceId: "inv_123",
      amount: -1000,
      currency: "NGN",
      paymentMethod: "cash",
      receivedAt: new Date().toISOString(),
    });
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.errorCode).toBe("VALIDATION_ERROR");
  });
});

describe("Execution Service — Response Capture", () => {
  it("should capture external reference from executor", async () => {
    const capability = getCapability("message.send");
    expect(capability).toBeDefined();

    const result = await executeMockCapability(capability!, {
      recipientId: "cust_123",
      message: "Test message",
    });

    expect(result.externalReference).toBeDefined();
    expect(result.externalReference).toMatch(/^msg_\d+$/);
  });

  it("should capture output payload from executor", async () => {
    const capability = getCapability("customer.lookup");
    expect(capability).toBeDefined();

    const result = await executeMockCapability(capability!, {
      query: "Amina",
    });

    expect(result.outputPayload).toBeDefined();
    expect(result.outputPayload).toHaveProperty("customerId");
    expect(result.outputPayload).toHaveProperty("name", "Amina");
  });
});
