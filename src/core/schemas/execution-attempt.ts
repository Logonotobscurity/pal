import { z } from "zod";

export const ExecutionAttemptSchema = z.object({
  id: z.string().trim().min(1),
  proposalId: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(1),
  provider: z.string().trim().min(1),
  status: z.enum(["queued", "running", "succeeded", "failed", "cancelled"]),
  externalReference: z.string().trim().min(1).optional(),
  startedAt: z.string().min(1).optional(),
  completedAt: z.string().min(1).optional(),
  errorCode: z.string().trim().min(1).optional(),
  errorMessage: z.string().trim().min(1).optional(),
});

export type ExecutionAttempt = z.infer<typeof ExecutionAttemptSchema>;

export function createExecutionAttempt(input: {
  id: string;
  proposalId: string;
  idempotencyKey: string;
  provider: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  externalReference?: string;
  startedAt?: string;
  completedAt?: string;
  errorCode?: string;
  errorMessage?: string;
}): ExecutionAttempt {
  return ExecutionAttemptSchema.parse(input);
}
