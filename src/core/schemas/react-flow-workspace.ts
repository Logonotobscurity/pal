import { z } from "zod";

export const ReactFlowPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const ReactFlowNodeSchema = z.object({
  id: z.string().trim().min(1),
  type: z.string().trim().min(1),
  position: ReactFlowPositionSchema.default({ x: 0, y: 0 }),
  data: z.record(z.string(), z.unknown()).default({}),
  label: z.string().trim().min(1).optional(),
});

export const ReactFlowEdgeSchema = z.object({
  id: z.string().trim().min(1),
  source: z.string().trim().min(1),
  target: z.string().trim().min(1),
  label: z.string().trim().min(1).optional(),
});

export const ReactFlowWorkspaceSchema = z.object({
  version: z.literal("1.0"),
  nodes: z.array(ReactFlowNodeSchema).min(1),
  edges: z.array(ReactFlowEdgeSchema).default([]),
});

export type ReactFlowPosition = z.infer<typeof ReactFlowPositionSchema>;
export type ReactFlowNode = z.infer<typeof ReactFlowNodeSchema>;
export type ReactFlowEdge = z.infer<typeof ReactFlowEdgeSchema>;
export type ReactFlowWorkspace = z.infer<typeof ReactFlowWorkspaceSchema>;

export function createReactFlowWorkspace(input: {
  version?: "1.0";
  nodes: Array<{
    id: string;
    type: string;
    position?: { x: number; y: number };
    data?: Record<string, unknown>;
    label?: string;
  }>;
  edges?: Array<{ id: string; source: string; target: string; label?: string }>;
}): ReactFlowWorkspace {
  return ReactFlowWorkspaceSchema.parse({
    version: input.version ?? "1.0",
    nodes: input.nodes.map((node) => ({
      ...node,
      position: node.position ?? { x: 0, y: 0 },
      data: node.data ?? { label: node.label ?? node.id },
    })),
    edges: input.edges ?? [],
  });
}
