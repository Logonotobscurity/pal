import { describe, expect, it } from "vitest";
import {
  LanguageSpanSchema,
  SpeechEventSchema,
  TranscriptSegmentSchema,
  createSpeechEvent,
} from "@/core/schemas/speech-event";

describe("SpeechEvent", () => {
  it("accepts a valid transcript event", () => {
    const parsed = SpeechEventSchema.safeParse({
      id: "speech_123",
      traceId: "trace_123",
      sessionId: "sess_123",
      provider: "sahara",
      providerVersion: "1.0.0",
      transcript: {
        text: "I need to send a reminder today",
        segments: [
          { id: "seg_1", startMs: 0, endMs: 1200, text: "I need to send a reminder today" },
        ],
      },
      languageSpans: [{ start: 0, end: 14, language: "en" }],
      codeSwitch: {
        detected: false,
        switchCount: 0,
        pairs: [],
      },
      timing: {
        startedAt: "2026-09-14T12:00:00.000Z",
        endedAt: "2026-09-14T12:00:02.000Z",
      },
      provenance: [],
      createdAt: "2026-09-14T12:00:02.000Z",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid code-switch density", () => {
    expect(
      SpeechEventSchema.safeParse({
        id: "speech_123",
        traceId: "trace_123",
        sessionId: "sess_123",
        provider: "sahara",
        providerVersion: "1.0.0",
        transcript: {
          text: "hello",
          segments: [{ id: "seg_1", startMs: 0, endMs: 500, text: "hello" }],
        },
        languageSpans: [{ start: 0, end: 5, language: "en" }],
        codeSwitch: {
          detected: true,
          switchCount: 1,
          density: 2,
          pairs: ["en-yo"],
        },
        timing: {
          startedAt: "2026-09-14T12:00:00.000Z",
          endedAt: "2026-09-14T12:00:00.500Z",
        },
        provenance: [],
        createdAt: "2026-09-14T12:00:00.500Z",
      }).success,
    ).toBe(false);
  });

  it("creates an event with default provenance and timestamps", () => {
    const event = createSpeechEvent({
      id: "speech_456",
      traceId: "trace_456",
      sessionId: "sess_456",
      provider: "sahara",
      providerVersion: "1.0.0",
      transcript: {
        text: "I want a reminder",
        segments: [{ id: "seg_1", startMs: 0, endMs: 900, text: "I want a reminder" }],
      },
      languageSpans: [{ start: 0, end: 16, language: "en" }],
      codeSwitch: { detected: false, switchCount: 0, pairs: [] },
      timing: {
        startedAt: "2026-09-14T12:10:00.000Z",
        endedAt: "2026-09-14T12:10:01.000Z",
      },
    });

    expect(event.provenance).toEqual([]);
    expect(event.createdAt).toBeTruthy();
  });

  it("validates language span shape", () => {
    const span = LanguageSpanSchema.parse({ start: 10, end: 20, language: "en" });
    expect(span.language).toBe("en");
    expect(TranscriptSegmentSchema.parse({ id: "seg_1", startMs: 0, endMs: 200, text: "hello" }).text).toBe("hello");
  });
});
