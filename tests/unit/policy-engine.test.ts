/**
 * Policy Engine Tests
 * 
 * Tests PAL_ARCHITECTURE.md §26-28: Deterministic policy engine with
 * critical field blocking and risk-based approval requirements
 */

import { describe, it, expect, vi } from "vitest";

// Mock server-only module
vi.mock("server-only", () => ({}));

import { createMeaningState } from "@/core/schemas/meaning-state";
import { createActionPlan } from "@/core/schemas/action-plan";
import { createWorkflowIR } from "@/core/schemas/workflow-ir";
import {
  createPolicyEngine,
  CRITICAL_FIELDS,
  POLICY_MATRIX,
} from "@/services/policy/engine";

describe("Policy Engine — Policy Matrix (§27)", () => {
  it("should define correct policy rules for each risk class", () => {
    expect(POLICY_MATRIX.read.automatic).toBe(true);
    expect(POLICY_MATRIX.read.requiresApproval).toBe(false);

    expect(POLICY_MATRIX.draft.automatic).toBe(true);
    expect(POLICY_MATRIX.draft.requiresApproval).toBe(false);

    expect(POLICY_MATRIX.external_write.automatic).toBe(false);
    expect(POLICY_MATRIX.external_write.requiresApproval).toBe(true);

    expect(POLICY_MATRIX.financial.automatic).toBe(false);
    expect(POLICY_MATRIX.financial.requiresApproval).toBe(true);

    expect(POLICY_MATRIX.destructive.automatic).toBe(false);
    expect(POLICY_MATRIX.destructive.requiresApproval).toBe(true);
  });
});

describe("Policy Engine — Critical Fields (§28)", () => {
  it("should define all critical fields", () => {
    expect(CRITICAL_FIELDS).toContain("recipient");
    expect(CRITICAL_FIELDS).toContain("amount");
    expect(CRITICAL_FIELDS).toContain("currency");
    expect(CRITICAL_FIELDS).toContain("date");
    expect(CRITICAL_FIELDS).toContain("time");
    expect(CRITICAL_FIELDS).toContain("negation");
    expect(CRITICAL_FIELDS).toContain("payment_status");
    expect(CRITICAL_FIELDS).toContain("destination");
    expect(CRITICAL_FIELDS).toContain("customer");
    expect(CRITICAL_FIELDS).toContain("invoice");
  });
});

describe("Policy Engine — Read Operations", () => {
  it("should approve read operations automatically without approval", () => {
    const meaningState = createMeaningState({
      id: "meaning_test",
      speechEventId: "speech_test",
      intent: { type: "customer_lookup", summary: "Look up customer", confidence: 0.95 },
      entities: [{ name: "customer", value: "Ngozi", type: "person", confidence: 0.98 }],
      confidence: { overall: 0.95 },
      contextSufficiency: "sufficient",
      model: { provider: "openai", model: "gpt-4o-mini", version: "1.0" },
    });

    const actionPlan = createActionPlan({
      id: "plan_test",
      meaningStateId: meaningState.id,
      workflowIR: createWorkflowIR({
        nodes: [{ id: "lookup", type: "agent", capability: "customer.lookup" }],
      }),
      steps: [
        {
          id: "step_1",
          type: "read",
          capability: "customer.lookup",
          description: "Look up customer",
          parameters: { query: "Ngozi" },
        },
      ],
      sideEffectClass: "none",
      requiresApproval: false,
      rationaleSummary: "Customer lookup",
      generatedBy: { agent: "workflow-agent", model: "gpt-4o-mini", version: "1.0" },
    });

    const engine = createPolicyEngine({ workspaceId: "workspace_test" });
    const proposal = engine.evaluate({ actionPlan, meaningState, workspaceId: "workspace_test" });

    expect(proposal.status).toBe("approved");
    expect(proposal.policyDecision?.allowed).toBe(true);
    expect(proposal.policyDecision?.requiresApproval).toBe(false);
    expect(proposal.riskClass).toBe("read"); // "none" sideEffectClass maps to "read" riskClass
  });
});

describe("Policy Engine — Draft Operations", () => {
  it("should approve draft operations automatically without approval", () => {
    const meaningState = createMeaningState({
      id: "meaning_test",
      speechEventId: "speech_test",
      intent: { type: "send_message", summary: "Draft message", confidence: 0.95 },
      entities: [{ name: "customer", value: "Musa", type: "person", confidence: 0.98 }],
      confidence: { overall: 0.95 },
      contextSufficiency: "sufficient",
      model: { provider: "openai", model: "gpt-4o-mini", version: "1.0" },
    });

    const actionPlan = createActionPlan({
      id: "plan_test",
      meaningStateId: meaningState.id,
      workflowIR: createWorkflowIR({
        nodes: [{ id: "draft", type: "agent", capability: "message.draft" }],
      }),
      steps: [
        {
          id: "step_1",
          type: "draft",
          capability: "message.draft",
          description: "Draft message",
          parameters: {},
        },
      ],
      sideEffectClass: "draft",
      requiresApproval: false,
      rationaleSummary: "Draft message",
      generatedBy: { agent: "workflow-agent", model: "gpt-4o-mini", version: "1.0" },
    });

    const engine = createPolicyEngine({ workspaceId: "workspace_test" });
    const proposal = engine.evaluate({ actionPlan, meaningState, workspaceId: "workspace_test" });

    expect(proposal.status).toBe("approved");
    expect(proposal.policyDecision?.allowed).toBe(true);
    expect(proposal.policyDecision?.requiresApproval).toBe(false);
    expect(proposal.riskClass).toBe("draft");
  });
});

describe("Policy Engine — External Write Operations", () => {
  it("should require approval for external write operations", () => {
    const meaningState = createMeaningState({
      id: "meaning_test",
      speechEventId: "speech_test",
      intent: { type: "send_message", summary: "Send message", confidence: 0.95 },
      entities: [
        { name: "recipient", value: "Musa", type: "person", confidence: 0.98 },
        { name: "amount", value: "₦85,000", type: "money", confidence: 0.99 },
      ],
      confidence: { overall: 0.95 },
      contextSufficiency: "sufficient",
      model: { provider: "openai", model: "gpt-4o-mini", version: "1.0" },
    });

    const actionPlan = createActionPlan({
      id: "plan_test",
      meaningStateId: meaningState.id,
      workflowIR: createWorkflowIR({
        nodes: [
          { id: "approval", type: "approval" },
          { id: "send", type: "action", capability: "message.send" },
        ],
        edges: [{ from: "approval", to: "send" }],
      }),
      steps: [
        {
          id: "step_1",
          type: "write",
          capability: "message.send",
          description: "Send message",
          parameters: {},
          requiresApproval: true,
        },
      ],
      sideEffectClass: "external_write",
      requiresApproval: true,
      rationaleSummary: "Send message",
      generatedBy: { agent: "workflow-agent", model: "gpt-4o-mini", version: "1.0" },
    });

    const engine = createPolicyEngine({ workspaceId: "workspace_test" });
    const proposal = engine.evaluate({ actionPlan, meaningState, workspaceId: "workspace_test" });

    expect(proposal.status).toBe("pending");
    expect(proposal.policyDecision?.allowed).toBe(false);
    expect(proposal.policyDecision?.status).toBe("pending");
    expect(proposal.policyDecision?.requiresApproval).toBe(true);
    expect(proposal.riskClass).toBe("external_write");
    expect(proposal.policyDecision?.reason).toContain("requires owner approval");
  });

  it("CRITICAL TEST: should never allow external write without approval", () => {
    // This test ensures no external_write capability can bypass approval (user requirement)
    const meaningState = createMeaningState({
      id: "meaning_test",
      speechEventId: "speech_test",
      intent: { type: "send_message", summary: "Send message", confidence: 0.95 },
      entities: [{ name: "recipient", value: "Musa", type: "person", confidence: 0.98 }],
      confidence: { overall: 0.95 },
      contextSufficiency: "sufficient",
      model: { provider: "openai", model: "gpt-4o-mini", version: "1.0" },
    });

    const actionPlan = createActionPlan({
      id: "plan_test",
      meaningStateId: meaningState.id,
      workflowIR: createWorkflowIR({
        nodes: [{ id: "send", type: "action", capability: "message.send" }],
      }),
      steps: [
        {
          id: "step_1",
          type: "write",
          capability: "message.send",
          description: "Send message",
          parameters: {},
        },
      ],
      sideEffectClass: "external_write",
      requiresApproval: true,
      rationaleSummary: "Send message",
      generatedBy: { agent: "workflow-agent", model: "gpt-4o-mini", version: "1.0" },
    });

    const engine = createPolicyEngine({ workspaceId: "workspace_test" });
    const proposal = engine.evaluate({ actionPlan, meaningState, workspaceId: "workspace_test" });

    // MUST NOT be approved automatically
    expect(proposal.status).not.toBe("approved");
    expect(proposal.policyDecision?.allowed).toBe(false);
    expect(proposal.policyDecision?.requiresApproval).toBe(true);
  });
});

describe("Policy Engine — Financial Operations", () => {
  it("should require approval for financial operations", () => {
    const meaningState = createMeaningState({
      id: "meaning_test",
      speechEventId: "speech_test",
      intent: { type: "other", summary: "Record payment", confidence: 0.95 },
      entities: [
        { name: "customer", value: "Amina", type: "person", confidence: 0.98 },
        { name: "amount", value: "₦50,000", type: "money", confidence: 0.99 },
        { name: "currency", value: "NGN", type: "other", confidence: 0.99 },
      ],
      confidence: { overall: 0.95 },
      contextSufficiency: "sufficient",
      model: { provider: "openai", model: "gpt-4o-mini", version: "1.0" },
    });

    const actionPlan = createActionPlan({
      id: "plan_test",
      meaningStateId: meaningState.id,
      workflowIR: createWorkflowIR({
        nodes: [
          { id: "approval", type: "approval" },
          { id: "record", type: "action", capability: "payment.record" },
        ],
        edges: [{ from: "approval", to: "record" }],
      }),
      steps: [
        {
          id: "step_1",
          type: "write",
          capability: "payment.record",
          description: "Record payment",
          parameters: {},
          requiresApproval: true,
        },
      ],
      sideEffectClass: "financial",
      requiresApproval: true,
      rationaleSummary: "Record payment",
      generatedBy: { agent: "workflow-agent", model: "gpt-4o-mini", version: "1.0" },
    });

    const engine = createPolicyEngine({ workspaceId: "workspace_test" });
    const proposal = engine.evaluate({ actionPlan, meaningState, workspaceId: "workspace_test" });

    expect(proposal.status).toBe("pending");
    expect(proposal.policyDecision?.allowed).toBe(false);
    expect(proposal.policyDecision?.status).toBe("pending");
    expect(proposal.policyDecision?.requiresApproval).toBe(true);
    expect(proposal.riskClass).toBe("financial");
    expect(proposal.policyDecision?.reason).toContain("Financial");
  });
});

describe("Policy Engine — Destructive Operations", () => {
  it("should block destructive operations in MVP", () => {
    const meaningState = createMeaningState({
      id: "meaning_test",
      speechEventId: "speech_test",
      intent: { type: "other", summary: "Delete data", confidence: 0.95 },
      entities: [{ name: "customer", value: "TestCustomer", type: "person", confidence: 0.98 }],
      confidence: { overall: 0.95 },
      contextSufficiency: "sufficient",
      model: { provider: "openai", model: "gpt-4o-mini", version: "1.0" },
    });

    const actionPlan = createActionPlan({
      id: "plan_test",
      meaningStateId: meaningState.id,
      workflowIR: createWorkflowIR({
        nodes: [{ id: "delete", type: "action", capability: "data.delete" }],
      }),
      steps: [
        {
          id: "step_1",
          type: "write",
          capability: "data.delete",
          description: "Delete data",
          parameters: {},
        },
      ],
      sideEffectClass: "destructive",
      requiresApproval: true,
      rationaleSummary: "Delete data",
      generatedBy: { agent: "workflow-agent", model: "gpt-4o-mini", version: "1.0" },
    });

    const engine = createPolicyEngine({ workspaceId: "workspace_test" });
    const proposal = engine.evaluate({ actionPlan, meaningState, workspaceId: "workspace_test" });

    expect(proposal.status).toBe("rejected");
    expect(proposal.policyDecision?.allowed).toBe(false);
    expect(proposal.policyDecision?.status).toBe("rejected");
    expect(proposal.riskClass).toBe("destructive");
    expect(proposal.policyDecision?.reason).toContain("blocked in MVP");
  });
});

describe("Policy Engine — Critical Field Blocking (§28)", () => {
  it("should block when critical field confidence is below threshold", () => {
    const meaningState = createMeaningState({
      id: "meaning_test",
      speechEventId: "speech_test",
      intent: { type: "send_message", summary: "Send message", confidence: 0.95 },
      entities: [
        { name: "recipient", value: "Uncertain Person", type: "person", confidence: 0.60 }, // Below 0.85 threshold
        { name: "amount", value: "₦100,000", type: "money", confidence: 0.99 },
      ],
      confidence: { overall: 0.95 },
      contextSufficiency: "sufficient",
      model: { provider: "openai", model: "gpt-4o-mini", version: "1.0" },
    });

    const actionPlan = createActionPlan({
      id: "plan_test",
      meaningStateId: meaningState.id,
      workflowIR: createWorkflowIR({
        nodes: [{ id: "send", type: "action", capability: "message.send" }],
      }),
      steps: [
        {
          id: "step_1",
          type: "write",
          capability: "message.send",
          description: "Send message",
          parameters: {},
        },
      ],
      sideEffectClass: "external_write",
      requiresApproval: true,
      rationaleSummary: "Send message",
      generatedBy: { agent: "workflow-agent", model: "gpt-4o-mini", version: "1.0" },
    });

    const engine = createPolicyEngine({ workspaceId: "workspace_test" });
    const proposal = engine.evaluate({ actionPlan, meaningState, workspaceId: "workspace_test" });

    expect(proposal.status).toBe("rejected");
    expect(proposal.policyDecision?.allowed).toBe(false);
    expect(proposal.policyDecision?.status).toBe("rejected");
    expect(proposal.policyDecision?.reason).toContain("Critical fields");
    expect(proposal.policyDecision?.reason).toContain("recipient");
  });

  it("should allow when all critical fields are confident", () => {
    const meaningState = createMeaningState({
      id: "meaning_test",
      speechEventId: "speech_test",
      intent: { type: "send_message", summary: "Send message", confidence: 0.95 },
      entities: [
        { name: "recipient", value: "Ngozi", type: "person", confidence: 0.98 }, // Above 0.85 threshold
        { name: "amount", value: "₦85,000", type: "money", confidence: 0.99 },
      ],
      confidence: { overall: 0.95 },
      contextSufficiency: "sufficient",
      model: { provider: "openai", model: "gpt-4o-mini", version: "1.0" },
    });

    const actionPlan = createActionPlan({
      id: "plan_test",
      meaningStateId: meaningState.id,
      workflowIR: createWorkflowIR({
        nodes: [
          { id: "approval", type: "approval" },
          { id: "send", type: "action", capability: "message.send" },
        ],
        edges: [{ from: "approval", to: "send" }],
      }),
      steps: [
        {
          id: "step_1",
          type: "write",
          capability: "message.send",
          description: "Send message",
          parameters: {},
          requiresApproval: true,
        },
      ],
      sideEffectClass: "external_write",
      requiresApproval: true,
      rationaleSummary: "Send message",
      generatedBy: { agent: "workflow-agent", model: "gpt-4o-mini", version: "1.0" },
    });

    const engine = createPolicyEngine({ workspaceId: "workspace_test" });
    const proposal = engine.evaluate({ actionPlan, meaningState, workspaceId: "workspace_test" });

    // Should require approval, not blocked
    expect(proposal.status).toBe("pending");
    expect(proposal.policyDecision?.status).toBe("pending");
    expect(proposal.policyDecision?.reason).not.toContain("Critical fields");
  });

  it("should allow read operations even with low confidence critical fields", () => {
    const meaningState = createMeaningState({
      id: "meaning_test",
      speechEventId: "speech_test",
      intent: { type: "customer_lookup", summary: "Look up customer", confidence: 0.95 },
      entities: [{ name: "customer", value: "Uncertain", type: "person", confidence: 0.50 }],
      confidence: { overall: 0.95 },
      contextSufficiency: "sufficient",
      model: { provider: "openai", model: "gpt-4o-mini", version: "1.0" },
    });

    const actionPlan = createActionPlan({
      id: "plan_test",
      meaningStateId: meaningState.id,
      workflowIR: createWorkflowIR({
        nodes: [{ id: "lookup", type: "agent", capability: "customer.lookup" }],
      }),
      steps: [
        {
          id: "step_1",
          type: "read",
          capability: "customer.lookup",
          description: "Look up customer",
          parameters: {},
        },
      ],
      sideEffectClass: "none",
      requiresApproval: false,
      rationaleSummary: "Customer lookup",
      generatedBy: { agent: "workflow-agent", model: "gpt-4o-mini", version: "1.0" },
    });

    const engine = createPolicyEngine({ workspaceId: "workspace_test" });
    const proposal = engine.evaluate({ actionPlan, meaningState, workspaceId: "workspace_test" });

    // Read operations can proceed even with low confidence
    expect(proposal.status).toBe("approved");
    expect(proposal.policyDecision?.allowed).toBe(true);
  });
});

describe("Policy Engine — Context Sufficiency", () => {
  it("should block when context is insufficient", () => {
    const meaningState = createMeaningState({
      id: "meaning_test",
      speechEventId: "speech_test",
      intent: { type: "send_message", summary: "Send message", confidence: 0.95 },
      entities: [{ name: "recipient", value: "Someone", type: "person", confidence: 0.98 }],
      ambiguities: [{ field: "recipient", description: "Recipient unclear", confidence: 0.60 }],
      confidence: { overall: 0.95 },
      contextSufficiency: "insufficient", // Insufficient context
      model: { provider: "openai", model: "gpt-4o-mini", version: "1.0" },
    });

    const actionPlan = createActionPlan({
      id: "plan_test",
      meaningStateId: meaningState.id,
      workflowIR: createWorkflowIR({
        nodes: [{ id: "send", type: "action", capability: "message.send" }],
      }),
      steps: [
        {
          id: "step_1",
          type: "write",
          capability: "message.send",
          description: "Send message",
          parameters: {},
        },
      ],
      sideEffectClass: "external_write",
      requiresApproval: true,
      rationaleSummary: "Send message",
      generatedBy: { agent: "workflow-agent", model: "gpt-4o-mini", version: "1.0" },
    });

    const engine = createPolicyEngine({ workspaceId: "workspace_test" });
    const proposal = engine.evaluate({ actionPlan, meaningState, workspaceId: "workspace_test" });

    expect(proposal.status).toBe("rejected");
    expect(proposal.policyDecision?.allowed).toBe(false);
    expect(proposal.policyDecision?.reason).toContain("insufficient");
  });

  it("should block when context is conflicting", () => {
    const meaningState = createMeaningState({
      id: "meaning_test",
      speechEventId: "speech_test",
      intent: { type: "send_message", summary: "Send message", confidence: 0.95 },
      entities: [{ name: "recipient", value: "Conflicting", type: "person", confidence: 0.98 }],
      ambiguities: [
        { field: "recipient", description: "Two different recipients mentioned", confidence: 0.50 },
      ],
      confidence: { overall: 0.95 },
      contextSufficiency: "conflicting", // Conflicting context
      model: { provider: "openai", model: "gpt-4o-mini", version: "1.0" },
    });

    const actionPlan = createActionPlan({
      id: "plan_test",
      meaningStateId: meaningState.id,
      workflowIR: createWorkflowIR({
        nodes: [{ id: "send", type: "action", capability: "message.send" }],
      }),
      steps: [
        {
          id: "step_1",
          type: "write",
          capability: "message.send",
          description: "Send message",
          parameters: {},
        },
      ],
      sideEffectClass: "external_write",
      requiresApproval: true,
      rationaleSummary: "Send message",
      generatedBy: { agent: "workflow-agent", model: "gpt-4o-mini", version: "1.0" },
    });

    const engine = createPolicyEngine({ workspaceId: "workspace_test" });
    const proposal = engine.evaluate({ actionPlan, meaningState, workspaceId: "workspace_test" });

    expect(proposal.status).toBe("rejected");
    expect(proposal.policyDecision?.allowed).toBe(false);
    expect(proposal.policyDecision?.reason).toContain("conflicting");
  });
});

describe("Policy Engine — Proposal Generation", () => {
  it("should extract recipient from entities", () => {
    const meaningState = createMeaningState({
      id: "meaning_test",
      speechEventId: "speech_test",
      intent: { type: "send_message", summary: "Send message", confidence: 0.95 },
      entities: [{ name: "recipient", value: "Ngozi", type: "person", confidence: 0.98 }],
      confidence: { overall: 0.95 },
      contextSufficiency: "sufficient",
      model: { provider: "openai", model: "gpt-4o-mini", version: "1.0" },
    });

    const actionPlan = createActionPlan({
      id: "plan_test",
      meaningStateId: meaningState.id,
      workflowIR: createWorkflowIR({
        nodes: [{ id: "send", type: "action", capability: "message.send" }],
      }),
      steps: [
        {
          id: "step_1",
          type: "write",
          capability: "message.send",
          description: "Send message",
          parameters: {},
        },
      ],
      sideEffectClass: "external_write",
      requiresApproval: true,
      rationaleSummary: "Send message",
      generatedBy: { agent: "workflow-agent", model: "gpt-4o-mini", version: "1.0" },
    });

    const engine = createPolicyEngine({ workspaceId: "workspace_test" });
    const proposal = engine.evaluate({ actionPlan, meaningState, workspaceId: "workspace_test" });

    expect(proposal.recipient).toBe("Ngozi");
  });

  it("should extract scheduled time from temporal relations", () => {
    const meaningState = createMeaningState({
      id: "meaning_test",
      speechEventId: "speech_test",
      intent: { type: "send_message", summary: "Send message", confidence: 0.95 },
      entities: [{ name: "recipient", value: "Musa", type: "person", confidence: 0.98 }],
      temporalRelations: [{ type: "at", value: "9:00 AM tomorrow", confidence: 0.90 }],
      confidence: { overall: 0.95 },
      contextSufficiency: "sufficient",
      model: { provider: "openai", model: "gpt-4o-mini", version: "1.0" },
    });

    const actionPlan = createActionPlan({
      id: "plan_test",
      meaningStateId: meaningState.id,
      workflowIR: createWorkflowIR({
        nodes: [{ id: "send", type: "action", capability: "message.send" }],
      }),
      steps: [
        {
          id: "step_1",
          type: "write",
          capability: "message.send",
          description: "Send message",
          parameters: {},
        },
      ],
      sideEffectClass: "external_write",
      requiresApproval: true,
      rationaleSummary: "Send message",
      generatedBy: { agent: "workflow-agent", model: "gpt-4o-mini", version: "1.0" },
    });

    const engine = createPolicyEngine({ workspaceId: "workspace_test" });
    const proposal = engine.evaluate({ actionPlan, meaningState, workspaceId: "workspace_test" });

    expect(proposal.scheduledFor).toBe("9:00 AM tomorrow");
  });

  it("should set expiry time for pending proposals", () => {
    const meaningState = createMeaningState({
      id: "meaning_test",
      speechEventId: "speech_test",
      intent: { type: "send_message", summary: "Send message", confidence: 0.95 },
      entities: [{ name: "recipient", value: "Ngozi", type: "person", confidence: 0.98 }],
      confidence: { overall: 0.95 },
      contextSufficiency: "sufficient",
      model: { provider: "openai", model: "gpt-4o-mini", version: "1.0" },
    });

    const actionPlan = createActionPlan({
      id: "plan_test",
      meaningStateId: meaningState.id,
      workflowIR: createWorkflowIR({
        nodes: [{ id: "send", type: "action", capability: "message.send" }],
      }),
      steps: [
        {
          id: "step_1",
          type: "write",
          capability: "message.send",
          description: "Send message",
          parameters: {},
        },
      ],
      sideEffectClass: "external_write",
      requiresApproval: true,
      rationaleSummary: "Send message",
      generatedBy: { agent: "workflow-agent", model: "gpt-4o-mini", version: "1.0" },
    });

    const engine = createPolicyEngine({ workspaceId: "workspace_test" });
    const proposal = engine.evaluate({ actionPlan, meaningState, workspaceId: "workspace_test" });

    expect(proposal.status).toBe("pending");
    expect(proposal.expiresAt).toBeDefined();

    // Check that expiry is approximately 24 hours from now
    const expiryDate = new Date(proposal.expiresAt!);
    const now = new Date();
    const hoursDiff = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    expect(hoursDiff).toBeGreaterThan(23);
    expect(hoursDiff).toBeLessThan(25);
  });
});
