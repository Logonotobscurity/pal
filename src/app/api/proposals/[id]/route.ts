/**
 * GET /api/proposals/:id — Get single proposal
 * 
 * Implements PAL_ARCHITECTURE.md §29: Approval flow
 * 
 * Query params:
 * - workspaceId (required)
 * 
 * Response:
 * {
 *   "proposal": { ... },
 *   "decisions": [ ... ]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createPalServerClient } from "@/lib/db/server";
import { PolicyDbService } from "@/services/policy/db";
import { z } from "zod";

const GetProposalQuerySchema = z.object({
  workspaceId: z.string().uuid(),
});

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  try {
    const proposalId = params.id;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = GetProposalQuerySchema.parse({
      workspaceId: searchParams.get("workspaceId"),
    });

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
      .eq("workspace_id", query.workspaceId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "Forbidden: Not a workspace member" }, { status: 403 });
    }

    // Get proposal
    const policyDb = new PolicyDbService(supabase);
    const proposal = await policyDb.getProposal(proposalId, query.workspaceId);

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Get approval decisions for this proposal
    const decisions = await policyDb.listDecisionsByProposal(proposalId, query.workspaceId);

    return NextResponse.json({ proposal, decisions }, { status: 200 });
  } catch (err) {
    console.error("[proposals/:id] Error:", err);

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
