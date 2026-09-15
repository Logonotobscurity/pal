/**
 * Workflow Agent Tests
 * 
 * Tests PAL_ARCHITECTURE.md §20-21: Workflow Agent and constrained WorkflowIR
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createMeaningState, type MeaningState } from "@/core/schemas/meaning-state";
import { createWorkflowIR } from "@/core/schemas/workflow-ir";
import { createActionPlan, type ActionStep } from "@/core/schemas/action-plan";
import { validateWorkflowIR, validateConnectivity } from "@/core/workflow/validator";
import {
  getCapability,
  hasCapability,
  validateCapabilityInput,
  listCapabilitiesByOperation,
} from "@/core/capabilities/registry";

describe("Workflow Agent — Capability Registry", () => {
  it("should have all required capabilities registered", () => {
    expect(hasCapability("customer.lookup")).toBe(true);
    expect(hasCapability("invoice.status")).toBe(true);
    expect(hasCapability("invoice.list")).toBe(true);
    expect(hasCapability("message.draft")).toBe(true);
    expect(hasCapability("message.send")).toBe(true);
    expect(hasCapability("payment.record")).toBe(true);
    expect(hasCapability("task.create")).toBe(true);
  });

  it("should return undefined for unknown capability", () => {
    expect(getCapability("unknown.capability")).toBeUndefined();
    expect(hasCapability("unknown.capability")).toBe(false);
  });

  it("should correctly identify approval requirements", () => {
    const readCap = getCapability("customer.lookup");
    expect(readCap?.requiresApproval).toBe(false);

    const writeCap = getCapability("message.send");
    expect(writeCap?.requiresApproval).toBe(true);

    const financialCap = getCapability("payment.record");
    expect(financialCap?.requiresApproval).toBe(true);
  });

  it("should list capabilities by operation type", () => {
    const readOps = listCapabilitiesByOperation("read");
    expect(readOps.length).toBeGreaterThan(0);
    expect(readOps.every((cap) => cap.operation === "read")).toBe(true);

    const draftOps = listCapabilitiesByOperation("draft");
    expect(draftOps.length).toBeGreaterThan(0);
    expect(draftOps.every((cap) => cap.operation === "draft")).toBe(true);

    const writeOps = listCapabilitiesByOperation("write");
    expect(writeOps.length).toBeGreaterThan(0);
    expect(writeOps.every((cap) => cap.operation === "write")).toBe(true);
  });

  it("should validate capability input against schema", () => {
    expect(validateCapabilityInput("customer.lookup", { query: "Ngozi" })).toBe(true);
    expect(validateCapabilityInput("customer.lookup", { query: "" })).toBe(false);
    expect(validateCapabilityInput("customer.lookup", {})).toBe(false);

    expect(
      validateCapabilityInput("message.send", {
        recipientId: "cust_123",
        message: "Hello",
      }),
    ).toBe(true);
    expect(
      validateCapabilityInput("message.send", {
        recipientId: "cust_123",
        message: "",
      }),
    ).toBe(false);
  });
});

describe("Workflow Agent — WorkflowIR Schema", () => {
  it("should create valid trigger node", () => {
    const workflow = createWorkflowIR({
      nodes: [{ id: "trigger", type: "trigger" }],
    });

    expect(workflow.version).toBe("1.0");
    expect(workflow.nodes).toHaveLength(1);
    expect(workflow.nodes[0]?.type).toBe("trigger");
  });

  it("should create valid agent node with capability", () => {
    const workflow = createWorkflowIR({
      nodes: [{ id: "lookup", type: "agent", capability: "customer.lookup" }],
    });

    expect(workflow.nodes[0]?.type).toBe("agent");
    expect(workflow.nodes[0]?.capability).toBe("customer.lookup");
  });

  it("should create valid action node with capability", () => {
    const workflow = createWorkflowIR({
      nodes: [{ id: "send", type: "action", capability: "message.send" }],
    });

    expect(workflow.nodes[0]?.type).toBe("action");
    expect(workflow.nodes[0]?.capability).toBe("message.send");
  });

  it("should create valid approval node", () => {
    const workflow = createWorkflowIR({
      nodes: [{ id: "approval", type: "approval" }],
    });

    expect(workflow.nodes[0]?.type).toBe("approval");
  });

  it("should create valid edges between nodes", () => {
    const workflow = createWorkflowIR({
      nodes: [
        { id: "trigger", type: "trigger" },
        { id: "lookup", type: "agent", capability: "customer.lookup" },
      ],
      edges: [{ from: "trigger", to: "lookup", label: "start" }],
    });

    expect(workflow.edges).toHaveLength(1);
    expect(workflow.edges[0]?.from).toBe("trigger");
    expect(workflow.edges[0]?.to).toBe("lookup");
  });
});

describe("Workflow Agent — WorkflowIR Validation", () => {
  it("should validate simple valid workflow", () => {
    const workflow = createWorkflowIR({
      nodes: [
        { id: "trigger", type: "trigger" },
        { id: "lookup", type: "agent", capability: "customer.lookup" },
      ],
      edges: [{ from: "trigger", to: "lookup" }],
    });

    const result = validateWorkflowIR(workflow);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject duplicate node IDs", () => {
    const workflow = createWorkflowIR({
      nodes: [
        { id: "node1", type: "trigger" },
        { id: "node1", type: "agent", capability: "customer.lookup" },
      ],
    });

    const result = validateWorkflowIR(workflow);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "DUPLICATE_NODE_ID")).toBe(true);
  });

  it("should reject unknown capability", () => {
    const workflow = createWorkflowIR({
      nodes: [{ id: "agent1", type: "agent", capability: "unknown.capability" }],
    });

    const result = validateWorkflowIR(workflow);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "UNKNOWN_CAPABILITY")).toBe(true);
  });

  it("should reject edge to non-existent node", () => {
    const workflow = createWorkflowIR({
      nodes: [{ id: "trigger", type: "trigger" }],
      edges: [{ from: "trigger", to: "nonexistent" }],
    });

    const result = validateWorkflowIR(workflow);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "INVALID_EDGE_TO")).toBe(true);
  });

  it("should reject edge from non-existent node", () => {
    const workflow = createWorkflowIR({
      nodes: [{ id: "trigger", type: "trigger" }],
      edges: [{ from: "nonexistent", to: "trigger" }],
    });

    const result = validateWorkflowIR(workflow);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "INVALID_EDGE_FROM")).toBe(true);
  });

  it("should reject self-loop", () => {
    const workflow = createWorkflowIR({
      nodes: [{ id: "node1", type: "trigger" }],
      edges: [{ from: "node1", to: "node1" }],
    });

    const result = validateWorkflowIR(workflow);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "SELF_LOOP")).toBe(true);
  });

  it("should reject cycle", () => {
    const workflow = createWorkflowIR({
      nodes: [
        { id: "node1", type: "trigger" },
        { id: "node2", type: "agent", capability: "customer.lookup" },
        { id: "node3", type: "agent", capability: "invoice.status" },
      ],
      edges: [
        { from: "node1", to: "node2" },
        { from: "node2", to: "node3" },
        { from: "node3", to: "node2" }, // Cycle
      ],
    });

    const result = validateWorkflowIR(workflow);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "CYCLE_DETECTED")).toBe(true);
  });

  it("should reject action requiring approval without approval node", () => {
    const workflow = createWorkflowIR({
      nodes: [
        { id: "trigger", type: "trigger" },
        { id: "send", type: "action", capability: "message.send" }, // Requires approval
      ],
      edges: [{ from: "trigger", to: "send" }],
    });

    const result = validateWorkflowIR(workflow);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "MISSING_APPROVAL")).toBe(true);
  });

  it("should accept action requiring approval with approval node before it", () => {
    const workflow = createWorkflowIR({
      nodes: [
        { id: "trigger", type: "trigger" },
        { id: "approval", type: "approval" },
        { id: "send", type: "action", capability: "message.send" },
      ],
      edges: [
        { from: "trigger", to: "approval" },
        { from: "approval", to: "send" },
      ],
    });

    const result = validateWorkflowIR(workflow);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("Workflow Agent — Connectivity Validation", () => {
  it("should detect disconnected subgraphs as separate start nodes", () => {
    // Nodes without incoming edges are treated as start nodes
    // This workflow has two disconnected subgraphs
    const workflow = createWorkflowIR({
      nodes: [
        { id: "trigger", type: "trigger" },
        { id: "lookup", type: "agent", capability: "customer.lookup" },
        { id: "orphan", type: "agent", capability: "invoice.status" },
      ],
      edges: [{ from: "trigger", to: "lookup" }],
    });

    const result = validateConnectivity(workflow.nodes, workflow.edges);
    // orphan is a separate start node (no incoming edges), so it's technically reachable
    // This is actually correct behavior - disconnected graphs are allowed
    expect(result.errors).toHaveLength(0);
  });

  it("should warn about no start node when all nodes have incoming edges", () => {
    const workflow = createWorkflowIR({
      nodes: [
        { id: "node1", type: "agent", capability: "customer.lookup" },
        { id: "node2", type: "agent", capability: "invoice.status" },
      ],
      edges: [
        { from: "node1", to: "node2" },
        { from: "node2", to: "node1" },
      ],
    });

    const result = validateConnectivity(workflow.nodes, workflow.edges);
    expect(result.warnings.some((w) => w.code === "NO_START_NODE")).toBe(true);
  });

  it("should not warn for well-connected linear workflow", () => {
    const workflow = createWorkflowIR({
      nodes: [
        { id: "trigger", type: "trigger" },
        { id: "lookup", type: "agent", capability: "customer.lookup" },
        { id: "send", type: "action", capability: "message.send" },
      ],
      edges: [
        { from: "trigger", to: "lookup" },
        { from: "lookup", to: "send" },
      ],
    });

    const result = validateConnectivity(workflow.nodes, workflow.edges);
    expect(result.warnings).toHaveLength(0);
  });
});

describe("Workflow Agent — ActionPlan Schema", () => {
  let meaningState: MeaningState;

  beforeEach(() => {
    meaningState = createMeaningState({
      id: "meaning_test123",
      speechEventId: "speech_test456",
      intent: {
        type: "payment_reminder",
        summary: "Send payment reminder to Ngozi",
        confidence: 0.95,
      },
      entities: [
        { name: "customer", value: "Ngozi", type: "person", confidence: 0.98 },
        { name: "amount", value: "₦85,000", type: "money", confidence: 0.99 },
      ],
      confidence: { overall: 0.95 },
      contextSufficiency: "sufficient",
      model: { provider: "openai", model: "gpt-4o-mini", version: "2024-07-18" },
    });
  });

  it("should create valid action plan with workflow IR", () => {
    const workflowIR = createWorkflowIR({
      nodes: [
        { id: "trigger", type: "trigger" },
        { id: "lookup", type: "agent", capability: "customer.lookup" },
        { id: "draft", type: "agent", capability: "message.draft" },
        { id: "approval", type: "approval" },
        { id: "send", type: "action", capability: "message.send" },
      ],
      edges: [
        { from: "trigger", to: "lookup" },
        { from: "lookup", to: "draft" },
        { from: "draft", to: "approval" },
        { from: "approval", to: "send" },
      ],
    });

    const steps: ActionStep[] = [
      {
        id: "step_1",
        type: "read",
        capability: "customer.lookup",
        description: "Look up customer Ngozi",
        parameters: { query: "Ngozi" },
        requiresApproval: false,
        dependsOn: [],
      },
      {
        id: "step_2",
        type: "draft",
        capability: "message.draft",
        description: "Draft payment reminder",
        parameters: { templateType: "payment_reminder" },
        requiresApproval: false,
        dependsOn: ["step_1"],
      },
      {
        id: "step_3",
        type: "write",
        capability: "message.send",
        description: "Send payment reminder",
        parameters: {},
        requiresApproval: true,
        dependsOn: ["step_2"],
      },
    ];

    const actionPlan = createActionPlan({
      id: "plan_test789",
      meaningStateId: meaningState.id,
      workflowIR,
      steps,
      sideEffectClass: "external_write",
      requiresApproval: true,
      rationaleSummary: "Send payment reminder to Ngozi for ₦85,000",
      generatedBy: {
        agent: "workflow-agent",
        model: "gpt-4o-mini",
        version: "1.0.0",
      },
    });

    expect(actionPlan.id).toBe("plan_test789");
    expect(actionPlan.meaningStateId).toBe(meaningState.id);
    expect(actionPlan.steps).toHaveLength(3);
    expect(actionPlan.sideEffectClass).toBe("external_write");
    expect(actionPlan.requiresApproval).toBe(true);
    expect(actionPlan.workflowIR.nodes).toHaveLength(5);
    expect(actionPlan.workflowIR.edges).toHaveLength(4);
  });

  it("should classify side effects correctly - none", () => {
    const workflowIR = createWorkflowIR({
      nodes: [{ id: "lookup", type: "agent", capability: "customer.lookup" }],
    });

    const actionPlan = createActionPlan({
      id: "plan_read",
      meaningStateId: meaningState.id,
      workflowIR,
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
      rationaleSummary: "Read-only operation",
      generatedBy: { agent: "workflow-agent", model: "gpt-4o-mini", version: "1.0.0" },
    });

    expect(actionPlan.sideEffectClass).toBe("none");
    expect(actionPlan.requiresApproval).toBe(false);
  });

  it("should classify side effects correctly - draft", () => {
    const workflowIR = createWorkflowIR({
      nodes: [{ id: "draft", type: "agent", capability: "message.draft" }],
    });

    const actionPlan = createActionPlan({
      id: "plan_draft",
      meaningStateId: meaningState.id,
      workflowIR,
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
      rationaleSummary: "Draft operation",
      generatedBy: { agent: "workflow-agent", model: "gpt-4o-mini", version: "1.0.0" },
    });

    expect(actionPlan.sideEffectClass).toBe("draft");
    expect(actionPlan.requiresApproval).toBe(false);
  });

  it("should classify side effects correctly - financial", () => {
    const workflowIR = createWorkflowIR({
      nodes: [
        { id: "approval", type: "approval" },
        { id: "record", type: "action", capability: "payment.record" },
      ],
      edges: [{ from: "approval", to: "record" }],
    });

    const actionPlan = createActionPlan({
      id: "plan_financial",
      meaningStateId: meaningState.id,
      workflowIR,
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
      rationaleSummary: "Financial operation",
      generatedBy: { agent: "workflow-agent", model: "gpt-4o-mini", version: "1.0.0" },
    });

    expect(actionPlan.sideEffectClass).toBe("financial");
    expect(actionPlan.requiresApproval).toBe(true);
  });

  it("should preserve evidence chain", () => {
    const workflowIR = createWorkflowIR({
      nodes: [{ id: "trigger", type: "trigger" }],
    });

    const actionPlan = createActionPlan({
      id: "plan_evidence",
      meaningStateId: meaningState.id,
      workflowIR,
      steps: [
        {
          id: "step_1",
          type: "clarification",
          capability: "clarification",
          description: "Clarification step",
          parameters: {},
        },
      ],
      sideEffectClass: "none",
      requiresApproval: false,
      evidenceRefs: [
        { id: "ev_1", type: "semantic", source: meaningState.id },
        { id: "ev_2", type: "transcript", source: meaningState.speechEventId },
      ],
      rationaleSummary: "Evidence chain test",
      generatedBy: { agent: "workflow-agent", model: "gpt-4o-mini", version: "1.0.0" },
    });

    expect(actionPlan.evidenceRefs).toHaveLength(2);
    expect(actionPlan.evidenceRefs[0]?.source).toBe(meaningState.id);
    expect(actionPlan.evidenceRefs[1]?.source).toBe(meaningState.speechEventId);
  });
});

describe("Workflow Agent — Complete Workflow Examples", () => {
  it("should validate payment reminder workflow", () => {
    const workflow = createWorkflowIR({
      nodes: [
        { id: "trigger", type: "trigger" },
        { id: "lookup_customer", type: "agent", capability: "customer.lookup" },
        { id: "check_invoice", type: "agent", capability: "invoice.status" },
        { id: "draft_message", type: "agent", capability: "message.draft" },
        { id: "approval_gate", type: "approval" },
        { id: "send_message", type: "action", capability: "message.send" },
      ],
      edges: [
        { from: "trigger", to: "lookup_customer" },
        { from: "lookup_customer", to: "check_invoice" },
        { from: "check_invoice", to: "draft_message" },
        { from: "draft_message", to: "approval_gate" },
        { from: "approval_gate", to: "send_message" },
      ],
    });

    const result = validateWorkflowIR(workflow);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should validate customer lookup workflow (read-only)", () => {
    const workflow = createWorkflowIR({
      nodes: [
        { id: "trigger", type: "trigger" },
        { id: "lookup", type: "agent", capability: "customer.lookup" },
      ],
      edges: [{ from: "trigger", to: "lookup" }],
    });

    const result = validateWorkflowIR(workflow);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should validate invoice status check with conditional response", () => {
    const workflow = createWorkflowIR({
      nodes: [
        { id: "trigger", type: "trigger" },
        { id: "lookup", type: "agent", capability: "customer.lookup" },
        { id: "invoice", type: "agent", capability: "invoice.status" },
        { id: "condition", type: "condition" },
        { id: "paid_branch", type: "agent", capability: "task.create" },
        { id: "unpaid_branch", type: "agent", capability: "message.draft" },
      ],
      edges: [
        { from: "trigger", to: "lookup" },
        { from: "lookup", to: "invoice" },
        { from: "invoice", to: "condition" },
        { from: "condition", to: "paid_branch", label: "paid" },
        { from: "condition", to: "unpaid_branch", label: "unpaid" },
      ],
    });

    const result = validateWorkflowIR(workflow);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
