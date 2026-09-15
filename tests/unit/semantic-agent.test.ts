/**
 * Semantic Agent Tests
 * 
 * Tests for PAL Semantic Agent: SpeechEvent → MeaningState transformation
 */

import { describe, expect, it, vi } from "vitest";

// Mock server-only module
vi.mock("server-only", () => ({}));

import { createSpeechEvent } from "@/core/schemas/speech-event";
import { createMeaningState } from "@/core/schemas/meaning-state";
import { createSemanticAgent } from "@/services/semantic/agent";
import type { OpenAISemanticExtractor, SemanticExtractionOutput } from "@/providers/openai-llm";

// Mock semantic extractor for testing
class MockSemanticExtractor implements Pick<OpenAISemanticExtractor, "extractSemanticMeaning"> {
  private readonly responses: Map<string, SemanticExtractionOutput> = new Map();

  setResponse(transcript: string, output: SemanticExtractionOutput): void {
    this.responses.set(transcript, output);
  }

  async extractSemanticMeaning(input: {
    transcript: string;
  }): Promise<SemanticExtractionOutput> {
    const response = this.responses.get(input.transcript);
    if (!response) {
      // Default response
      return {
        intent: { type: "other", summary: "Unknown intent", confidence: 0.5 },
        entities: [],
        constraints: [],
        temporalRelations: [],
        ambiguities: [],
        contextSufficiency: "insufficient",
        overallConfidence: 0.5,
        fieldConfidence: {},
      };
    }
    return response;
  }
}

describe("Semantic Agent — MeaningState Creation", () => {
  it("creates valid MeaningState with all required fields", () => {
    const meaningState = createMeaningState({
      id: "meaning_123",
      speechEventId: "speech_456",
      intent: {
        type: "payment_reminder",
        summary: "Send payment reminder to Ngozi",
        confidence: 0.95,
      },
      entities: [
        {
          name: "customer",
          value: "Ngozi",
          type: "person",
          confidence: 0.98,
        },
        {
          name: "amount",
          value: "₦85,000",
          type: "money",
          confidence: 0.99,
        },
      ],
      constraints: [
        {
          type: "deadline",
          value: "by tomorrow",
          confidence: 0.95,
        },
      ],
      temporalRelations: [
        {
          type: "before",
          value: "tomorrow",
          confidence: 0.95,
        },
      ],
      ambiguities: [],
      evidenceRefs: [
        {
          id: "ev_123",
          type: "transcript",
          source: "speech_456",
        },
      ],
      confidence: {
        overall: 0.95,
        fields: {
          intent: 0.95,
          entities: 0.98,
        },
      },
      contextSufficiency: "sufficient",
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        version: "2024-07-18",
      },
    });

    expect(meaningState.id).toBe("meaning_123");
    expect(meaningState.speechEventId).toBe("speech_456");
    expect(meaningState.intent.type).toBe("payment_reminder");
    expect(meaningState.intent.confidence).toBeGreaterThan(0.9);
    expect(meaningState.entities).toHaveLength(2);
    expect(meaningState.constraints).toHaveLength(1);
    expect(meaningState.temporalRelations).toHaveLength(1);
    expect(meaningState.contextSufficiency).toBe("sufficient");
  });

  it("validates confidence scores are between 0 and 1", () => {
    expect(() =>
      createMeaningState({
        id: "meaning_123",
        speechEventId: "speech_456",
        intent: {
          type: "other",
          summary: "Test",
          confidence: 1.5, // Invalid: > 1
        },
        confidence: {
          overall: 0.5,
        },
        contextSufficiency: "sufficient",
        model: {
          provider: "openai",
          model: "gpt-4o",
          version: "2024-07-18",
        },
      }),
    ).toThrow();
  });
});

describe("Semantic Agent — Intent Extraction", () => {
  it("extracts payment reminder intent with high confidence", async () => {
    const extractor = new MockSemanticExtractor();
    extractor.setResponse("Remind Ngozi to pay ₦85,000 by tomorrow", {
      intent: {
        type: "payment_reminder",
        summary: "Send payment reminder to Ngozi for ₦85,000 due tomorrow",
        confidence: 0.95,
      },
      entities: [
        { name: "customer", value: "Ngozi", type: "person", confidence: 0.98 },
        { name: "amount", value: "₦85,000", type: "money", confidence: 0.99 },
      ],
      constraints: [{ type: "deadline", value: "by tomorrow", confidence: 0.95 }],
      temporalRelations: [{ type: "before", value: "tomorrow", confidence: 0.95 }],
      ambiguities: [],
      contextSufficiency: "sufficient",
      overallConfidence: 0.95,
      fieldConfidence: { intent: 0.95, entities: 0.98 },
    });

    const agent = createSemanticAgent({ extractor: extractor as unknown as OpenAISemanticExtractor });

    const speechEvent = createSpeechEvent({
      id: "speech_123",
      traceId: "trace_456",
      sessionId: "sess_789",
      provider: "sahara",
      providerVersion: "2026.09",
      transcript: {
        text: "Remind Ngozi to pay ₦85,000 by tomorrow",
        segments: [
          { id: "seg_1", startMs: 0, endMs: 2500, text: "Remind Ngozi to pay ₦85,000 by tomorrow" },
        ],
      },
      codeSwitch: { detected: false, switchCount: 0, pairs: [] },
      timing: {
        startedAt: "2026-09-15T10:00:00.000Z",
        endedAt: "2026-09-15T10:00:02.500Z",
      },
      provenance: [{ id: "prov_1", type: "transcript", source: "sahara" }],
    });

    const meaningState = await agent.extractMeaning(speechEvent);

    expect(meaningState.intent.type).toBe("payment_reminder");
    expect(meaningState.intent.confidence).toBeGreaterThan(0.9);
    expect(meaningState.entities).toHaveLength(2);
    expect(meaningState.entities[0]?.name).toBe("customer");
    expect(meaningState.entities[0]?.value).toBe("Ngozi");
    expect(meaningState.entities[1]?.name).toBe("amount");
    expect(meaningState.entities[1]?.value).toBe("₦85,000");
    expect(meaningState.contextSufficiency).toBe("sufficient");
  });

  it("extracts invoice status intent from code-switched speech", async () => {
    const extractor = new MockSemanticExtractor();
    extractor.setResponse("Habari yako Amina? Umelipa invoice?", {
      intent: {
        type: "invoice_status",
        summary: "Check if Amina has paid invoice",
        confidence: 0.90,
      },
      entities: [{ name: "customer", value: "Amina", type: "person", confidence: 0.95 }],
      constraints: [],
      temporalRelations: [],
      ambiguities: [
        {
          field: "invoice_id",
          description: "Specific invoice not identified",
          confidence: 0.80,
        },
      ],
      contextSufficiency: "insufficient",
      overallConfidence: 0.75,
      fieldConfidence: { intent: 0.90, entities: 0.95 },
    });

    const agent = createSemanticAgent({ extractor: extractor as unknown as OpenAISemanticExtractor });

    const speechEvent = createSpeechEvent({
      id: "speech_234",
      traceId: "trace_567",
      sessionId: "sess_890",
      provider: "sahara",
      providerVersion: "2026.09",
      transcript: {
        text: "Habari yako Amina? Umelipa invoice?",
        segments: [
          { id: "seg_1", startMs: 0, endMs: 1500, text: "Habari yako Amina?" },
          { id: "seg_2", startMs: 1600, endMs: 2500, text: "Umelipa invoice?" },
        ],
      },
      languageSpans: [
        { start: 0, end: 19, language: "sw" },
        { start: 20, end: 35, language: "sw" },
      ],
      codeSwitch: {
        detected: true,
        switchCount: 1,
        density: 0.3,
        pairs: ["sw-en"],
      },
      timing: {
        startedAt: "2026-09-15T11:00:00.000Z",
        endedAt: "2026-09-15T11:00:02.500Z",
      },
      provenance: [{ id: "prov_2", type: "transcript", source: "sahara" }],
    });

    const meaningState = await agent.extractMeaning(speechEvent);

    expect(meaningState.intent.type).toBe("invoice_status");
    expect(meaningState.entities).toHaveLength(1);
    expect(meaningState.entities[0]?.value).toBe("Amina");
    expect(meaningState.ambiguities).toHaveLength(1);
    expect(meaningState.ambiguities[0]?.field).toBe("invoice_id");
    expect(meaningState.contextSufficiency).toBe("insufficient");
  });

  it("flags ambiguities when context is insufficient", async () => {
    const extractor = new MockSemanticExtractor();
    extractor.setResponse("Call him tomorrow", {
      intent: {
        type: "other",
        summary: "Call someone tomorrow",
        confidence: 0.60,
      },
      entities: [],
      constraints: [{ type: "deadline", value: "tomorrow", confidence: 0.90 }],
      temporalRelations: [{ type: "on", value: "tomorrow", confidence: 0.90 }],
      ambiguities: [
        {
          field: "recipient",
          description: 'Reference "him" is ambiguous - no specific person identified',
          confidence: 0.95,
        },
      ],
      contextSufficiency: "insufficient",
      overallConfidence: 0.55,
      fieldConfidence: { intent: 0.60, entities: 0.30 },
    });

    const agent = createSemanticAgent({ extractor: extractor as unknown as OpenAISemanticExtractor });

    const speechEvent = createSpeechEvent({
      id: "speech_345",
      traceId: "trace_678",
      sessionId: "sess_901",
      provider: "sahara",
      providerVersion: "2026.09",
      transcript: {
        text: "Call him tomorrow",
        segments: [{ id: "seg_1", startMs: 0, endMs: 1000, text: "Call him tomorrow" }],
      },
      codeSwitch: { detected: false, switchCount: 0, pairs: [] },
      timing: {
        startedAt: "2026-09-15T12:00:00.000Z",
        endedAt: "2026-09-15T12:00:01.000Z",
      },
      provenance: [{ id: "prov_3", type: "transcript", source: "sahara" }],
    });

    const meaningState = await agent.extractMeaning(speechEvent);

    expect(meaningState.contextSufficiency).toBe("insufficient");
    expect(meaningState.ambiguities).toHaveLength(1);
    expect(meaningState.ambiguities[0]?.field).toBe("recipient");
    expect(meaningState.confidence.overall).toBeLessThan(0.7);
  });
});

describe("Semantic Agent — Entity Extraction", () => {
  it("extracts person entities with confidence scores", async () => {
    const extractor = new MockSemanticExtractor();
    extractor.setResponse("Send a message to Chinedu and Amara", {
      intent: { type: "send_message", summary: "Send message to multiple people", confidence: 0.90 },
      entities: [
        { name: "recipient", value: "Chinedu", type: "person", confidence: 0.98 },
        { name: "recipient", value: "Amara", type: "person", confidence: 0.98 },
      ],
      constraints: [],
      temporalRelations: [],
      ambiguities: [
        {
          field: "message_content",
          description: "Message content not specified",
          confidence: 0.85,
        },
      ],
      contextSufficiency: "insufficient",
      overallConfidence: 0.80,
      fieldConfidence: { intent: 0.90, entities: 0.98 },
    });

    const agent = createSemanticAgent({ extractor: extractor as unknown as OpenAISemanticExtractor });

    const speechEvent = createSpeechEvent({
      id: "speech_456",
      traceId: "trace_789",
      sessionId: "sess_012",
      provider: "sahara",
      providerVersion: "2026.09",
      transcript: {
        text: "Send a message to Chinedu and Amara",
        segments: [{ id: "seg_1", startMs: 0, endMs: 2000, text: "Send a message to Chinedu and Amara" }],
      },
      codeSwitch: { detected: false, switchCount: 0, pairs: [] },
      timing: {
        startedAt: "2026-09-15T13:00:00.000Z",
        endedAt: "2026-09-15T13:00:02.000Z",
      },
      provenance: [{ id: "prov_4", type: "transcript", source: "sahara" }],
    });

    const meaningState = await agent.extractMeaning(speechEvent);

    expect(meaningState.entities).toHaveLength(2);
    expect(meaningState.entities[0]?.type).toBe("person");
    expect(meaningState.entities[1]?.type).toBe("person");
    expect(meaningState.entities[0]?.confidence).toBeGreaterThan(0.95);
  });

  it("extracts monetary entities with currency information", async () => {
    const extractor = new MockSemanticExtractor();
    extractor.setResponse("The invoice is for $1,500.50", {
      intent: { type: "other", summary: "Statement about invoice amount", confidence: 0.85 },
      entities: [{ name: "amount", value: "$1,500.50", type: "money", confidence: 0.99 }],
      constraints: [],
      temporalRelations: [],
      ambiguities: [],
      contextSufficiency: "sufficient",
      overallConfidence: 0.90,
      fieldConfidence: { intent: 0.85, entities: 0.99 },
    });

    const agent = createSemanticAgent({ extractor: extractor as unknown as OpenAISemanticExtractor });

    const speechEvent = createSpeechEvent({
      id: "speech_567",
      traceId: "trace_890",
      sessionId: "sess_123",
      provider: "sahara",
      providerVersion: "2026.09",
      transcript: {
        text: "The invoice is for $1,500.50",
        segments: [{ id: "seg_1", startMs: 0, endMs: 1500, text: "The invoice is for $1,500.50" }],
      },
      codeSwitch: { detected: false, switchCount: 0, pairs: [] },
      timing: {
        startedAt: "2026-09-15T14:00:00.000Z",
        endedAt: "2026-09-15T14:00:01.500Z",
      },
      provenance: [{ id: "prov_5", type: "transcript", source: "sahara" }],
    });

    const meaningState = await agent.extractMeaning(speechEvent);

    expect(meaningState.entities).toHaveLength(1);
    expect(meaningState.entities[0]?.type).toBe("money");
    expect(meaningState.entities[0]?.value).toBe("$1,500.50");
    expect(meaningState.entities[0]?.confidence).toBeGreaterThan(0.95);
  });
});

describe("Semantic Agent — Provenance Chain", () => {
  it("preserves provenance from SpeechEvent to MeaningState", async () => {
    const extractor = new MockSemanticExtractor();
    extractor.setResponse("Test transcript", {
      intent: { type: "other", summary: "Test", confidence: 0.8 },
      entities: [],
      constraints: [],
      temporalRelations: [],
      ambiguities: [],
      contextSufficiency: "sufficient",
      overallConfidence: 0.8,
      fieldConfidence: {},
    });

    const agent = createSemanticAgent({ extractor: extractor as unknown as OpenAISemanticExtractor });

    const speechEvent = createSpeechEvent({
      id: "speech_678",
      traceId: "trace_901",
      sessionId: "sess_234",
      provider: "sahara",
      providerVersion: "2026.09",
      transcript: {
        text: "Test transcript",
        segments: [{ id: "seg_1", startMs: 0, endMs: 1000, text: "Test transcript" }],
      },
      codeSwitch: { detected: false, switchCount: 0, pairs: [] },
      timing: {
        startedAt: "2026-09-15T15:00:00.000Z",
        endedAt: "2026-09-15T15:00:01.000Z",
      },
      provenance: [
        { id: "prov_audio", type: "audio", source: "microphone" },
        { id: "prov_transcript", type: "transcript", source: "sahara" },
      ],
    });

    const meaningState = await agent.extractMeaning(speechEvent);

    // Should have speech event reference + inherited provenance
    expect(meaningState.evidenceRefs.length).toBeGreaterThanOrEqual(3);
    expect(meaningState.evidenceRefs.some((ref) => ref.source === speechEvent.id)).toBe(true);
    expect(meaningState.evidenceRefs.some((ref) => ref.source === "microphone")).toBe(true);
    expect(meaningState.evidenceRefs.some((ref) => ref.source === "sahara")).toBe(true);
  });
});
