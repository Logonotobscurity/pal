import { describe, expect, it } from "vitest";
import {
  SaharaAudioConfig,
  SaharaVoicePipeline,
  parseSaharaMessage,
  createPcm16AudioChunk,
  type SaharaProtocolMessage,
  type SaharaSessionRecord,
  type SaharaCommitInput,
} from "@/providers/sahara";
import type { SpeechEvent } from "@/core/schemas/speech-event";

describe("Sahara voice ingestion", () => {
  it("parses the protocol messages for audio ack and final transcript", () => {
    const ack = parseSaharaMessage({
      type: "audio_ack",
      sessionId: "sess_123",
      sequence: 3,
      accepted: true,
      status: "accepted",
    });

    expect(ack.type).toBe("audio_ack");
    if (ack.type === "audio_ack") {
      expect(ack.sessionId).toBe("sess_123");
      expect(ack.sequence).toBe(3);
    }

    const finalTranscript = parseSaharaMessage({
      type: "final_transcript",
      sessionId: "sess_123",
      traceId: "trace_123",
      transcript: "I need a reminder today",
      segments: [
        { id: "seg_1", startMs: 0, endMs: 1800, text: "I need a reminder today" },
      ],
      language: "en",
      codeSwitch: { detected: false, switchCount: 0, pairs: [] },
      startedAt: "2026-09-15T10:00:00.000Z",
      endedAt: "2026-09-15T10:00:01.800Z",
      providerVersion: "2026.09",
    });

    expect(finalTranscript.type).toBe("final_transcript");
    if (finalTranscript.type === "final_transcript") {
      expect(finalTranscript.transcript).toBe("I need a reminder today");
      expect(finalTranscript.segments).toHaveLength(1);
    }
  });

  it("persists session metadata and committed speech events through a mocked Sahara provider", async () => {
    const sessionStore: Record<string, SaharaSessionRecord> = {};
    const eventStore: SpeechEvent[] = [];
    const provider = {
      async startSession(input: { traceId: string; provider: "sahara"; providerVersion: string }) {
        return {
          sessionId: "sess_mock",
          traceId: input.traceId,
          state: "ready" as const,
          provider: input.provider,
          providerVersion: input.providerVersion,
        };
      },
      async sendAudioChunk(input: { sessionId: string; sequence: number; payload: Int16Array }) {
        return {
          type: "audio_ack",
          sessionId: input.sessionId,
          sequence: input.sequence,
          accepted: true,
          status: "accepted",
        } satisfies SaharaProtocolMessage;
      },
      async commit(input: SaharaCommitInput) {
        return {
          type: "final_transcript",
          sessionId: input.sessionId,
          traceId: input.traceId,
          transcript: input.transcript,
          segments: input.segments,
          language: input.language,
          codeSwitch: input.codeSwitch,
          startedAt: input.startedAt,
          endedAt: input.endedAt,
          providerVersion: input.providerVersion,
        } satisfies SaharaProtocolMessage;
      },
    };

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

    const session = await pipeline.startSession({ traceId: "trace_123", workspaceId: "ws_1" });
    const audio = createPcm16AudioChunk({
      sessionId: session.sessionId,
      sequence: 0,
      samples: new Int16Array([0, 1000, -1000, 2000]),
      sampleRate: SaharaAudioConfig.sampleRate,
      channels: SaharaAudioConfig.channels,
      bitDepth: SaharaAudioConfig.bitDepth,
    });

    await pipeline.sendAudioChunk(session.sessionId, audio);
    const speechEvent = await pipeline.commitTranscript(session.sessionId, {
      traceId: session.traceId,
      transcript: "I need a reminder today",
      segments: [{ id: "seg_1", startMs: 0, endMs: 1800, text: "I need a reminder today" }],
      language: "en",
      codeSwitch: { detected: false, switchCount: 0, pairs: [] },
      startedAt: "2026-09-15T10:00:00.000Z",
      endedAt: "2026-09-15T10:00:01.800Z",
    });

    expect(sessionStore[session.sessionId]?.provider).toBe("sahara");
    expect(sessionStore[session.sessionId]?.state).toBe("committed");
    expect(eventStore).toHaveLength(1);
    expect(speechEvent.transcript.text).toContain("reminder");
    expect(speechEvent.sessionId).toBe(session.sessionId);
  });
});
