import { describe, expect, it } from "vitest";
import {
  SaharaChunkSchema,
  SaharaStreamStateSchema,
  createSaharaChunk,
  isTerminalSaharaState,
} from "@/core/schemas/sahara";

describe("Sahara streaming", () => {
  it("accepts a valid partial transcript chunk", () => {
    const parsed = SaharaChunkSchema.safeParse({
      sessionId: "session-123",
      sequence: 1,
      text: "Hello",
      isFinal: false,
      status: "streaming",
      confidence: 0.9,
    });

    expect(parsed.success).toBe(true);
  });

  it("requires a non-empty session id", () => {
    expect(
      SaharaChunkSchema.safeParse({
        sessionId: "",
        sequence: 0,
        text: "Hello",
        isFinal: false,
        status: "streaming",
      }).success,
    ).toBe(false);
  });

  it("creates a completed chunk and recognizes terminal states", () => {
    const chunk = createSaharaChunk({
      sessionId: "session-456",
      sequence: 2,
      text: "Hello there",
      isFinal: true,
      status: "completed",
    });

    expect(chunk.isFinal).toBe(true);
    expect(isTerminalSaharaState("completed")).toBe(true);
    expect(SaharaStreamStateSchema.parse("completed")).toBe("completed");
  });
});
