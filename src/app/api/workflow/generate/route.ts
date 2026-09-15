/**
 * POST /api/workflow/generate — Generate ActionPlan from MeaningState
 *
 * Implements PAL_ARCHITECTURE.md §20: Workflow Agent endpoint
 *
 * LLM: prefers OpenRouter when OPENROUTER_API_KEY is set; else direct OpenAI.
 */

import { NextRequest, NextResponse } from "next/server";
import { createPalServerClient } from "@/lib/db/server";
import { SemanticDbService } from "@/services/semantic/db";
import { WorkflowDbService } from "@/services/workflow/db";
import { createWorkflowAgent } from "@/services/workflow/agent";
import { createWorkflowGenerator } from "@/providers/openai-workflow";
import { z } from "zod";

const GenerateWorkflowRequestSchema = z.object({
  meaningStateId: z.string().trim().min(1),
  workspaceId: z.string().uuid(),
  businessContext: z.string().optional(),
});

function resolveWorkflowLlmConfig() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? (openRouterKey ? "openai/gpt-4o-mini" : "gpt-4o-mini");

  if (openRouterKey) {
    return {
      apiKey: openRouterKey,
      model,
      baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
      temperature: 0.2 as const,
      maxTokens: 3000 as const,
    };
  }

  if (!openAiKey) {
    throw new Error("Neither OPENROUTER_API_KEY nor OPENAI_API_KEY is configured");
  }

  return {
    apiKey: openAiKey,
    model,
    temperature: 0.2 as const,
    maxTokens: 3000 as const,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = GenerateWorkflowRequestSchema.parse(body);

    const supabase = await createPalServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", input.workspaceId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "Forbidden: Not a workspace member" }, { status: 403 });
    }

    const semanticDb = new SemanticDbService(supabase);
    const meaningState = await semanticDb.getMeaningState(input.meaningStateId, input.workspaceId);

    if (!meaningState) {
      return NextResponse.json({ error: "Meaning state not found" }, { status: 404 });
    }

    const llmConfig = resolveWorkflowLlmConfig();
    const generator = createWorkflowGenerator(llmConfig);

    const agent = createWorkflowAgent(
      {
        generator,
        businessContext: input.businessContext,
      },
      {
        info: (message, meta) => console.log(`[INFO] ${message}`, meta),
        warn: (message, meta) => console.warn(`[WARN] ${message}`, meta),
        error: (message, meta) => console.error(`[ERROR] ${message}`, meta),
      },
    );

    const actionPlan = await agent.generatePlan(meaningState);

    const workflowDb = new WorkflowDbService(supabase);
    await workflowDb.createActionPlan(actionPlan, input.workspaceId);

    return NextResponse.json(
      {
        actionPlan,
        validationWarnings: [],
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[workflow/generate] Error:", err);

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: err.issues,
        },
        { status: 400 },
      );
    }

    if (err instanceof Error) {
      if (err.message.includes("validation failed")) {
        return NextResponse.json(
          {
            error: "Workflow validation failed",
            details: err.message,
          },
          { status: 422 },
        );
      }

      return NextResponse.json(
        {
          error: "Internal server error",
          details: err.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
