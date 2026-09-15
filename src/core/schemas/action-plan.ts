/**
 * ActionPlan Schema — Structured workflow plan from MeaningState
 * 
 * Implements PAL_ARCHITECTURE.md §14: ActionPlan
 */

import { z } from "zod";
import { WorkflowIRSchema } from "./workflow-ir";

export const ActionStepSchema = z.object({
  id: z.string().trim().min(1),
  type: z.enum(["read", "draft", "write", "approval", "clarification"]),
  capability: z.string().trim().min(1),
  description: z.string().trim().min(1).max(500),
  parameters: z.record(z.string(), z.unknown()).default({}),
  requiresApproval: z.boolean().default(false),
  dependsOn: z.array(z.string()).default([]),
});

export const ActionPlanSchema = z.object({
  id: z.string().trim().min(1),
  meaningStateId: z.string().trim().min(1),
  workflowIR: WorkflowIRSchema,
  steps: z.array(ActionStepSchema).min(1),
  sideEffectClass: z.enum(["none", "draft", "external_write", "financial", "destructive"]),
  requiresApproval: z.boolean(),
  evidenceRefs: z.array(
    z.object({
      id: z.string().trim().min(1),
      type: z.string().trim().min(1),
      source: z.string().trim().min(1),
      uri: z.string().url().optional(),
    }),
  ).default([]),
  rationaleSummary: z.string().trim().min(1).max(1000),
  generatedBy: z.object({
    agent: z.string().trim().min(1),
    model: z.string().trim().min(1),
    version: z.string().trim().min(1),
  }),
  createdAt: z.string().datetime().optional(),
});

export type ActionPlan = z.infer<typeof ActionPlanSchema>;
export type ActionStep = z.infer<typeof ActionStepSchema>;

export function createActionPlan(input: {
  id: string;
  meaningStateId: string;
  workflowIR: z.infer<typeof WorkflowIRSchema>;
  steps: Array<{
    id: string;
    type: "read" | "draft" | "write" | "approval" | "clarification";
    capability: string;
    description: string;
    parameters?: Record<string, unknown>;
    requiresApproval?: boolean;
    dependsOn?: string[];
  }>;
  sideEffectClass: "none" | "draft" | "external_write" | "financial" | "destructive";
  requiresApproval: boolean;
  evidenceRefs?: Array<{ id: string; type: string; source: string; uri?: string }>;
  rationaleSummary: string;
  generatedBy: { agent: string; model: string; version: string };
  createdAt?: string;
}): ActionPlan {
  return ActionPlanSchema.parse({
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString(),
  });
}
