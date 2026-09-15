/**
 * POST /api/voice/commit — Commit transcription session and persist SpeechEvent
 * 
 * Implements PAL_ARCHITECTURE.md §11, §35: finalize transcription and create
 * provider-independent SpeechEvent with full provenance.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/session";
import { createPalServerClient } from "@/lib/db/server";
import { getServerEnv } from "@/lib/env";
import { SaharaVoicePipeline } from "@/providers/sahara";
import { SaharaWebSocketAdapter } from "@/providers/sahara-websocket-adapter";
import { SaharaAudioConfig } from "@/providers/sahara";
import { VoiceDbService } from "@/services/voice/db";
import { TranscriptSegmentSchema } from "@/core/schemas/speech-event";

const CommitSessionSchema = z.object({
  sessionId: z.string().trim().min(1),
  workspaceId: z.string().uuid(),
  traceId: z.string().trim().min(1),
  transcript: z.string().trim().min(1).max(20000),
  segments: z.array(TranscriptSegmentSchema).min(1),
  language: z.string().trim().min(1).optional(),
  codeSwitch: z
    .object({
      detected: z.boolean(),
      switchCount: z.number().int().nonnegative(),
      density: z.number().min(0).max(1).optional(),
      pairs: z.array(z.string()).default([]),
    })
    .optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse and validate request
    const body = await request.json();
    const validation = CommitSessionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: validation.error.issues },
        { status: 400 },
      );
    }

    const { sessionId, workspaceId, traceId, transcript, segments, language, codeSwitch, startedAt, endedAt } =
      validation.data;

    // 3. Verify workspace membership
    const supabase = await createPalServerClient();
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // 4. Get session from database
    const dbService = new VoiceDbService(supabase);
    const session = await dbService.getSession(sessionId, workspaceId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.state === "committed") {
      return NextResponse.json({ error: "Session already committed" }, { status: 400 });
    }

    // 5. Initialize provider and pipeline
    const env = getServerEnv();
    const adapter = new SaharaWebSocketAdapter({
      endpoint: env.SAHARA_WS_ENDPOINT,
      apiSecret: env.SAHARA_API_SECRET,
      sampleRate: SaharaAudioConfig.sampleRate,
      channels: SaharaAudioConfig.channels,
      bitDepth: SaharaAudioConfig.bitDepth,
      logger: {
        info: (msg, meta) => console.log(`[voice] ${msg}`, meta),
        warn: (msg, meta) => console.warn(`[voice] ${msg}`, meta),
        error: (msg, meta) => console.error(`[voice] ${msg}`, meta),
      },
    });

    const pipeline = new SaharaVoicePipeline({
      provider: adapter,
      logger: {
        info: (msg, meta) => console.log(`[pipeline] ${msg}`, meta),
        warn: (msg, meta) => console.warn(`[pipeline] ${msg}`, meta),
        error: (msg, meta) => console.error(`[pipeline] ${msg}`, meta),
      },
    });

    // 6. Commit transcript to provider
    const speechEvent = await pipeline.commitTranscript(sessionId, {
      traceId,
      transcript,
      segments,
      language,
      codeSwitch,
      startedAt,
      endedAt,
    });

    // 7. Persist SpeechEvent to database (PAL_ARCHITECTURE.md §11)
    await dbService.createSpeechEvent(speechEvent, workspaceId);

    // 8. Update session state
    await dbService.updateSession(sessionId, {
      state: "committed",
      partialTranscript: speechEvent.transcript.text,
    });

    // 9. Return committed speech event
    return NextResponse.json({
      success: true,
      speechEvent: {
        id: speechEvent.id,
        traceId: speechEvent.traceId,
        sessionId: speechEvent.sessionId,
        provider: speechEvent.provider,
        transcript: speechEvent.transcript.text,
        segments: speechEvent.transcript.segments,
        codeSwitch: speechEvent.codeSwitch,
        timing: speechEvent.timing,
      },
    });
  } catch (error) {
    console.error("[voice] Commit failed:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to commit session", details: message }, { status: 500 });
  }
}
