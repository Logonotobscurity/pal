/**
 * GET /api/proposals — List action proposals
 * 
 * Implements PAL_ARCHITECTURE.md §29: Approval flow
 * 
 * Query params:
 * - workspaceId (required)
 * - status (optional): pending, approved, rejected, executed, failed
 * - riskClass (optional): read, draft, external_write, financial, destructive
 * - limit (optional): max results
 * 
 * Response:
 * {
 *   "proposals": [ ... ]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createPalServerClient } from "@/lib/db/server";
import { PolicyDbService } from "@/services/policy/db";
import { z } from "zod";

const ListProposalsQuerySchema = z.object({
  workspaceId: z.string().uuid(),
  status: z.enum(["pending", "approved", "edited", "rejected", "expired", "executed", "failed"]).optional(),
  riskClass: z.enum(["read", "draft", "external_write", "financial", "destructive"]).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = ListProposalsQuerySchema.parse({
      workspaceId: searchParams.get("workspaceId"),
      status: searchParams.get("status"),
      riskClass: searchParams.get("riskClass"),
      limit: searchParams.get("limit"),
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

    // List proposals
    const policyDb = new PolicyDbService(supabase);
    const proposals = await policyDb.listProposalsByWorkspace(query.workspaceId, {
      status: query.status,
      riskClass: query.riskClass,
      limit: query.limit,
    });

    return NextResponse.json({ proposals }, { status: 200 });
  } catch (err) {
    console.error("[proposals] Error:", err);

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
