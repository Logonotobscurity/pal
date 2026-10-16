/**
 * POST /api/demo/pipeline
 *
 * Lightweight public endpoint for the /command demo.
 * Accepts plain text and runs the semantic + workflow agents (no auth required for demo).
 * Uses llmConfigFromEnv() so it picks up XAI_API_KEY (Grok), GROQ_API_KEY, OpenRouter, or OpenAI.
 *
 * Does not execute side effects. Execution still requires a signed-in approval flow.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSemanticExtractor, llmConfigFromEnv } from "@/providers/openai-llm";
import { createSemanticAgent } from "@/services/semantic/agent";
import { createWorkflowAgent } from "@/services/workflow/agent";
import { createWorkflowGenerator } from "@/providers/openai-workflow";

const DemoRequestSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

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
    const llmConfig = llmConfigFromEnv();

    if (!llmConfig) {
      return NextResponse.json({
        success: true,
        source: "fallback",
        proposal: {
          title: "Demo proposal (no LLM configured)",
          payload: text,
          mix: "demo",
          why: "Set XAI_API_KEY (Grok), GROQ_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY for the live path.",
          actionType: "message.send",
        },
      });
    }

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
      provider: llmConfig.provider,
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
