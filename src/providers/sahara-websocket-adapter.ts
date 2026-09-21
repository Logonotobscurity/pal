/**
 * Sahara WebSocket Adapter — Real streaming speech-to-text integration
 * 
 * Implements PAL_ARCHITECTURE.md §35–§37: PCM16 streaming with server-side
 * provider connection. The browser never receives long-lived provider credentials.
 * 
 * Protocol expectations (based on common streaming STT patterns):
 * - WebSocket endpoint with authentication
 * - Send: PCM16 audio chunks (16kHz, mono, 16-bit)
 * - Receive: partial transcripts, final transcripts, acknowledgements, errors
 * - Commit: explicit commit message to finalize session
 */

import { WebSocket } from "ws";
import type { SaharaProvider, SaharaProtocolMessage, SaharaLogger, SaharaCommitInput } from "./sahara";

export type SaharaWebSocketConfig = {
  endpoint: string;
  apiSecret: string;
  sampleRate: number;
  channels: number;
  bitDepth: number;
  logger?: SaharaLogger;
};

type OutgoingMessage =
  | { type: "audio_chunk"; sessionId: string; sequence: number; payload: string }
  | { type: "commit"; sessionId: string; traceId: string };

type IncomingMessage =
  | { type: "session_ready"; sessionId: string; traceId: string; provider: "sahara"; providerVersion: string; state: string }
  | { type: "audio_ack"; sessionId: string; sequence: number; accepted: boolean; status: string; message?: string }
  | {
      type: "partial_transcript";
      sessionId: string;
      traceId?: string;
      transcript: string;
      segments?: Array<{ id: string; startMs: number; endMs: number; text: string }>;
      language?: string;
      codeSwitch?: { detected: boolean; switchCount: number; density?: number; pairs: string[] };
      startedAt?: string;
      endedAt?: string;
      providerVersion?: string;
    }
  | {
      type: "final_transcript";
      sessionId: string;
      traceId?: string;
      transcript: string;
      segments: Array<{ id: string; startMs: number; endMs: number; text: string }>;
      language?: string;
      codeSwitch?: { detected: boolean; switchCount: number; density?: number; pairs: string[] };
      startedAt?: string;
      endedAt?: string;
      providerVersion?: string;
    }
  | {
      type: "error";
      sessionId?: string;
      traceId?: string;
      code: string;
      message: string;
      retryable: boolean;
      provider?: "sahara";
      providerVersion?: string;
    };

export class SaharaWebSocketAdapter implements SaharaProvider {
  private readonly config: SaharaWebSocketConfig;
  private readonly logger: SaharaLogger;
  private ws: WebSocket | null = null;
  private readonly messageHandlers = new Map<string, (msg: IncomingMessage) => void>();
  private readonly pendingResponses = new Map<string, { resolve: (value: unknown) => void; reject: (err: Error) => void }>();
  private connectionPromise: Promise<void> | null = null;
  private messageQueue: OutgoingMessage[] = [];
  private isConnecting = false;

  constructor(config: SaharaWebSocketConfig) {
    this.config = config;
    this.logger = config.logger ?? {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    };
  }

  async startSession(input: {
    traceId: string;
    workspaceId: string;
    provider: "sahara";
    providerVersion: string;
  }): Promise<{
    sessionId: string;
    traceId: string;
    state: "ready" | "streaming" | "committed" | "error";
    provider: "sahara";
    providerVersion: string;
  }> {
    await this.ensureConnected();

    return new Promise((resolve, reject) => {
      const requestId = `start_${crypto.randomUUID()}`;

      // Send session start request
      const startMsg = {
        type: "start_session" as const,
        requestId,
        traceId: input.traceId,
        workspaceId: input.workspaceId,
        config: {
          sampleRate: this.config.sampleRate,
          channels: this.config.channels,
          bitDepth: this.config.bitDepth,
          language: "auto", // Sahara auto-detects including code-switching
        },
      };

      this.sendMessage(startMsg);

      // Wait for session_ready response
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(requestId);
        reject(new Error("Sahara session start timeout after 10s"));
      }, 10000);

      this.pendingResponses.set(requestId, {
        resolve: (msg: unknown) => {
          clearTimeout(timeout);
          const ready = msg as IncomingMessage & { type: "session_ready" };
          this.logger.info("sahara.adapter.session_ready", {
            sessionId: ready.sessionId,
            traceId: ready.traceId,
          });
          resolve({
            sessionId: ready.sessionId,
            traceId: ready.traceId,
            state: ready.state as "ready",
            provider: "sahara",
            providerVersion: ready.providerVersion,
          });
        },
        reject: (err: Error) => {
          clearTimeout(timeout);
          reject(err);
        },
      });
    });
  }

  async sendAudioChunk(input: {
    sessionId: string;
    sequence: number;
    payload: Int16Array;
    sampleRate: number;
    channels: number;
    bitDepth: number;
  }): Promise<SaharaProtocolMessage> {
    await this.ensureConnected();

    // Convert Int16Array to base64 for WebSocket transmission
    const buffer = Buffer.from(input.payload.buffer);
    const base64Payload = buffer.toString("base64");

    return new Promise((resolve, reject) => {
      const requestId = `audio_${input.sessionId}_${input.sequence}`;

      const audioMsg: OutgoingMessage = {
        type: "audio_chunk",
        sessionId: input.sessionId,
        sequence: input.sequence,
        payload: base64Payload,
      };

      this.sendMessage(audioMsg);

      // Wait for acknowledgement or partial/final transcript
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(requestId);
        reject(new Error(`Sahara audio chunk ${input.sequence} timeout`));
      }, 5000);

      this.pendingResponses.set(requestId, {
        resolve: (msg: unknown) => {
          clearTimeout(timeout);
          const response = msg as IncomingMessage;
          this.logger.info("sahara.adapter.chunk_ack", {
            sessionId: input.sessionId,
            sequence: input.sequence,
            type: response.type,
          });
          resolve(response as SaharaProtocolMessage);
        },
        reject: (err: Error) => {
          clearTimeout(timeout);
          reject(err);
        },
      });
    });
  }

  async commit(input: SaharaCommitInput): Promise<SaharaProtocolMessage> {
    await this.ensureConnected();

    return new Promise((resolve, reject) => {
      const requestId = `commit_${input.sessionId}`;

      const commitMsg: OutgoingMessage = {
        type: "commit",
        sessionId: input.sessionId,
        traceId: input.traceId,
      };

      this.sendMessage(commitMsg);

      // Wait for final_transcript response
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(requestId);
        reject(new Error("Sahara commit timeout"));
      }, 10000);

      this.pendingResponses.set(requestId, {
        resolve: (msg: unknown) => {
          clearTimeout(timeout);
          const final = msg as IncomingMessage & { type: "final_transcript" };
          this.logger.info("sahara.adapter.commit_complete", {
            sessionId: input.sessionId,
            transcriptLength: final.transcript.length,
          });
          resolve(final as SaharaProtocolMessage);
        },
        reject: (err: Error) => {
          clearTimeout(timeout);
          reject(err);
        },
      });
    });
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectionPromise = null;
    this.pendingResponses.clear();
    this.messageHandlers.clear();
  }

  private async ensureConnected(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.connect();
    return this.connectionPromise;
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isConnecting = true;

        // Construct WebSocket URL with authentication
        const url = new URL(this.config.endpoint);
        url.searchParams.set("auth", this.config.apiSecret);
        url.searchParams.set("sample_rate", String(this.config.sampleRate));
        url.searchParams.set("channels", String(this.config.channels));
        url.searchParams.set("bit_depth", String(this.config.bitDepth));

        this.logger.info("sahara.adapter.connecting", { endpoint: this.config.endpoint });

        this.ws = new WebSocket(url.toString());

        this.ws.on("open", () => {
          this.isConnecting = false;
          this.logger.info("sahara.adapter.connected");

          // Flush message queue
          for (const msg of this.messageQueue) {
            this.sendMessage(msg);
          }
          this.messageQueue = [];

          resolve();
        });

        this.ws.on("message", (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString()) as IncomingMessage;
            this.handleIncomingMessage(message);
          } catch (err) {
            this.logger.error("sahara.adapter.message_parse_error", { error: String(err) });
          }
        });

        this.ws.on("error", (err: Error) => {
          this.logger.error("sahara.adapter.error", { error: err.message });
          this.isConnecting = false;
          this.connectionPromise = null;

          // Reject all pending requests
          for (const { reject: rejectFn } of this.pendingResponses.values()) {
            rejectFn(new Error("WebSocket connection error"));
          }
          this.pendingResponses.clear();

          reject(err);
        });

        this.ws.on("close", () => {
          this.logger.info("sahara.adapter.closed");
          this.ws = null;
          this.connectionPromise = null;

          // Reject all pending requests
          for (const { reject: rejectFn } of this.pendingResponses.values()) {
            rejectFn(new Error("WebSocket closed"));
          }
          this.pendingResponses.clear();
        });

        // Connection timeout
        setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false;
            this.ws?.close();
            reject(new Error("Sahara WebSocket connection timeout"));
          }
        }, 10000);
      } catch (err) {
        this.isConnecting = false;
        this.connectionPromise = null;
        reject(err);
      }
    });
  }

  private sendMessage(msg: OutgoingMessage | Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (this.isConnecting) {
        this.messageQueue.push(msg as OutgoingMessage);
        return;
      }
      throw new Error("Sahara WebSocket not connected");
    }

    this.ws.send(JSON.stringify(msg));
  }

  private handleIncomingMessage(msg: IncomingMessage): void {
    // Handle errors first
    if (msg.type === "error") {
      this.logger.error("sahara.adapter.provider_error", {
        code: msg.code,
        message: msg.message,
        sessionId: msg.sessionId,
      });

      // Reject pending request if sessionId matches
      if (msg.sessionId) {
        for (const [key, { reject }] of this.pendingResponses.entries()) {
          if (key.includes(msg.sessionId)) {
            this.pendingResponses.delete(key);
            reject(new Error(`Sahara error: ${msg.code} - ${msg.message}`));
          }
        }
      }
      return;
    }

    // Route responses to pending requests
    if (msg.type === "session_ready") {
      for (const [key, { resolve }] of this.pendingResponses.entries()) {
        if (key.startsWith("start_")) {
          this.pendingResponses.delete(key);
          resolve(msg);
          return;
        }
      }
    }

    if (msg.type === "audio_ack" || msg.type === "partial_transcript") {
      for (const [pendingKey, { resolve }] of this.pendingResponses.entries()) {
        if (pendingKey.startsWith(`audio_${msg.sessionId}`)) {
          this.pendingResponses.delete(pendingKey);
          resolve(msg);
          return;
        }
      }
    }

    if (msg.type === "final_transcript") {
      const key = `commit_${msg.sessionId}`;
      const pending = this.pendingResponses.get(key);
      if (pending) {
        this.pendingResponses.delete(key);
        pending.resolve(msg);
        return;
      }
    }

    // Log unhandled messages
    this.logger.warn("sahara.adapter.unhandled_message", { type: msg.type });
  }
}
