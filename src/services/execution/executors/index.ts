/**
 * Executor Router
 *
 * Selects the real executor when configured, otherwise falls back to mock.
 * Keeps the Execution Service as the single place that performs side effects.
 */

import "server-only";
import type { Capability } from "@/core/capabilities/registry";
import { executeMockCapability, type ExecutorResponse } from "./mock";
import { executeMessageSendReal } from "./messaging";

export type { ExecutorResponse };

/**
 * Route a capability to the appropriate executor.
 *
 * - message.send → real webhook when MESSAGING_WEBHOOK_URL is set
 * - everything else → mock (until real providers are added)
 */
export async function executeCapability(
  capability: Capability,
  input: unknown,
): Promise<ExecutorResponse> {
  if (capability.name === "message.send" && process.env.MESSAGING_WEBHOOK_URL) {
    return executeMessageSendReal(capability, input);
  }

  return executeMockCapability(capability, input);
}
