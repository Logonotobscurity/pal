/**
 * Execution API Route
 * 
 * POST /api/executions/:proposalId - Execute an approved proposal
 * GET /api/executions/:proposalId - Get execution attempts for a proposal
 */

import { NextRequest, NextResponse } from "next/server";
import { createPalServerClient } from "@/lib/db/server";
import { createExecutionService } from "@/services/execution/service";
import { PolicyDbService } from "@/services/policy/db";
import { listWorkspacesForUser } from "@/lib/auth/tenancy";

type RouteContext = {
  params: Promise<{
    proposalId: string;
  }>;
};

/**
 * POST /api/executions/:proposalId
 * Execute an approved proposal
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { proposalId } = await context.params;
  
  try {
    const supabase = await createPalServerClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get workspace (placeholder: from user metadata or default)
    const workspaces = await listWorkspacesForUser();
    const workspace = workspaces[0];
    if (!workspace) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }
    const workspaceId = workspace.id;

    // Get the proposal
    const policyDb = new PolicyDbService(supabase);
    const proposal = await policyDb.getProposal(proposalId, workspaceId);

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Verify proposal is approved
    if (proposal.status !== "approved") {
      return NextResponse.json(
        { error: `Cannot execute proposal with status: ${proposal.status}` },
        { status: 400 },
      );
    }

    // Execute
    const executionService = createExecutionService(supabase, { workspaceId });
    const result = await executionService.execute(proposal);

    // Update proposal status to executed if successful
    if (result.attempt.status === "succeeded" && !result.alreadyExecuted) {
      await policyDb.updateProposalStatus(
        proposalId,
        workspaceId,
        "executed",
        proposal.version,
      );
    }

    return NextResponse.json({
      execution: result.attempt,
      alreadyExecuted: result.alreadyExecuted,
    });
  } catch (error) {
    console.error("Execution error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to execute proposal",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/executions/:proposalId
 * Get execution attempts for a proposal
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { proposalId } = await context.params;
  
  try {
    const supabase = await createPalServerClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get workspace
    const workspaceId = user.user_metadata?.workspace_id ?? "default";

    // List execution attempts
    const executionService = createExecutionService(supabase, { workspaceId });
    const attempts = await executionService["dbService"].listAttemptsByProposal(
      proposalId,
      workspaceId,
    );

    return NextResponse.json({
      executions: attempts,
    });
  } catch (error) {
    console.error("Get executions error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get executions",
      },
      { status: 500 },
    );
  }
}
