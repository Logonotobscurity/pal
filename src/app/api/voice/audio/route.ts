/**
 * POST /api/voice/audio — Send audio chunk to active session
 * 
 * Implements PAL_ARCHITECTURE.md §35: PCM16 audio streaming through server-side proxy.
 * Browser sends PCM16 chunks; server forwards to Sahara provider.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/session";
import { createPalServerClient } from "@/lib/db/server";
import { getServerEnv } from "@/lib/env";
import { SaharaVoicePipeline, createPcm16AudioChunk, SaharaAudioConfig } from "@/providers/sahara";
import { SaharaWebSocketAdapter } from "@/providers/sahara-websocket-adapter";
import { VoiceDbService } from "@/services/voice/db";

const AudioChunkSchema = z.object({
  sessionId: z.string().trim().min(1),
  workspaceId: z.string().uuid(),
  sequence: z.number().int().nonnegative(),
  audioData: z.string(), // base64-encoded PCM16 samples
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
    const validation = AudioChunkSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: validation.error.issues },
        { status: 400 },
      );
    }

    const { sessionId, workspaceId, sequence, audioData } = validation.data;

    // 3. Verify workspace membership and session ownership
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

    // 5. Decode base64 audio data to Int16Array
    const buffer = Buffer.from(audioData, "base64");
    const int16Array = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);

    // 6. Create audio chunk
    const chunk = createPcm16AudioChunk({
      sessionId,
      sequence,
      samples: int16Array,
      sampleRate: SaharaAudioConfig.sampleRate,
      channels: SaharaAudioConfig.channels,
      bitDepth: SaharaAudioConfig.bitDepth,
    });

    // 7. Initialize provider and pipeline
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

    // 8. Send audio chunk to Sahara
    const response = await pipeline.sendAudioChunk(sessionId, chunk);

    // 9. Update session state in database
    await dbService.updateSession(sessionId, {
      state: "streaming",
      lastSequence: sequence,
    });

    // 10. Handle partial transcripts
    if (response.type === "partial_transcript") {
      await dbService.updateSession(sessionId, {
        partialTranscript: response.transcript,
      });

      return NextResponse.json({
        accepted: true,
        type: "partial_transcript",
        transcript: response.transcript,
        segments: response.segments ?? [],
      });
    }

    // 11. Return acknowledgement
    return NextResponse.json({
      accepted: response.type === "audio_ack" ? response.accepted : true,
      sequence,
      message: response.type === "audio_ack" ? response.message : undefined,
    });
  } catch (error) {
    console.error("[voice] Audio chunk processing failed:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to process audio chunk", details: message }, { status: 500 });
  }
}
