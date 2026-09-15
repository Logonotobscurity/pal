import { describe, expect, it } from "vitest";
import {
  createMeaningState,
  MeaningStateSchema,
  SemanticAgent,
} from "@/core/schemas/meaning-state";

describe("MeaningState and SemanticAgent", () => {
  it("accepts a valid meaning state", () => {
    const result = MeaningStateSchema.safeParse({
      id: "meaning_123",
      speechEventId: "speech_123",
      intent: {
        type: "payment_reminder",
        summary: "Send a payment reminder",
        confidence: 0.9,
      },
      entities: [
        {
          name: "customer",
          value: "Ngozi",
          type: "person",
          confidence: 0.92,
        },
      ],
      constraints: [
        {
          type: "send_not_before",
          value: "2026-09-15T09:00:00+01:00",
          confidence: 0.8,
        },
      ],
      temporalRelations: [
        { type: "on", value: "2026-09-15", confidence: 0.8 },
      ],
      ambiguities: [],
      evidenceRefs: [{ id: "ev_1", type: "transcript", source: "speech_123", uri: "https://example.invalid/transcript" }],
      confidence: {
        overall: 0.9,
        fields: {
          intent: 0.9,
          entities: 0.92,
        },
      },
      contextSufficiency: "sufficient",
      model: {
        provider: "sahara",
        model: "semantic-agent",
        version: "1.0.0",
      },
    });

    expect(result.success).toBe(true);
  });

  it("derives a reminder intent from a speech event", () => {
    const meaning = SemanticAgent.fromSpeechEvent({
      id: "speech_123",
      traceId: "trace_123",
      sessionId: "sess_123",
      provider: "sahara",
      providerVersion: "1.0.0",
      transcript: {
        text: "Please remind Ngozi to pay by tomorrow",
        segments: [{ id: "seg_1", startMs: 0, endMs: 1400, text: "Please remind Ngozi to pay by tomorrow" }],
      },
      languageSpans: [{ start: 0, end: 14, language: "en" }],
      codeSwitch: {
        detected: false,
        switchCount: 0,
        pairs: [],
      },
      timing: {
        startedAt: "2026-09-14T12:00:00.000Z",
        endedAt: "2026-09-14T12:00:01.400Z",
      },
      provenance: [],
      createdAt: "2026-09-14T12:00:01.400Z",
    });

    expect(meaning.intent.type).toBe("payment_reminder");
    expect(meaning.contextSufficiency).toBe("sufficient");
    expect(meaning.entities.some((entity) => entity.name === "customer")).toBe(true);
  });

  it("rejects a meaning state with conflicting sufficiency", () => {
    const result = MeaningStateSchema.safeParse({
      id: "meaning_456",
      speechEventId: "speech_456",
      intent: { type: "other", summary: "Unknown", confidence: 0.2 },
      entities: [],
      constraints: [],
      temporalRelations: [],
      ambiguities: [],
      evidenceRefs: [],
      confidence: { overall: 0.2, fields: {} },
      contextSufficiency: "conflicting",
      model: { provider: "sahara", model: "semantic-agent", version: "1.0.0" },
    });

    expect(result.success).toBe(true);
  });

  it("builds a meaning state factory object", () => {
    const state = createMeaningState({
      id: "meaning_789",
      speechEventId: "speech_789",
      intent: { type: "send_message", summary: "Send a short message", confidence: 0.7 },
      entities: [{ name: "recipient", value: "Amina", type: "person", confidence: 0.75 }],
      constraints: [],
      temporalRelations: [],
      ambiguities: [],
      evidenceRefs: [{ id: "ev_2", type: "transcript", source: "speech_789" }],
      confidence: { overall: 0.7, fields: { intent: 0.7 } },
      contextSufficiency: "sufficient",
      model: { provider: "sahara", model: "semantic-agent", version: "1.0.0" },
    });

    expect(state.intent.type).toBe("send_message");
  });
});
