import { z } from "zod";

export const BenchmarkMetricsSchema = z.object({
  wer: z.number().min(0).max(1).optional(),
  cer: z.number().min(0).max(1).optional(),
  latencyP50Ms: z.number().nonnegative().optional(),
  latencyP95Ms: z.number().nonnegative().optional(),
  intentAccuracy: z.number().min(0).max(1).optional(),
  entityF1: z.number().min(0).max(1).optional(),
  unsafeActionRate: z.number().min(0).max(1).optional(),
  taskSuccessRate: z.number().min(0).max(1).optional(),
  approvalAccuracy: z.number().min(0).max(1).optional(),
}).passthrough();

export const BenchmarkRunSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  dataset: z.string().trim().min(1),
  status: z.enum(["queued", "running", "completed", "failed"]),
  sampleCount: z.number().int().nonnegative(),
  metrics: BenchmarkMetricsSchema.default({}),
  summary: z.string().trim().min(1).optional(),
  createdAt: z.string().min(1).optional(),
  completedAt: z.string().min(1).optional(),
});

export type BenchmarkMetrics = z.infer<typeof BenchmarkMetricsSchema>;
export type BenchmarkRun = z.infer<typeof BenchmarkRunSchema>;

export function createBenchmarkRun(input: {
  id: string;
  name: string;
  dataset: string;
  status: "queued" | "running" | "completed" | "failed";
  sampleCount: number;
  metrics?: BenchmarkMetrics;
  summary?: string;
  createdAt?: string;
  completedAt?: string;
}): BenchmarkRun {
  return BenchmarkRunSchema.parse({
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString(),
  });
}
