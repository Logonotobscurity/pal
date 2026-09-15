import { describe, expect, it } from "vitest";
import { WorkflowIRSchema, createWorkflowIR, WorkflowNodeSchema } from "@/core/schemas/workflow-ir";

describe("WorkflowIR", () => {
  it("accepts a valid constrained workflow graph", () => {
    const result = WorkflowIRSchema.safeParse({
      version: "1.0",
      nodes: [
        { id: "customer", type: "agent", capability: "customer.lookup" },
        { id: "draft", type: "action", capability: "message.draft" },
        { id: "approval", type: "approval" },
      ],
      edges: [
        { from: "customer", to: "draft", label: "lookup" },
        { from: "draft", to: "approval", label: "review" },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid node type", () => {
    expect(
      WorkflowNodeSchema.safeParse({ id: "bad", type: "unknown", capability: "x" }).success,
    ).toBe(false);
  });

  it("creates a workflow graph with a default approval node", () => {
    const workflow = createWorkflowIR({
      nodes: [
        { id: "lookup", type: "agent", capability: "customer.lookup" },
        { id: "reminder", type: "action", capability: "message.send" },
      ],
      edges: [{ from: "lookup", to: "reminder", label: "send" }],
    });

    expect(workflow.version).toBe("1.0");
    expect(workflow.nodes.length).toBeGreaterThan(0);
    expect(workflow.nodes[0]?.type).toBe("agent");
    expect(workflow.edges.length).toBeGreaterThan(0);
    expect(workflow.edges[0]?.label).toBe("send");
  });
});
