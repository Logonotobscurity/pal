/**
 * Executor Router
 *
 * Selects the real executor when configured, otherwise falls back to mock.
 */

import "server-only";
import type { Capability } from "@/core/capabilities/registry";
import { executeMockCapability, type ExecutorResponse } from "./mock";
import { executeMessageSendReal } from "./messaging";
import { executeEmailSend } from "./email";

export type { ExecutorResponse };

export async function executeCapability(
  capability: Capability,
  input: unknown,
): Promise<ExecutorResponse> {
  if (capability.name === "message.send") {
    const channel =
      input && typeof input === "object" && "channel" in input
        ? (input as { channel?: string }).channel
        : undefined;

    if (channel === "email" && process.env.EMAIL_WEBHOOK_URL) {
      return executeEmailSend(capability, input);
    }

    if (process.env.MESSAGING_WEBHOOK_URL) {
      return executeMessageSendReal(capability, input);
    }
  }

  return executeMockCapability(capability, input);
}
