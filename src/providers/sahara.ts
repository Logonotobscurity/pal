import { z } from "zod";
import {
  SpeechEventCodeSwitchSchema,
  TranscriptSegmentSchema,
  createSpeechEvent,
  type SpeechEvent,
} from "@/core/schemas/speech-event";

export const SaharaAudioConfig = Object.freeze({
  sampleRate: 16000,
  channels: 1,
  bitDepth: 16,
  maxChunkBytes: 64 * 1024,
  maxSessionDurationMs: 5 * 60 * 1000,
  providerName: "sahara",
  providerVersion: "2026.09",
} as const);

export type SaharaStreamState = "ready" | "streaming" | "committed" | "error";

export type SaharaAudioChunk = {
  sessionId: string;
  sequence: number;
  payload: Int16Array;
  sampleRate: number;
  channels: number;
  bitDepth: number;
  createdAt: string;
};

export type SaharaSessionRecord = {
  sessionId: string;
  traceId: string;
  workspaceId: string;
  provider: "sahara";
  providerVersion: string;
  state: SaharaStreamState;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  lastSequence: number;
  partialTranscript?: string | undefined;
};

const SaharaAudioAckSchema = z.object({
  type: z.literal("audio_ack"),
  sessionId: z.string().trim().min(1),
  sequence: z.number().int().nonnegative(),
  accepted: z.boolean(),
  status: z.enum(["accepted", "rejected", "error"]).default("accepted"),
  message: z.string().trim().min(1).optional(),
});

const SaharaPartialTranscriptSchema = z.object({
  type: z.literal("partial_transcript"),
  sessionId: z.string().trim().min(1),
  traceId: z.string().trim().min(1).optional(),
  transcript: z.string().trim().min(1).max(20000),
  segments: z.array(TranscriptSegmentSchema).default([]),
  language: z.string().trim().min(1).optional(),
  codeSwitch: SpeechEventCodeSwitchSchema.optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
  providerVersion: z.string().trim().min(1).optional(),
});

const SaharaFinalTranscriptSchema = z.object({
  type: z.literal("final_transcript"),
  sessionId: z.string().trim().min(1),
  traceId: z.string().trim().min(1).optional(),
  transcript: z.string().trim().min(1).max(20000),
  segments: z.array(TranscriptSegmentSchema).min(1),
  language: z.string().trim().min(1).optional(),
  codeSwitch: SpeechEventCodeSwitchSchema.optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
  providerVersion: z.string().trim().min(1).optional(),
});

const SaharaSessionReadySchema = z.object({
  type: z.literal("session_ready"),
  sessionId: z.string().trim().min(1),
  traceId: z.string().trim().min(1),
  provider: z.literal("sahara"),
  providerVersion: z.string().trim().min(1),
  state: z.enum(["ready", "streaming", "committed", "error"]),
});

const SaharaErrorSchema = z.object({
  type: z.literal("error"),
  sessionId: z.string().trim().min(1).optional(),
  traceId: z.string().trim().min(1).optional(),
  code: z.enum([
    "AUTH_FAILED",
    "QUOTA_EXCEEDED",
    "INVALID_AUDIO",
    "SESSION_TIMEOUT",
    "CONNECTION_FAILED",
    "MALFORMED_MESSAGE",
  ]),
  message: z.string().trim().min(1),
  retryable: z.boolean().default(false),
  provider: z.literal("sahara").optional(),
  providerVersion: z.string().trim().min(1).optional(),
});

export const SaharaProtocolMessageSchema = z.union([
  SaharaAudioAckSchema,
  SaharaPartialTranscriptSchema,
  SaharaFinalTranscriptSchema,
  SaharaSessionReadySchema,
  SaharaErrorSchema,
]);

export type SaharaProtocolMessage = z.infer<typeof SaharaProtocolMessageSchema>;

export function parseSaharaMessage(raw: unknown): SaharaProtocolMessage {
  const parsed = SaharaProtocolMessageSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`Malformed Sahara message: ${issue?.message ?? "unknown parser error"}`);
  }

  const message = parsed.data;
  if (message.type === "error") {
    switch (message.code) {
      case "AUTH_FAILED":
        throw new Error("Sahara authentication failed.");
      case "QUOTA_EXCEEDED":
        throw new Error("Sahara quota exceeded.");
      case "INVALID_AUDIO":
        throw new Error("Malformed or invalid PCM16 audio payload.");
      case "SESSION_TIMEOUT":
        throw new Error("Sahara session timed out.");
      case "CONNECTION_FAILED":
        throw new Error("Sahara connection failed.");
      case "MALFORMED_MESSAGE":
        throw new Error("Malformed Sahara protocol message.");
      default:
        throw new Error(`Sahara provider error: ${message.code}`);
    }
  }

  return message;
}

export function createPcm16AudioChunk(input: {
  sessionId: string;
  sequence: number;
  samples: Int16Array;
  sampleRate?: number;
  channels?: number;
  bitDepth?: number;
  createdAt?: string;
}): SaharaAudioChunk {
  const sampleRate = input.sampleRate ?? SaharaAudioConfig.sampleRate;
  const channels = input.channels ?? SaharaAudioConfig.channels;
  const bitDepth = input.bitDepth ?? SaharaAudioConfig.bitDepth;

  if (sampleRate !== SaharaAudioConfig.sampleRate) {
    throw new Error(`Sahara requires 16kHz PCM16 audio; received ${sampleRate}Hz.`);
  }

  if (channels !== SaharaAudioConfig.channels) {
    throw new Error(`Sahara requires mono PCM16 audio; received ${channels} channel(s).`);
  }

  if (bitDepth !== SaharaAudioConfig.bitDepth) {
    throw new Error(`Sahara requires 16-bit PCM; received ${bitDepth}-bit payload.`);
  }

  if (!(input.samples instanceof Int16Array)) {
    throw new Error("Sahara audio payload must be Int16Array PCM16 samples.");
  }

  if (input.samples.length === 0) {
    throw new Error("Sahara audio payload cannot be empty.");
  }

  const chunkSize = input.samples.byteLength;
  if (chunkSize > SaharaAudioConfig.maxChunkBytes) {
    throw new Error(`Sahara audio chunk exceeds the maximum size of ${SaharaAudioConfig.maxChunkBytes} bytes.`);
  }

  return {
    sessionId: input.sessionId,
    sequence: input.sequence,
    payload: input.samples,
    sampleRate,
    channels,
    bitDepth,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export type SaharaLogger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

export type SaharaCommitInput = {
  sessionId: string;
  traceId: string;
  transcript: string;
  segments: Array<{ id: string; startMs: number; endMs: number; text: string }>;
  language?: string | undefined;
  codeSwitch?: { detected: boolean; switchCount: number; density?: number | undefined; pairs: string[] } | undefined;
  startedAt?: string | undefined;
  endedAt?: string | undefined;
  providerVersion: string;
};

export type SaharaProvider = {
  startSession: (input: {
    traceId: string;
    workspaceId: string;
    provider: "sahara";
    providerVersion: string;
  }) => Promise<{
    sessionId: string;
    traceId: string;
    state: SaharaStreamState;
    provider: "sahara";
    providerVersion: string;
  }>;
  sendAudioChunk: (input: {
    sessionId: string;
    sequence: number;
    payload: Int16Array;
    sampleRate: number;
    channels: number;
    bitDepth: number;
  }) => Promise<SaharaProtocolMessage>;
  commit: (input: SaharaCommitInput) => Promise<SaharaProtocolMessage>;
};

export class SaharaVoicePipeline {
  private readonly provider: SaharaProvider;
  private readonly sessionStore: Record<string, SaharaSessionRecord>;
  private readonly speechEventStore: SpeechEvent[];
  private readonly logger: SaharaLogger;

  constructor(input: {
    provider: SaharaProvider;
    sessionStore?: Record<string, SaharaSessionRecord>;
    speechEventStore?: SpeechEvent[];
    logger?: SaharaLogger;
  }) {
    this.provider = input.provider;
    this.sessionStore = input.sessionStore ?? {};
    this.speechEventStore = input.speechEventStore ?? [];
    this.logger = input.logger ?? {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    };
  }

  async startSession(input: { traceId: string; workspaceId: string }): Promise<SaharaSessionRecord> {
    if (!input.traceId.trim()) {
      throw new Error("Trace id is required to start a Sahara voice session.");
    }

    const now = new Date();
    const sessionId = `sahara_${crypto.randomUUID()}`;
    const record: SaharaSessionRecord = {
      sessionId,
      traceId: input.traceId,
      workspaceId: input.workspaceId,
      provider: "sahara",
      providerVersion: SaharaAudioConfig.providerVersion,
      state: "ready",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + SaharaAudioConfig.maxSessionDurationMs).toISOString(),
      lastSequence: -1,
    };

    this.sessionStore[sessionId] = record;
    this.logger.info("sahara.session.start", { sessionId, traceId: input.traceId, workspaceId: input.workspaceId });

    const session = await this.provider.startSession({
      traceId: input.traceId,
      workspaceId: input.workspaceId,
      provider: "sahara",
      providerVersion: record.providerVersion,
    });

    const persisted = {
      ...record,
      sessionId: session.sessionId,
      traceId: session.traceId,
      providerVersion: session.providerVersion,
      state: session.state,
      updatedAt: new Date().toISOString(),
    };

    // Keep both the temporary local key and the provider's session id mapping
    // for robustness: some callers may reference the original temp id while
    // others (provider callbacks) will use the provider-assigned id.
    this.sessionStore[sessionId] = persisted;
    this.sessionStore[session.sessionId] = persisted;

    return persisted;
  }

  async sendAudioChunk(sessionId: string, chunk: SaharaAudioChunk): Promise<SaharaProtocolMessage> {
    const session = this.requireSession(sessionId);
    this.ensureSessionAlive(session);
    this.validateChunkForSession(session, chunk);

    const ack = await this.provider.sendAudioChunk({
      sessionId: session.sessionId,
      sequence: chunk.sequence,
      payload: chunk.payload,
      sampleRate: chunk.sampleRate,
      channels: chunk.channels,
      bitDepth: chunk.bitDepth,
    });

    const message = parseSaharaMessage(ack);
    if (message.type === "audio_ack" && message.accepted === false) {
      session.state = "error";
      session.updatedAt = new Date().toISOString();
      this.logger.warn("sahara.audio.rejected", { sessionId, sequence: chunk.sequence, status: message.status });
      throw new Error(message.message ?? "Sahara rejected the audio chunk.");
    }

    session.lastSequence = Math.max(session.lastSequence, chunk.sequence);
    session.state = "streaming";
    session.updatedAt = new Date().toISOString();
    this.logger.info("sahara.audio.ack", { sessionId, sequence: chunk.sequence, accepted: message.type === "audio_ack" ? message.accepted : true });

    return message;
  }

  async updatePartialTranscript(sessionId: string, partial: SaharaProtocolMessage): Promise<SaharaProtocolMessage> {
    const session = this.requireSession(sessionId);
    const message = parseSaharaMessage(partial);

    if (message.type !== "partial_transcript") {
      throw new Error("Only partial transcript updates are accepted for UI progress.");
    }

    session.state = "streaming";
    session.partialTranscript = message.transcript;
    session.updatedAt = new Date().toISOString();
    this.logger.info("sahara.partial_transcript", {
      sessionId,
      transcriptLength: message.transcript.length,
      segments: message.segments.length,
    });

    return message;
  }

  async commitTranscript(
    sessionId: string,
    input: {
      traceId: string;
      transcript: string;
      segments: Array<{ id: string; startMs: number; endMs: number; text: string }>;
      language?: string | undefined;
      codeSwitch?: { detected: boolean; switchCount: number; density?: number | undefined; pairs: string[] } | undefined;
      startedAt?: string | undefined;
      endedAt?: string | undefined;
    },
  ): Promise<SpeechEvent> {
    const session = this.requireSession(sessionId);
    this.ensureSessionAlive(session);

    const response = await this.provider.commit({
      sessionId: session.sessionId,
      traceId: input.traceId,
      transcript: input.transcript,
      segments: input.segments,
      language: input.language,
      codeSwitch: input.codeSwitch,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      providerVersion: session.providerVersion,
    });

    const message = parseSaharaMessage(response);
    if (message.type !== "final_transcript") {
      throw new Error("Sahara did not return a final transcript for the committed speech event.");
    }

    const event = createSpeechEvent({
      id: `speech_${crypto.randomUUID()}`,
      traceId: message.traceId ?? input.traceId,
      sessionId: session.sessionId,
      provider: "sahara",
      providerVersion: session.providerVersion,
      transcript: {
        text: message.transcript,
        segments: message.segments,
      },
      languageSpans: message.language
        ? [{ start: 0, end: message.transcript.length, language: message.language }]
        : [],
      codeSwitch: message.codeSwitch ?? { detected: false, switchCount: 0, pairs: [] },
      timing: {
        startedAt: message.startedAt ?? input.startedAt ?? new Date().toISOString(),
        endedAt: message.endedAt ?? input.endedAt ?? new Date().toISOString(),
      },
      provenance: [
        {
          id: `prov_${crypto.randomUUID()}`,
          type: "transcript",
          source: "sahara",
        },
      ],
    });

    this.speechEventStore.push(event);
    session.state = "committed";
    session.partialTranscript = message.transcript;
    session.updatedAt = new Date().toISOString();
    this.logger.info("sahara.session.committed", { sessionId: session.sessionId, speechEventId: event.id });

    return event;
  }

  private requireSession(sessionId: string): SaharaSessionRecord {
    const session = this.sessionStore[sessionId];
    if (!session) {
      throw new Error(`Unknown Sahara session: ${sessionId}`);
    }
    return session;
  }

  private ensureSessionAlive(session: SaharaSessionRecord): void {
    const expiresAt = new Date(session.expiresAt).getTime();
    if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
      session.state = "error";
      session.updatedAt = new Date().toISOString();
      this.logger.error("sahara.session.timeout", { sessionId: session.sessionId, traceId: session.traceId, expiresAt: session.expiresAt });
      throw new Error("Sahara session timed out.");
    }
  }

  private validateChunkForSession(session: SaharaSessionRecord, chunk: SaharaAudioChunk): void {
    if (session.sessionId !== chunk.sessionId) {
      throw new Error("Audio chunk session does not match the active Sahara session.");
    }

    if (chunk.sampleRate !== SaharaAudioConfig.sampleRate) {
      throw new Error(`Sahara requires ${SaharaAudioConfig.sampleRate}Hz PCM16 audio.`);
    }

    if (chunk.channels !== SaharaAudioConfig.channels) {
      throw new Error(`Sahara requires ${SaharaAudioConfig.channels} channel audio.`);
    }

    if (chunk.bitDepth !== SaharaAudioConfig.bitDepth) {
      throw new Error(`Sahara requires ${SaharaAudioConfig.bitDepth}-bit PCM audio.`);
    }

    if (!(chunk.payload instanceof Int16Array)) {
      throw new Error("Malformed audio payload: Sahara requires Int16Array PCM16 samples.");
    }

    if (chunk.sequence !== session.lastSequence + 1) {
      this.logger.warn("sahara.audio.backpressure", {
        sessionId: session.sessionId,
        expectedSequence: session.lastSequence + 1,
        receivedSequence: chunk.sequence,
      });
    }
  }
}
