/**
 * POST /api/workflow/generate — Generate ActionPlan from MeaningState
 * 
 * Implements PAL_ARCHITECTURE.md §20: Workflow Agent endpoint
 * 
 * Request:
 * {
 *   "meaningStateId": "meaning_abc123",
 *   "workspaceId": "uuid"
 * }
 * 
 * Response:
 * {
 *   "actionPlan": { ... },
 *   "validationWarnings": [ ... ]
 * }
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

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const input = GenerateWorkflowRequestSchema.parse(body);

    // Create authenticated Supabase client
    const supabase = await createPalServerClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify workspace membership
    const { data: membership, error: membershipError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", input.workspaceId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "Forbidden: Not a workspace member" }, { status: 403 });
    }

    // Retrieve meaning state
    const semanticDb = new SemanticDbService(supabase);
    const meaningState = await semanticDb.getMeaningState(input.meaningStateId, input.workspaceId);

    if (!meaningState) {
      return NextResponse.json({ error: "Meaning state not found" }, { status: 404 });
    }

    // Check for OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "Server configuration error: OpenAI API key not configured" },
        { status: 500 },
      );
    }

    // Create workflow generator
    const generator = createWorkflowGenerator({
      apiKey: openaiApiKey,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      maxTokens: 3000,
    });

    // Create workflow agent
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

    // Generate action plan
    const actionPlan = await agent.generatePlan(meaningState);

    // Persist action plan
    const workflowDb = new WorkflowDbService(supabase);
    await workflowDb.createActionPlan(actionPlan, input.workspaceId);

    // Return action plan
    return NextResponse.json(
      {
        actionPlan,
        validationWarnings: [], // Could be populated from validation result if needed
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
      // Check if it's a validation error
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
