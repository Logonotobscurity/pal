/**
 * POST /api/voice/sessions — Create a new voice transcription session
 * 
 * Implements PAL_ARCHITECTURE.md §37: Voice Session API
 * Returns a sessionId for the browser to stream audio chunks to.
 * The server owns the Sahara provider connection (§35, §43: no provider credentials to browser).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/session";
import { createPalServerClient } from "@/lib/db/server";
import { getServerEnv } from "@/lib/env";
import { SaharaVoicePipeline, SaharaAudioConfig } from "@/providers/sahara";
import { SaharaWebSocketAdapter } from "@/providers/sahara-websocket-adapter";
import { VoiceDbService } from "@/services/voice/db";
import { createId } from "@/lib/utils/ids";

const CreateSessionSchema = z.object({
  workspaceId: z.string().uuid(),
  traceId: z.string().trim().min(1).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication (PAL_ARCHITECTURE.md §41)
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse and validate request
    const body = await request.json();
    const validation = CreateSessionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: validation.error.issues },
        { status: 400 },
      );
    }

    const { workspaceId, traceId } = validation.data;
    const finalTraceId = traceId ?? createId("trace");

    // 3. Verify workspace membership (PAL_ARCHITECTURE.md §41, §42)
    const supabase = await createPalServerClient();
    const { data: membership, error: membershipError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 403 },
      );
    }

    // 4. Create Sahara provider adapter (server-side only)
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

    // 5. Initialize voice pipeline
    const dbService = new VoiceDbService(supabase);
    const pipeline = new SaharaVoicePipeline({
      provider: adapter,
      logger: {
        info: (msg, meta) => console.log(`[pipeline] ${msg}`, meta),
        warn: (msg, meta) => console.warn(`[pipeline] ${msg}`, meta),
        error: (msg, meta) => console.error(`[pipeline] ${msg}`, meta),
      },
    });

    // 6. Start session with Sahara
    const session = await pipeline.startSession({
      traceId: finalTraceId,
      workspaceId,
    });

    // 7. Persist session to database
    await dbService.createSession(session);

    // 8. Return session details (PAL_ARCHITECTURE.md §37)
    return NextResponse.json({
      sessionId: session.sessionId,
      traceId: session.traceId,
      status: session.state,
      config: {
        sampleRate: SaharaAudioConfig.sampleRate,
        channels: SaharaAudioConfig.channels,
        bitDepth: SaharaAudioConfig.bitDepth,
        maxChunkBytes: SaharaAudioConfig.maxChunkBytes,
      },
    });
  } catch (error) {
    console.error("[voice] Session creation failed:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to create voice session", details: message }, { status: 500 });
  }
}
