import { NextResponse } from "next/server";
import { palError, statusForCode } from "@/core/errors";
import { createId } from "@/lib/utils/ids";
import { getUser } from "@/lib/auth/session";
import { listWorkspacesForUser } from "@/lib/auth/tenancy";
import { EnvConfigError } from "@/lib/env";

/**
 * GET /api/me
 *
 * Authenticated identity + workspaces. Serves as the tenancy smoke
 * endpoint: workspaces come back only if RLS membership policies work.
 */
export async function GET() {
  const traceId = createId("trace");

  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        palError("AUTH_REQUIRED", "Sign in to access this resource.", traceId),
        { status: statusForCode("AUTH_REQUIRED") },
      );
    }

    const workspaces = await listWorkspacesForUser();

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      workspaces,
      traceId,
    });
  } catch (err) {
    if (err instanceof EnvConfigError) {
      return NextResponse.json(
        palError("ENV_NOT_CONFIGURED", err.message, traceId, {
          details: { missing: err.missing },
        }),
        { status: statusForCode("ENV_NOT_CONFIGURED") },
      );
    }
    throw err;
  }
}
