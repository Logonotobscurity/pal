/**
 * Executor Router
 *
 * Selects the best available executor for a capability.
 *
 * For message.send:
 * - channel=email + EMAIL_WEBHOOK_URL → email webhook
 * - MESSAGING_WEBHOOK_URL → messaging webhook
 * - otherwise → native Supabase outbound_messages (functioning, no external webhook)
 *
 * Everything else falls back to mock.
 */

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Capability } from "@/core/capabilities/registry";
import { executeMockCapability, type ExecutorResponse } from "./mock";
import { executeMessageSendNative } from "./native";

export type { ExecutorResponse };

export type ExecuteOptions = {
  supabase: SupabaseClient;
  workspaceId: string;
};

export async function executeCapability(
  capability: Capability,
  input: unknown,
  options: ExecuteOptions,
): Promise<ExecutorResponse> {
  if (capability.name === "message.send") {
    const channel =
      input && typeof input === "object" && "channel" in input
        ? (input as { channel?: string }).channel
        : undefined;

    // Prefer configured webhooks when present
    if (channel === "email" && process.env.EMAIL_WEBHOOK_URL) {
      // email executor lives on another branch; fall through to native for now
    } else if (process.env.MESSAGING_WEBHOOK_URL) {
      // messaging webhook lives on another branch; fall through to native for now
    }

    // Functioning native path — no external credentials required
    return executeMessageSendNative(options.supabase, options.workspaceId, capability, input);
  }

  return executeMockCapability(capability, input);
}
