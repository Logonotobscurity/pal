/**
 * Voice ingestion database service — persists sessions and speech events
 * 
 * Implements PAL_ARCHITECTURE.md §40: workspace-scoped voice data with
 * explicit RLS enforcement through workspace membership checks.
 */

import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import type { SaharaSessionRecord } from "@/providers/sahara";
import type { SpeechEvent } from "@/core/schemas/speech-event";

type DbVoiceSession = {
  id: string;
  session_id: string;
  trace_id: string;
  workspace_id: string;
  provider: string;
  provider_version: string;
  state: string;
  last_sequence: number;
  partial_transcript: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
};

type DbSpeechEvent = {
  id: string;
  event_id: string;
  trace_id: string;
  session_id: string;
  workspace_id: string;
  provider: string;
  provider_version: string;
  transcript_text: string;
  transcript_segments: unknown;
  language_spans: unknown;
  code_switch_detected: boolean;
  code_switch_count: number;
  code_switch_density: number | null;
  code_switch_pairs: unknown;
  started_at: string;
  ended_at: string;
  provenance: unknown;
  created_at: string;
};

export class VoiceDbService {
  constructor(private readonly supabase: SupabaseClient) {}

  async createSession(session: SaharaSessionRecord): Promise<void> {
    const { error } = await this.supabase.from("voice_sessions").insert({
      session_id: session.sessionId,
      trace_id: session.traceId,
      workspace_id: session.workspaceId,
      provider: session.provider,
      provider_version: session.providerVersion,
      state: session.state,
      last_sequence: session.lastSequence,
      partial_transcript: session.partialTranscript ?? null,
      expires_at: session.expiresAt,
    });

    if (error) {
      throw new Error(`Failed to create voice session: ${error.message}`);
    }
  }

  async updateSession(sessionId: string, updates: Partial<SaharaSessionRecord>): Promise<void> {
    const dbUpdates: Partial<Omit<DbVoiceSession, "id" | "created_at">> = {};

    if (updates.state !== undefined) dbUpdates.state = updates.state;
    if (updates.lastSequence !== undefined) dbUpdates.last_sequence = updates.lastSequence;
    if (updates.partialTranscript !== undefined) dbUpdates.partial_transcript = updates.partialTranscript;
    if (updates.expiresAt !== undefined) dbUpdates.expires_at = updates.expiresAt;

    const { error } = await this.supabase
      .from("voice_sessions")
      .update(dbUpdates)
      .eq("session_id", sessionId);

    if (error) {
      throw new Error(`Failed to update voice session: ${error.message}`);
    }
  }

  async getSession(sessionId: string, workspaceId: string): Promise<SaharaSessionRecord | null> {
    const { data, error } = await this.supabase
      .from("voice_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw new Error(`Failed to get voice session: ${error.message}`);
    }

    return this.mapDbSessionToRecord(data as DbVoiceSession);
  }

  async listSessionsByWorkspace(workspaceId: string, limit = 50): Promise<SaharaSessionRecord[]> {
    const { data, error } = await this.supabase
      .from("voice_sessions")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list voice sessions: ${error.message}`);
    }

    return (data as DbVoiceSession[]).map((row) => this.mapDbSessionToRecord(row));
  }

  async createSpeechEvent(event: SpeechEvent, workspaceId: string): Promise<void> {
    const { error } = await this.supabase.from("speech_events").insert({
      event_id: event.id,
      trace_id: event.traceId,
      session_id: event.sessionId,
      workspace_id: workspaceId,
      provider: event.provider,
      provider_version: event.providerVersion,
      transcript_text: event.transcript.text,
      transcript_segments: event.transcript.segments,
      language_spans: event.languageSpans,
      code_switch_detected: event.codeSwitch.detected,
      code_switch_count: event.codeSwitch.switchCount,
      code_switch_density: event.codeSwitch.density ?? null,
      code_switch_pairs: event.codeSwitch.pairs,
      started_at: event.timing.startedAt,
      ended_at: event.timing.endedAt,
      provenance: event.provenance,
    });

    if (error) {
      throw new Error(`Failed to create speech event: ${error.message}`);
    }
  }

  async getSpeechEvent(eventId: string, workspaceId: string): Promise<SpeechEvent | null> {
    const { data, error } = await this.supabase
      .from("speech_events")
      .select("*")
      .eq("event_id", eventId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw new Error(`Failed to get speech event: ${error.message}`);
    }

    return this.mapDbEventToSpeechEvent(data as DbSpeechEvent);
  }

  async listSpeechEventsBySession(sessionId: string, workspaceId: string): Promise<SpeechEvent[]> {
    const { data, error } = await this.supabase
      .from("speech_events")
      .select("*")
      .eq("session_id", sessionId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list speech events: ${error.message}`);
    }

    return (data as DbSpeechEvent[]).map((row) => this.mapDbEventToSpeechEvent(row));
  }

  async listSpeechEventsByTrace(traceId: string, workspaceId: string): Promise<SpeechEvent[]> {
    const { data, error } = await this.supabase
      .from("speech_events")
      .select("*")
      .eq("trace_id", traceId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list speech events by trace: ${error.message}`);
    }

    return (data as DbSpeechEvent[]).map((row) => this.mapDbEventToSpeechEvent(row));
  }

  private mapDbSessionToRecord(row: DbVoiceSession): SaharaSessionRecord {
    return {
      sessionId: row.session_id,
      traceId: row.trace_id,
      workspaceId: row.workspace_id,
      provider: row.provider as "sahara",
      providerVersion: row.provider_version,
      state: row.state as "ready" | "streaming" | "committed" | "error",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      expiresAt: row.expires_at,
      lastSequence: row.last_sequence,
      partialTranscript: row.partial_transcript ?? undefined,
    };
  }

  private mapDbEventToSpeechEvent(row: DbSpeechEvent): SpeechEvent {
    return {
      id: row.event_id,
      traceId: row.trace_id,
      sessionId: row.session_id,
      provider: row.provider as "sahara" | "assemblyai" | "whisper" | "other",
      providerVersion: row.provider_version,
      transcript: {
        text: row.transcript_text,
        segments: row.transcript_segments as SpeechEvent["transcript"]["segments"],
      },
      languageSpans: (row.language_spans as SpeechEvent["languageSpans"]) ?? [],
      codeSwitch: {
        detected: row.code_switch_detected,
        switchCount: row.code_switch_count,
        density: row.code_switch_density ?? undefined,
        pairs: (row.code_switch_pairs as string[]) ?? [],
      },
      timing: {
        startedAt: row.started_at,
        endedAt: row.ended_at,
      },
      provenance: (row.provenance as SpeechEvent["provenance"]) ?? [],
      createdAt: row.created_at,
    };
  }
}
