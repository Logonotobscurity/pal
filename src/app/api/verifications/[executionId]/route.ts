/**
 * Verification API Route
 * 
 * POST /api/verifications/:executionId - Verify an execution attempt
 * GET /api/verifications/:executionId - Get verification results for an execution
 */

import { NextRequest, NextResponse } from "next/server";
import { createPalServerClient } from "@/lib/db/server";
import { createVerificationAgent } from "@/services/verification/agent";
import { ExecutionDatabaseService } from "@/services/execution/db";

type RouteContext = {
  params: Promise<{
    executionId: string;
  }>;
};

/**
 * POST /api/verifications/:executionId
 * Verify an execution attempt
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { executionId } = await context.params;
  
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

    // Get the execution attempt
    const executionDb = new ExecutionDatabaseService(supabase);
    const execution = await executionDb.getAttemptById(executionId, workspaceId);

    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });
    }

    // Verify
    const verificationAgent = createVerificationAgent(supabase, { workspaceId });
    const verification = await verificationAgent.verify(execution);

    return NextResponse.json({
      verification,
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to verify execution",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/verifications/:executionId
 * Get verification results for an execution
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { executionId } = await context.params;
  
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

    // List verification results
    const verificationAgent = createVerificationAgent(supabase, { workspaceId });
    const verifications = await verificationAgent.getVerificationsByExecution(executionId);

    return NextResponse.json({
      verifications,
    });
  } catch (error) {
    console.error("Get verifications error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get verifications",
      },
      { status: 500 },
    );
  }
}
