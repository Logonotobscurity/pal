import { z } from "zod";

export const SaharaStreamStateSchema = z.enum([
  "idle",
  "streaming",
  "completed",
  "error",
]);

export type SaharaStreamState = z.infer<typeof SaharaStreamStateSchema>;

export const SaharaChunkSchema = z.object({
  sessionId: z.string().trim().min(1, { message: "Session id is required" }),
  sequence: z.number().int().nonnegative({ message: "Sequence must be a non-negative integer" }),
  text: z
    .string()
    .trim()
    .min(1, { message: "Transcript text is required" })
    .max(2000, { message: "Transcript text must be at most 2000 characters" }),
  isFinal: z.boolean(),
  status: SaharaStreamStateSchema,
  confidence: z.number().min(0).max(1).optional(),
  createdAt: z.string().datetime().optional(),
});

export type SaharaChunk = z.infer<typeof SaharaChunkSchema>;

export function createSaharaChunk(input: {
  sessionId: string;
  sequence: number;
  text: string;
  isFinal: boolean;
  status: SaharaStreamState;
  confidence?: number;
  createdAt?: string;
}): SaharaChunk {
  return SaharaChunkSchema.parse({
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString(),
  });
}

export function isTerminalSaharaState(state: SaharaStreamState): boolean {
  return state === "completed" || state === "error";
}
