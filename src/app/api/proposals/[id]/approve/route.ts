/**
 * POST /api/proposals/:id/approve — Approve a proposal
 * 
 * Implements PAL_ARCHITECTURE.md §29: Approval flow with version-aware stale detection
 * 
 * Request:
 * {
 *   "workspaceId": "uuid",
 *   "version": 1,
 *   "reason": "Approval reason"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "proposal": { ... }
 * }
 * 
 * Error (409 if stale):
 * {
 *   "error": "Stale approval",
 *   "currentVersion": 2
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createPalServerClient } from "@/lib/db/server";
import { PolicyDbService } from "@/services/policy/db";
import { z } from "zod";

const ApproveProposalRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  version: z.number().int().positive(),
  reason: z.string().trim().min(1).max(500),
});

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  try {
    const proposalId = params.id;

    // Parse and validate request body
    const body = await request.json();
    const input = ApproveProposalRequestSchema.parse(body);

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

    // Get proposal
    const policyDb = new PolicyDbService(supabase);
    const proposal = await policyDb.getProposal(proposalId, input.workspaceId);

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Check if proposal can be approved
    if (proposal.status !== "pending") {
      return NextResponse.json(
        {
          error: "Proposal cannot be approved",
          details: `Proposal status is ${proposal.status}`,
        },
        { status: 400 },
      );
    }

    // Check if proposal has expired
    if (proposal.expiresAt && new Date(proposal.expiresAt) < new Date()) {
      // Mark as expired
      await policyDb.updateProposalStatus(proposalId, input.workspaceId, "expired", input.version);

      return NextResponse.json(
        {
          error: "Proposal has expired",
          expiresAt: proposal.expiresAt,
        },
        { status: 400 },
      );
    }

    // Update proposal status with optimistic locking
    const updateResult = await policyDb.updateProposalStatus(
      proposalId,
      input.workspaceId,
      "approved",
      input.version,
    );

    if (!updateResult.success) {
      // Version mismatch - stale approval
      return NextResponse.json(
        {
          error: "Stale approval: proposal has been modified",
          currentVersion: updateResult.currentVersion,
        },
        { status: 409 },
      );
    }

    // Record approval decision
    await policyDb.createApprovalDecision(
      {
        proposalId,
        decision: "approved",
        actorId: user.id,
        reason: input.reason,
        decidedAt: new Date().toISOString(),
      },
      input.workspaceId,
      input.version,
    );

    // Get updated proposal
    const updatedProposal = await policyDb.getProposal(proposalId, input.workspaceId);

    return NextResponse.json(
      {
        success: true,
        proposal: updatedProposal,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[proposals/:id/approve] Error:", err);

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
