import { z } from "zod";

export const VerificationResultSchema = z.object({
  executionAttemptId: z.string().trim().min(1),
  verified: z.boolean(),
  status: z.enum(["verified", "failed", "unverified"]),
  externalReference: z.string().trim().min(1).optional(),
  expectedOutcome: z.string().trim().min(1).optional(),
  actualOutcome: z.string().trim().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
  checkedAt: z.string().min(1).optional(),
});

export type VerificationResult = z.infer<typeof VerificationResultSchema>;

export function createVerificationResult(input: {
  executionAttemptId: string;
  verified: boolean;
  status?: "verified" | "failed" | "unverified";
  externalReference?: string;
  expectedOutcome?: string;
  actualOutcome?: string;
  notes?: string;
  checkedAt?: string;
}): VerificationResult {
  return VerificationResultSchema.parse({
    ...input,
    status: input.status ?? (input.verified ? "verified" : "unverified"),
    checkedAt: input.checkedAt ?? new Date().toISOString(),
  });
}
