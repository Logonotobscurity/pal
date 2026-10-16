/**
 * POST /api/demo/pipeline
 *
 * Lightweight public endpoint for the /command demo.
 * Accepts plain text and runs the semantic + workflow agents (no auth required for demo).
 * Returns a proposal-shaped object so the UI can show the real ASK stage.
 *
 * Does not execute side effects. Execution still requires a signed-in approval flow.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSemanticExtractor } from "@/providers/openai-llm";
import { createSemanticAgent } from "@/services/semantic/agent";
import { createWorkflowAgent } from "@/services/workflow/agent";
import { createWorkflowGenerator } from "@/providers/openai-workflow";

const DemoRequestSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

function resolveLlmConfig() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? (openRouterKey ? "openai/gpt-4o-mini" : "gpt-4o-mini");

  if (openRouterKey) {
    return {
      apiKey: openRouterKey,
      model,
      baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
      temperature: 0.1 as const,
    };
  }

  if (!openAiKey) {
    return null;
  }

  return {
    apiKey: openAiKey,
    model,
    temperature: 0.1 as const,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = DemoRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: validation.error.issues },
        { status: 400 },
      );
    }

    const { text } = validation.data;
    const llmConfig = resolveLlmConfig();

    if (!llmConfig) {
      // Fallback so the public demo still works without keys
      return NextResponse.json({
        success: true,
        source: "fallback",
        proposal: {
          title: "Demo proposal (no LLM configured)",
          payload: text,
          mix: "demo",
          why: "Set OPENAI_API_KEY or OPENROUTER_API_KEY for the live semantic path.",
          actionType: "message.send",
        },
      });
    }

    // Minimal synthetic SpeechEvent for the semantic agent
    const speechEvent = {
      id: `demo_${Date.now()}`,
      workspaceId: "demo",
      transcript: text,
      language: "mixed",
      confidence: 0.9,
      segments: [],
      createdAt: new Date().toISOString(),
    };

    const extractor = createSemanticExtractor(llmConfig);
    const semanticAgent = createSemanticAgent({ extractor }, {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    });

    const meaningState = await semanticAgent.extractMeaning(speechEvent as never);

    const workflowGenerator = createWorkflowGenerator(llmConfig);
    const workflowAgent = createWorkflowAgent({ generator: workflowGenerator }, {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    });

    const actionPlan = await workflowAgent.generatePlan(meaningState as never);

    const firstAction = actionPlan?.actions?.[0];

    return NextResponse.json({
      success: true,
      source: "live",
      proposal: {
        title: firstAction?.description ?? meaningState.intent ?? "Proposed action",
        payload: JSON.stringify(firstAction?.payload ?? { text }, null, 2),
        mix: meaningState.intent ?? "unknown",
        why: meaningState.ambiguities?.length
          ? `Ambiguities: ${meaningState.ambiguities.join(", ")}`
          : "Semantic analysis complete",
        actionType: firstAction?.type ?? "message.send",
        meaningStateId: meaningState.id,
      },
    });
  } catch (error) {
    console.error("[demo/pipeline] failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: true,
        source: "error-fallback",
        proposal: {
          title: "Could not reach live pipeline",
          payload: "",
          mix: "error",
          why: message,
          actionType: "message.send",
        },
      },
      { status: 200 },
    );
  }
}
