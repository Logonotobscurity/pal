/**
 * POST /api/command/run
 *
 * Authenticated realistic path for /command.
 *
 * Flow:
 * 1. Auth + workspace membership
 * 2. Semantic extraction via llmConfigFromEnv (Grok / Groq / OpenRouter / OpenAI)
 * 3. Workflow generation
 * 4. Persist a real ActionProposal (pending)
 * 5. Return the proposal so the UI can ask for approval
 *
 * Execution still only happens after an explicit approve call.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/session";
import { createPalServerClient } from "@/lib/db/server";
import { llmConfigFromEnv, createSemanticExtractor } from "@/providers/openai-llm";
import { createSemanticAgent } from "@/services/semantic/agent";
import { createWorkflowAgent } from "@/services/workflow/agent";
import { createWorkflowGenerator } from "@/providers/openai-workflow";
import { PolicyDbService } from "@/services/policy/db";
import { createId } from "@/lib/utils/ids";
import type { ActionProposal } from "@/core/schemas/action-proposal";

const RunRequestSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  workspaceId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = RunRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: validation.error.issues },
        { status: 400 },
      );
    }

    const { text, workspaceId } = validation.data;

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

    const llmConfig = llmConfigFromEnv();
    if (!llmConfig) {
      return NextResponse.json(
        { error: "No LLM key configured (XAI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY)" },
        { status: 503 },
      );
    }

    // Synthetic SpeechEvent for the semantic agent (real voice path can replace this later)
    const speechEvent = {
      id: createId("speech"),
      workspaceId,
      transcript: text,
      language: "mixed",
      confidence: 0.9,
      segments: [],
      createdAt: new Date().toISOString(),
    };

    const extractor = createSemanticExtractor(llmConfig);
    const semanticAgent = createSemanticAgent(
      { extractor },
      {
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    );

    const meaningState = await semanticAgent.extractMeaning(speechEvent as never);

    const workflowGenerator = createWorkflowGenerator(llmConfig);
    const workflowAgent = createWorkflowAgent(
      { generator: workflowGenerator },
      {
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    );

    const actionPlan = await workflowAgent.generatePlan(meaningState as never);
    const firstAction = actionPlan?.actions?.[0];

    const proposalId = createId("prop");
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const proposal: ActionProposal = {
      id: proposalId,
      workspaceId,
      actionPlanId: actionPlan?.id ?? createId("plan"),
      actionType: firstAction?.type ?? "message.send",
      exactPayload: firstAction?.payload ?? { text, recipientId: "unknown" },
      destination: undefined,
      recipient: undefined,
      scheduledFor: undefined,
      riskClass: "external_write",
      evidenceRefs: [],
      status: "pending",
      policyDecision: {
        allowed: true,
        reason: "Created from authenticated command path",
        decidedAt: now,
      },
      version: 1,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    const policyDb = new PolicyDbService(supabase);
    await policyDb.createProposal(proposal, workspaceId);

    return NextResponse.json({
      success: true,
      provider: llmConfig.provider,
      proposal: {
        id: proposal.id,
        title: firstAction?.description ?? meaningState.intent ?? "Proposed action",
        payload: JSON.stringify(proposal.exactPayload, null, 2),
        mix: meaningState.intent ?? "unknown",
        why: meaningState.ambiguities?.length
          ? `Ambiguities: ${meaningState.ambiguities.join(", ")}`
          : "Semantic analysis complete",
        actionType: proposal.actionType,
        version: proposal.version,
        status: proposal.status,
      },
    });
  } catch (error) {
    console.error("[command/run] failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to run command", details: message }, { status: 500 });
  }
}
