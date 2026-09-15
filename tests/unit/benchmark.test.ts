import { describe, expect, it } from "vitest";
import { BenchmarkRunSchema, createBenchmarkRun } from "@/core/schemas/benchmark";

describe("BenchmarkRun", () => {
  it("accepts a valid benchmark result", () => {
    const result = BenchmarkRunSchema.safeParse({
      id: "bench_123",
      name: "speech-reminder-baseline",
      dataset: "speaker-disjoint test",
      status: "completed",
      sampleCount: 24,
      metrics: {
        wer: 0.12,
        latencyP95Ms: 980,
        intentAccuracy: 0.91,
        unsafeActionRate: 0.02,
      },
      createdAt: "2026-09-15T10:00:00.000Z",
      completedAt: "2026-09-15T10:02:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("creates a benchmark run with defaults", () => {
    const run = createBenchmarkRun({
      id: "bench_456",
      name: "workflow-validation",
      dataset: "customer-reminder",
      status: "running",
      sampleCount: 8,
      metrics: {
        wer: 0.18,
        latencyP95Ms: 1400,
      },
    });

    expect(run.status).toBe("running");
    expect(run.createdAt).toBeTruthy();
  });

  it("rejects invalid benchmark payloads", () => {
    const result = BenchmarkRunSchema.safeParse({
      id: "",
      name: "bad",
      dataset: "x",
      status: "completed",
      sampleCount: -1,
    });

    expect(result.success).toBe(false);
  });
});
