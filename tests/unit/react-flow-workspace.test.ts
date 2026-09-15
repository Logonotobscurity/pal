import { describe, expect, it } from "vitest";
import { ReactFlowWorkspaceSchema, createReactFlowWorkspace } from "@/core/schemas/react-flow-workspace";

describe("ReactFlow workspace", () => {
  it("accepts a valid flow workspace model", () => {
    const result = ReactFlowWorkspaceSchema.safeParse({
      version: "1.0",
      nodes: [
        { id: "start", type: "input", position: { x: 0, y: 0 }, data: { label: "Start" } },
        { id: "review", type: "default", position: { x: 200, y: 0 }, data: { label: "Review" } },
      ],
      edges: [{ id: "e1", source: "start", target: "review", label: "next" }],
    });

    expect(result.success).toBe(true);
  });

  it("creates a workspace from a workflow graph", () => {
    const workspace = createReactFlowWorkspace({
      nodes: [
        { id: "customer", type: "agent", label: "Customer lookup" },
        { id: "approval", type: "approval", label: "Owner approval" },
      ],
      edges: [{ id: "e1", source: "customer", target: "approval", label: "review" }],
    });

    expect(workspace.version).toBe("1.0");
    expect(workspace.nodes[0]?.id).toBe("customer");
    expect(workspace.edges[0]?.label).toBe("review");
  });
});
