import { z } from "zod";

export const FailureReplaySchema = z.object({
  id: z.string().trim().min(1),
  executionAttemptId: z.string().trim().min(1),
  failureType: z.enum([
    "policy_blocked",
    "verification_failed",
    "external_error",
    "provider_timeout",
    "validation_error",
    "unknown",
  ]),
  rootCause: z.string().trim().min(1),
  inputSnapshot: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(["queued", "running", "completed", "failed"]),
  replayer: z.enum(["manual", "automated"]),
  createdAt: z.string().min(1).optional(),
  completedAt: z.string().min(1).optional(),
});

export type FailureReplay = z.infer<typeof FailureReplaySchema>;

export function createFailureReplay(input: {
  id: string;
  executionAttemptId: string;
  failureType: "policy_blocked" | "verification_failed" | "external_error" | "provider_timeout" | "validation_error" | "unknown";
  rootCause: string;
  inputSnapshot?: Record<string, unknown>;
  status: "queued" | "running" | "completed" | "failed";
  replayer: "manual" | "automated";
  createdAt?: string;
  completedAt?: string;
}): FailureReplay {
  return FailureReplaySchema.parse({
    ...input,
    inputSnapshot: input.inputSnapshot ?? {},
    createdAt: input.createdAt ?? new Date().toISOString(),
  });
}
