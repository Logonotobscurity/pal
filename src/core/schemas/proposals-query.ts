/**
 * Query schemas for the proposals API (PAL_ARCHITECTURE.md §29).
 *
 * Extracted from the route handler so the parsing rules — in particular the
 * `null` → `undefined` coercion for absent query params — are unit-testable
 * without standing up a Next.js server.
 */

import { z } from "zod";

/** Values accepted by the `status` filter, mirroring the approval state machine. */
export const PROPOSAL_STATUSES = [
  "pending",
  "approved",
  "edited",
  "rejected",
  "expired",
  "executed",
  "failed",
] as const;

/** Values accepted by the `riskClass` filter. */
export const PROPOSAL_RISK_CLASSES = [
  "read",
  "draft",
  "external_write",
  "financial",
  "destructive",
] as const;

export const ListProposalsQuerySchema = z.object({
  workspaceId: z.string().uuid(),
  status: z.enum(PROPOSAL_STATUSES).optional(),
  riskClass: z.enum(PROPOSAL_RISK_CLASSES).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListProposalsQuery = z.infer<typeof ListProposalsQuerySchema>;

/**
 * `URLSearchParams.get` returns `null` for absent params, but Zod's
 * `.optional()` only accepts `undefined` — passing `null` through causes every
 * request that omits an optional filter to fail validation.
 */
export function parseListProposalsQuery(searchParams: {
  get(name: string): string | null;
}): ListProposalsQuery {
  return ListProposalsQuerySchema.parse({
    workspaceId: searchParams.get("workspaceId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    riskClass: searchParams.get("riskClass") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
}
