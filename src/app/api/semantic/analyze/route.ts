/**
 * POST /api/semantic/analyze — Extract semantic meaning from SpeechEvent
 *
 * Implements PAL_ARCHITECTURE.md §19: Semantic Agent converts SpeechEvent → MeaningState
 *
 * Input: SpeechEvent ID
 * Output: MeaningState with intent, entities, constraints, temporal relations, ambiguities
 *
 * LLM: prefers OpenRouter when OPENROUTER_API_KEY is set; else direct OpenAI.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/session";
import { createPalServerClient } from "@/lib/db/server";
import { createSemanticExtractor } from "@/providers/openai-llm";
import { createSemanticAgent } from "@/services/semantic/agent";
import { VoiceDbService } from "@/services/voice/db";
import { SemanticDbService } from "@/services/semantic/db";

const AnalyzeRequestSchema = z.object({
  speechEventId: z.string().trim().min(1),
  workspaceId: z.string().uuid(),
  conversationMemory: z.array(z.string()).optional(),
  businessContext: z.string().optional(),
});

function resolveLlmConfig() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? (openRouterKey ? "openai/gpt-4o-mini" : "gpt-4o-mini");

  if (openRouterKey) {
    return {
      apiKey: openRouterKey,
      model,
      // baseURL supported once provider accepts it (PR #8); harmless if ignored today
      baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
      temperature: 0.1 as const,
    };
  }

  if (!openAiKey) {
    throw new Error("Neither OPENROUTER_API_KEY nor OPENAI_API_KEY is configured");
  }

  return {
    apiKey: openAiKey,
    model,
    temperature: 0.1 as const,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = AnalyzeRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: validation.error.issues },
        { status: 400 },
      );
    }

    const { speechEventId, workspaceId, conversationMemory, businessContext } = validation.data;

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

    const voiceDb = new VoiceDbService(supabase);
    const speechEvent = await voiceDb.getSpeechEvent(speechEventId, workspaceId);
    if (!speechEvent) {
      return NextResponse.json({ error: "Speech event not found" }, { status: 404 });
    }

    const llmConfig = resolveLlmConfig();
    const extractor = createSemanticExtractor(llmConfig);

    const agent = createSemanticAgent(
      {
        extractor,
        conversationMemory,
        businessContext,
      },
      {
        info: (msg, meta) => console.log(`[semantic] ${msg}`, meta),
        warn: (msg, meta) => console.warn(`[semantic] ${msg}`, meta),
        error: (msg, meta) => console.error(`[semantic] ${msg}`, meta),
      },
    );

    const meaningState = await agent.extractMeaning(speechEvent);

    const semanticDb = new SemanticDbService(supabase);
    await semanticDb.createMeaningState(meaningState, workspaceId);

    return NextResponse.json({
      success: true,
      meaningState: {
        id: meaningState.id,
        speechEventId: meaningState.speechEventId,
        intent: meaningState.intent,
        entities: meaningState.entities,
        constraints: meaningState.constraints,
        temporalRelations: meaningState.temporalRelations,
        ambiguities: meaningState.ambiguities,
        contextSufficiency: meaningState.contextSufficiency,
        confidence: meaningState.confidence,
        evidenceRefs: meaningState.evidenceRefs,
        model: meaningState.model,
      },
    });
  } catch (error) {
    console.error("[semantic] Analysis failed:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to analyze semantic meaning", details: message },
      { status: 500 },
    );
  }
}
