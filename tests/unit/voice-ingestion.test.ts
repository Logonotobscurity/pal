/**
 * Voice Ingestion Pipeline Tests
 * 
 * Tests for PAL voice ingestion: PCM16 encoding, protocol parsing, session management,
 * and SpeechEvent persistence.
 */

import { describe, expect, it } from "vitest";
import {
  downsample,
  stereoToMono,
  float32ToInt16,
  processAudioBuffer,
  int16ArrayToBase64,
  SAHARA_AUDIO_CONFIG,
} from "@/lib/audio/pcm16-encoder";
import {
  SaharaAudioConfig,
  SaharaVoicePipeline,
  parseSaharaMessage,
  createPcm16AudioChunk,
  type SaharaProvider,
  type SaharaSessionRecord,
} from "@/providers/sahara";
import { createSpeechEvent, type SpeechEvent } from "@/core/schemas/speech-event";

describe("PCM16 Audio Encoding", () => {
  it("downsamples Float32 audio from 48kHz to 16kHz", () => {
    // Create 48kHz samples (3x16kHz)
    const source = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]);
    const downsampled = downsample(source, 48000, 16000);

    // Should take every 3rd sample
    expect(downsampled.length).toBe(3);
    expect(downsampled[0]).toBeCloseTo(0.1);
    expect(downsampled[1]).toBeCloseTo(0.4);
    expect(downsampled[2]).toBeCloseTo(0.7);
  });

  it("converts stereo to mono by averaging channels", () => {
    const left = new Float32Array([0.8, 0.6, 0.4]);
    const right = new Float32Array([0.2, 0.4, 0.6]);
    const mono = stereoToMono(left, right);

    expect(mono.length).toBe(3);
    expect(mono[0]).toBeCloseTo(0.5); // (0.8 + 0.2) / 2
    expect(mono[1]).toBeCloseTo(0.5); // (0.6 + 0.4) / 2
    expect(mono[2]).toBeCloseTo(0.5); // (0.4 + 0.6) / 2
  });

  it("converts Float32 samples to Int16", () => {
    const float32 = new Float32Array([0, 1, -1, 0.5, -0.5]);
    const int16 = float32ToInt16(float32);

    expect(int16.length).toBe(5);
    expect(int16[0]).toBe(0);
    expect(int16[1]).toBe(32767); // max positive
    expect(int16[2]).toBe(-32768); // max negative
    expect(int16[3]).toBeCloseTo(16383); // half positive
    expect(int16[4]).toBeCloseTo(-16384); // half negative
  });

  it("processes stereo 48kHz audio buffer into PCM16 16kHz mono", () => {
    // Stereo 48kHz input
    const left = new Float32Array(96); // 2ms at 48kHz
    const right = new Float32Array(96);

    for (let i = 0; i < 96; i++) {
      left[i] = Math.sin((i / 48000) * 2 * Math.PI * 440); // 440Hz tone
      right[i] = Math.sin((i / 48000) * 2 * Math.PI * 440);
    }

    const pcm16 = processAudioBuffer([left, right], 48000, SAHARA_AUDIO_CONFIG);

    // Should be downsampled to 16kHz: 96 / 3 = 32 samples
    expect(pcm16.length).toBe(32);
    expect(pcm16).toBeInstanceOf(Int16Array);

    // Check all samples are within Int16 range
    for (const sample of pcm16) {
      expect(sample).toBeGreaterThanOrEqual(-32768);
      expect(sample).toBeLessThanOrEqual(32767);
    }
  });

  it("converts Int16Array to base64 for HTTP transmission", () => {
    const samples = new Int16Array([0, 1000, -1000, 32767, -32768]);
    const base64 = int16ArrayToBase64(samples);

    expect(typeof base64).toBe("string");
    expect(base64.length).toBeGreaterThan(0);

    // Decode and verify round-trip
    const decoded = Buffer.from(base64, "base64");
    const restored = new Int16Array(decoded.buffer, decoded.byteOffset, decoded.byteLength / 2);

    expect(restored.length).toBe(samples.length);
    for (let i = 0; i < samples.length; i++) {
      expect(restored[i]).toBe(samples[i]);
    }
  });
});

describe("Sahara Protocol Parsing", () => {
  it("parses session_ready message", () => {
    const message = parseSaharaMessage({
      type: "session_ready",
      sessionId: "sess_123",
      traceId: "trace_123",
      provider: "sahara",
      providerVersion: "2026.09",
      state: "ready",
    });

    expect(message.type).toBe("session_ready");
    if (message.type === "session_ready") {
      expect(message.sessionId).toBe("sess_123");
      expect(message.traceId).toBe("trace_123");
    }
  });

  it("parses audio_ack with acceptance", () => {
    const message = parseSaharaMessage({
      type: "audio_ack",
      sessionId: "sess_123",
      sequence: 5,
      accepted: true,
      status: "accepted",
    });

    expect(message.type).toBe("audio_ack");
    if (message.type === "audio_ack") {
      expect(message.sequence).toBe(5);
      expect(message.accepted).toBe(true);
    }
  });

  it("parses partial_transcript message", () => {
    const message = parseSaharaMessage({
      type: "partial_transcript",
      sessionId: "sess_123",
      traceId: "trace_123",
      transcript: "Hello there",
      segments: [],
      language: "en",
      providerVersion: "2026.09",
    });

    expect(message.type).toBe("partial_transcript");
    if (message.type === "partial_transcript") {
      expect(message.transcript).toBe("Hello there");
    }
  });

  it("parses final_transcript with code-switching metadata", () => {
    const message = parseSaharaMessage({
      type: "final_transcript",
      sessionId: "sess_123",
      traceId: "trace_123",
      transcript: "Habari gani? How are you?",
      segments: [
        { id: "seg_1", startMs: 0, endMs: 800, text: "Habari gani?" },
        { id: "seg_2", startMs: 900, endMs: 1500, text: "How are you?" },
      ],
      language: "sw",
      codeSwitch: {
        detected: true,
        switchCount: 1,
        density: 0.5,
        pairs: ["sw-en"],
      },
      startedAt: "2026-09-15T10:00:00.000Z",
      endedAt: "2026-09-15T10:00:01.500Z",
      providerVersion: "2026.09",
    });

    expect(message.type).toBe("final_transcript");
    if (message.type === "final_transcript") {
      expect(message.codeSwitch?.detected).toBe(true);
      expect(message.codeSwitch?.switchCount).toBe(1);
      expect(message.codeSwitch?.pairs).toContain("sw-en");
    }
  });

  it("throws AUTH_FAILED error on authentication failure", () => {
    expect(() =>
      parseSaharaMessage({
        type: "error",
        code: "AUTH_FAILED",
        message: "Invalid API key",
        retryable: false,
      }),
    ).toThrow("Sahara authentication failed");
  });

  it("throws QUOTA_EXCEEDED error on quota limit", () => {
    expect(() =>
      parseSaharaMessage({
        type: "error",
        sessionId: "sess_123",
        code: "QUOTA_EXCEEDED",
        message: "Monthly quota exceeded",
        retryable: false,
      }),
    ).toThrow("Sahara quota exceeded");
  });

  it("throws INVALID_AUDIO error on malformed audio", () => {
    expect(() =>
      parseSaharaMessage({
        type: "error",
        sessionId: "sess_123",
        code: "INVALID_AUDIO",
        message: "Expected PCM16, received incompatible format",
        retryable: false,
      }),
    ).toThrow("Malformed or invalid PCM16 audio payload");
  });

  it("throws SESSION_TIMEOUT error on session expiry", () => {
    expect(() =>
      parseSaharaMessage({
        type: "error",
        sessionId: "sess_123",
        code: "SESSION_TIMEOUT",
        message: "Session inactive for 5 minutes",
        retryable: false,
      }),
    ).toThrow("Sahara session timed out");
  });

  it("rejects malformed protocol messages", () => {
    expect(() =>
      parseSaharaMessage({
        type: "audio_ack",
        sessionId: "", // Invalid: empty sessionId
        sequence: -1, // Invalid: negative sequence
        accepted: true,
      }),
    ).toThrow("Malformed Sahara message");
  });
});

describe("PCM16 Audio Chunk Creation", () => {
  it("creates valid PCM16 audio chunk", () => {
    const samples = new Int16Array([0, 1000, -1000, 5000]);
    const chunk = createPcm16AudioChunk({
      sessionId: "sess_123",
      sequence: 0,
      samples,
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16,
    });

    expect(chunk.sessionId).toBe("sess_123");
    expect(chunk.sequence).toBe(0);
    expect(chunk.sampleRate).toBe(16000);
    expect(chunk.channels).toBe(1);
    expect(chunk.bitDepth).toBe(16);
    expect(chunk.payload).toBeInstanceOf(Int16Array);
    expect(chunk.payload.length).toBe(4);
  });

  it("rejects non-PCM16 sample rates", () => {
    const samples = new Int16Array([0, 100]);

    expect(() =>
      createPcm16AudioChunk({
        sessionId: "sess_123",
        sequence: 0,
        samples,
        sampleRate: 48000, // Wrong sample rate
        channels: 1,
        bitDepth: 16,
      }),
    ).toThrow("Sahara requires 16kHz PCM16 audio");
  });

  it("rejects non-mono audio", () => {
    const samples = new Int16Array([0, 100]);

    expect(() =>
      createPcm16AudioChunk({
        sessionId: "sess_123",
        sequence: 0,
        samples,
        sampleRate: 16000,
        channels: 2, // Stereo not allowed
        bitDepth: 16,
      }),
    ).toThrow("Sahara requires mono PCM16 audio");
  });

  it("rejects chunks exceeding max size", () => {
    // Create chunk larger than 64KB
    const samples = new Int16Array(40000); // 80KB

    expect(() =>
      createPcm16AudioChunk({
        sessionId: "sess_123",
        sequence: 0,
        samples,
        sampleRate: 16000,
        channels: 1,
        bitDepth: 16,
      }),
    ).toThrow("Sahara audio chunk exceeds the maximum size");
  });
});

describe("Voice Ingestion Pipeline with Mocked Provider", () => {
  const createMockProvider = (): SaharaProvider => ({
    async startSession(input) {
      return {
        sessionId: `sess_${crypto.randomUUID()}`,
        traceId: input.traceId,
        state: "ready" as const,
        provider: "sahara" as const,
        providerVersion: input.providerVersion,
      };
    },

    async sendAudioChunk(input) {
      return {
        type: "audio_ack" as const,
        sessionId: input.sessionId,
        sequence: input.sequence,
        accepted: true,
        status: "accepted" as const,
      };
    },

    async commit(input) {
      return {
        type: "final_transcript" as const,
        sessionId: input.sessionId,
        traceId: input.traceId,
        transcript: input.transcript,
        segments: input.segments,
        language: input.language,
        codeSwitch: input.codeSwitch,
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        providerVersion: input.providerVersion,
      };
    },
  });

  it("starts a voice session and persists metadata", async () => {
    const sessionStore: Record<string, SaharaSessionRecord> = {};
    const eventStore: SpeechEvent[] = [];
    const provider = createMockProvider();

    const pipeline = new SaharaVoicePipeline({
      provider,
      sessionStore,
      speechEventStore: eventStore,
      logger: {
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    });

    const session = await pipeline.startSession({
      traceId: "trace_123",
      workspaceId: "ws_1",
    });

    expect(session.sessionId).toMatch(/^sess_/);
    expect(session.traceId).toBe("trace_123");
    expect(session.provider).toBe("sahara");
    expect(session.state).toBe("ready");
    expect(sessionStore[session.sessionId]).toBeDefined();
  });

  it("sends audio chunks and receives acknowledgements", async () => {
    const sessionStore: Record<string, SaharaSessionRecord> = {};
    const eventStore: SpeechEvent[] = [];
    const provider = createMockProvider();

    const pipeline = new SaharaVoicePipeline({
      provider,
      sessionStore,
      speechEventStore: eventStore,
    });

    const session = await pipeline.startSession({
      traceId: "trace_123",
      workspaceId: "ws_1",
    });

    const chunk1 = createPcm16AudioChunk({
      sessionId: session.sessionId,
      sequence: 0,
      samples: new Int16Array([0, 1000, -1000]),
      sampleRate: SaharaAudioConfig.sampleRate,
      channels: SaharaAudioConfig.channels,
      bitDepth: SaharaAudioConfig.bitDepth,
    });

    const ack1 = await pipeline.sendAudioChunk(session.sessionId, chunk1);
    expect(ack1.type).toBe("audio_ack");
    expect(sessionStore[session.sessionId]?.state).toBe("streaming");
    expect(sessionStore[session.sessionId]?.lastSequence).toBe(0);

    const chunk2 = createPcm16AudioChunk({
      sessionId: session.sessionId,
      sequence: 1,
      samples: new Int16Array([2000, -2000]),
      sampleRate: SaharaAudioConfig.sampleRate,
      channels: SaharaAudioConfig.channels,
      bitDepth: SaharaAudioConfig.bitDepth,
    });

    const ack2 = await pipeline.sendAudioChunk(session.sessionId, chunk2);
    expect(ack2.type).toBe("audio_ack");
    expect(sessionStore[session.sessionId]?.lastSequence).toBe(1);
  });

  it("commits transcript and creates SpeechEvent with provenance", async () => {
    const sessionStore: Record<string, SaharaSessionRecord> = {};
    const eventStore: SpeechEvent[] = [];
    const provider = createMockProvider();

    const pipeline = new SaharaVoicePipeline({
      provider,
      sessionStore,
      speechEventStore: eventStore,
    });

    const session = await pipeline.startSession({
      traceId: "trace_123",
      workspaceId: "ws_1",
    });

    const speechEvent = await pipeline.commitTranscript(session.sessionId, {
      traceId: session.traceId,
      transcript: "Ninataka kukumbuka saa tatu leo",
      segments: [
        { id: "seg_1", startMs: 0, endMs: 2500, text: "Ninataka kukumbuka saa tatu leo" },
      ],
      language: "sw",
      codeSwitch: { detected: false, switchCount: 0, pairs: [] },
      startedAt: "2026-09-15T10:00:00.000Z",
      endedAt: "2026-09-15T10:00:02.500Z",
    });

    expect(speechEvent.id).toMatch(/^speech_/);
    expect(speechEvent.traceId).toBe("trace_123");
    expect(speechEvent.sessionId).toBe(session.sessionId);
    expect(speechEvent.provider).toBe("sahara");
    expect(speechEvent.transcript.text).toBe("Ninataka kukumbuka saa tatu leo");
    expect(speechEvent.transcript.segments).toHaveLength(1);
    expect(speechEvent.codeSwitch.detected).toBe(false);
    expect(speechEvent.provenance).toHaveLength(1);
    expect(speechEvent.provenance[0]?.type).toBe("transcript");
    expect(speechEvent.provenance[0]?.source).toBe("sahara");

    expect(sessionStore[session.sessionId]?.state).toBe("committed");
    expect(eventStore).toHaveLength(1);
    expect(eventStore[0]?.id).toBe(speechEvent.id);
  });

  it("handles code-switched speech with language spans", async () => {
    const sessionStore: Record<string, SaharaSessionRecord> = {};
    const eventStore: SpeechEvent[] = [];
    const provider = createMockProvider();

    const pipeline = new SaharaVoicePipeline({
      provider,
      sessionStore,
      speechEventStore: eventStore,
    });

    const session = await pipeline.startSession({
      traceId: "trace_456",
      workspaceId: "ws_1",
    });

    const speechEvent = await pipeline.commitTranscript(session.sessionId, {
      traceId: session.traceId,
      transcript: "Habari yako? How are you doing?",
      segments: [
        { id: "seg_1", startMs: 0, endMs: 900, text: "Habari yako?" },
        { id: "seg_2", startMs: 1000, endMs: 2200, text: "How are you doing?" },
      ],
      language: "sw",
      codeSwitch: {
        detected: true,
        switchCount: 1,
        density: 0.45,
        pairs: ["sw-en"],
      },
      startedAt: "2026-09-15T10:05:00.000Z",
      endedAt: "2026-09-15T10:05:02.200Z",
    });

    expect(speechEvent.codeSwitch.detected).toBe(true);
    expect(speechEvent.codeSwitch.switchCount).toBe(1);
    expect(speechEvent.codeSwitch.density).toBe(0.45);
    expect(speechEvent.codeSwitch.pairs).toContain("sw-en");
  });

  it("rejects audio chunks after session timeout", async () => {
    const sessionStore: Record<string, SaharaSessionRecord> = {};
    const eventStore: SpeechEvent[] = [];
    const provider = createMockProvider();

    const pipeline = new SaharaVoicePipeline({
      provider,
      sessionStore,
      speechEventStore: eventStore,
    });

    const session = await pipeline.startSession({
      traceId: "trace_789",
      workspaceId: "ws_1",
    });

    // Manually expire the session
    const sessionRecord = sessionStore[session.sessionId];
    if (sessionRecord) {
      sessionRecord.expiresAt = new Date(Date.now() - 1000).toISOString();
    }

    const chunk = createPcm16AudioChunk({
      sessionId: session.sessionId,
      sequence: 0,
      samples: new Int16Array([0, 100]),
      sampleRate: SaharaAudioConfig.sampleRate,
      channels: SaharaAudioConfig.channels,
      bitDepth: SaharaAudioConfig.bitDepth,
    });

    await expect(pipeline.sendAudioChunk(session.sessionId, chunk)).rejects.toThrow("Sahara session timed out");
  });
});

describe("SpeechEvent Schema Validation", () => {
  it("creates valid SpeechEvent with full provenance", () => {
    const event = createSpeechEvent({
      id: "speech_123",
      traceId: "trace_123",
      sessionId: "sess_123",
      provider: "sahara",
      providerVersion: "2026.09",
      transcript: {
        text: "Remind me to call Ngozi tomorrow",
        segments: [
          { id: "seg_1", startMs: 0, endMs: 2000, text: "Remind me to call Ngozi tomorrow" },
        ],
      },
      languageSpans: [{ start: 0, end: 32, language: "en" }],
      codeSwitch: { detected: false, switchCount: 0, pairs: [] },
      timing: {
        startedAt: "2026-09-15T10:00:00.000Z",
        endedAt: "2026-09-15T10:00:02.000Z",
      },
      provenance: [
        {
          id: "prov_1",
          type: "transcript",
          source: "sahara",
        },
      ],
    });

    expect(event.id).toBe("speech_123");
    expect(event.provider).toBe("sahara");
    expect(event.transcript.text).toContain("Ngozi");
    expect(event.provenance).toHaveLength(1);
  });

  it("validates transcript segment timing constraints", () => {
    expect(() =>
      createSpeechEvent({
        id: "speech_456",
        traceId: "trace_456",
        sessionId: "sess_456",
        provider: "sahara",
        providerVersion: "2026.09",
        transcript: {
          text: "Test",
          segments: [
            { id: "seg_1", startMs: -100, endMs: 1000, text: "Test" }, // Invalid: negative start
          ],
        },
        languageSpans: [],
        codeSwitch: { detected: false, switchCount: 0, pairs: [] },
        timing: {
          startedAt: "2026-09-15T10:00:00.000Z",
          endedAt: "2026-09-15T10:00:01.000Z",
        },
      }),
    ).toThrow();
  });
});
