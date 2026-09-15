import { z } from "zod";

export const WorkflowNodeSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().trim().min(1),
    type: z.literal("trigger"),
    capability: z.string().trim().min(1).optional(),
  }),
  z.object({
    id: z.string().trim().min(1),
    type: z.literal("agent"),
    capability: z.string().trim().min(1),
  }),
  z.object({
    id: z.string().trim().min(1),
    type: z.literal("condition"),
    capability: z.string().trim().min(1).optional(),
  }),
  z.object({
    id: z.string().trim().min(1),
    type: z.literal("action"),
    capability: z.string().trim().min(1),
  }),
  z.object({
    id: z.string().trim().min(1),
    type: z.literal("approval"),
    capability: z.string().trim().min(1).optional(),
  }),
  z.object({
    id: z.string().trim().min(1),
    type: z.literal("fallback"),
    capability: z.string().trim().min(1).optional(),
  }),
]);

export const WorkflowEdgeSchema = z.object({
  from: z.string().trim().min(1),
  to: z.string().trim().min(1),
  label: z.string().trim().min(1).max(80).optional(),
});

export const WorkflowIRSchema = z.object({
  version: z.literal("1.0"),
  nodes: z.array(WorkflowNodeSchema).min(1),
  edges: z.array(WorkflowEdgeSchema).default([]),
});

export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;
export type WorkflowIR = z.infer<typeof WorkflowIRSchema>;

export function createWorkflowIR(input: {
  version?: "1.0";
  nodes: Array<
    | { id: string; type: "trigger"; capability?: string }
    | { id: string; type: "agent"; capability: string }
    | { id: string; type: "condition"; capability?: string }
    | { id: string; type: "action"; capability: string }
    | { id: string; type: "approval"; capability?: string }
    | { id: string; type: "fallback"; capability?: string }
  >;
  edges?: Array<{ from: string; to: string; label?: string }>;
}): WorkflowIR {
  return WorkflowIRSchema.parse({
    version: input.version ?? "1.0",
    nodes: input.nodes,
    edges: input.edges ?? [],
  });
}
