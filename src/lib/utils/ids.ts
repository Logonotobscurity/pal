import { randomUUID } from "node:crypto";

/**
 * Prefixed identifiers for end-to-end traceability (PAL_ARCHITECTURE.md §39).
 *
 * Every request gets a traceId, every voice interaction a sessionId,
 * every workflow a runId, every proposal a proposalId, and every
 * execution an executionId. Prefixes keep IDs recognizable in logs,
 * database rows, and audit events.
 */
export type TraceableIdPrefix =
  | "trace"
  | "sess"
  | "run"
  | "proposal"
  | "execution"
  | "speech"
  | "meaning"
  | "plan"
  | "exec"
  | "decision"
  | "verify";

export function createId(prefix: TraceableIdPrefix): string {
  return `${prefix}_${randomUUID()}`;
}

export function isTraceableId(value: string, prefix: TraceableIdPrefix): boolean {
  return value.startsWith(`${prefix}_`) && value.length === prefix.length + 1 + 36;
}
