/**
 * Regression test for `GET /api/proposals` query parsing.
 *
 * `URLSearchParams.get` returns `null` for absent params. Zod's `.optional()`
 * accepts `undefined` but rejects `null`, so passing the raw values caused
 * every request that omitted an optional filter to fail with a 400 — making
 * the endpoint unusable. See `src/core/schemas/proposals-query.ts`.
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ListProposalsQuerySchema,
  parseListProposalsQuery,
} from "@/core/schemas/proposals-query";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";

/** Minimal stand-in for `URLSearchParams` backed by a plain object. */
function params(entries: Record<string, string>): URLSearchParams {
  return new URLSearchParams(entries);
}

describe("proposals query parsing", () => {
  it("accepts a request that omits every optional filter", () => {
    const query = parseListProposalsQuery(params({ workspaceId: WORKSPACE_ID }));

    expect(query).toEqual({
      workspaceId: WORKSPACE_ID,
      status: undefined,
      riskClass: undefined,
      limit: undefined,
    });
  });

  it("accepts an explicitly supplied status and riskClass", () => {
    const query = parseListProposalsQuery(
      params({ workspaceId: WORKSPACE_ID, status: "pending", riskClass: "financial" }),
    );

    expect(query.status).toBe("pending");
    expect(query.riskClass).toBe("financial");
  });

  it("coerces limit from string to number", () => {
    const query = parseListProposalsQuery(params({ workspaceId: WORKSPACE_ID, limit: "25" }));

    expect(query.limit).toBe(25);
  });

  it("rejects an unknown status value", () => {
    expect(() =>
      parseListProposalsQuery(params({ workspaceId: WORKSPACE_ID, status: "nope" })),
    ).toThrow(z.ZodError);
  });

  it("rejects a non-uuid workspaceId", () => {
    expect(() => parseListProposalsQuery(params({ workspaceId: "ws-demo" }))).toThrow(z.ZodError);
  });

  it("rejects a non-positive limit", () => {
    expect(() =>
      parseListProposalsQuery(params({ workspaceId: WORKSPACE_ID, limit: "0" })),
    ).toThrow(z.ZodError);
  });

  // Guards the invariant directly: raw `null` must not reach the schema, since
  // `.optional()` does not tolerate it.
  it("schema rejects null for optional fields (documents why we coerce)", () => {
    const result = ListProposalsQuerySchema.safeParse({
      workspaceId: WORKSPACE_ID,
      status: null,
    });

    expect(result.success).toBe(false);
  });
});
