/**
 * Real Messaging Executor
 *
 * Calls a configured webhook for message.send when MESSAGING_WEBHOOK_URL is set.
 * Falls back to a clear error if the webhook is not configured, so the path is
 * real and functioning when credentials exist, and fails closed otherwise.
 *
 * PAL safety invariant: only the Execution Service calls this after approval.
 */

import "server-only";
import type { Capability } from "@/core/capabilities/registry";
import type { ExecutorResponse } from "./mock";

const WEBHOOK_TIMEOUT_MS = 15_000;

export type MessagingSendInput = {
  recipientId: string;
  message: string;
  channel?: "sms" | "email" | "whatsapp";
};

/**
 * Execute message.send via configured webhook.
 *
 * Expected webhook contract (POST JSON):
 *   { recipientId, message, channel?, proposalId?, executionId? }
 * Expected response (JSON):
 *   { messageId?: string, status?: "sent" | "failed", externalReference?: string }
 */
export async function executeMessageSendReal(
  capability: Capability,
  input: unknown,
): Promise<ExecutorResponse> {
  const validation = capability.inputSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      outputPayload: {},
      errorCode: "VALIDATION_ERROR",
      errorMessage: validation.error.message,
    };
  }

  const payload = validation.data as MessagingSendInput;
  const webhookUrl = process.env.MESSAGING_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      success: false,
      outputPayload: {},
      errorCode: "EXECUTOR_NOT_CONFIGURED",
      errorMessage:
        "MESSAGING_WEBHOOK_URL is not set. Configure a real messaging endpoint to enable message.send.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.MESSAGING_WEBHOOK_SECRET
          ? { authorization: `Bearer ${process.env.MESSAGING_WEBHOOK_SECRET}` }
          : {}),
      },
      body: JSON.stringify({
        capability: capability.name,
        ...payload,
        sentAt: new Date().toISOString(),
      }),
      signal: controller.signal,
    });

    const text = await res.text();
    let body: Record<string, unknown> = {};
    try {
      body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      body = { raw: text };
    }

    if (!res.ok) {
      return {
        success: false,
        outputPayload: body,
        errorCode: "WEBHOOK_ERROR",
        errorMessage: `Messaging webhook returned ${res.status}`,
      };
    }

    const messageId =
      typeof body.messageId === "string" ? body.messageId : `msg_${Date.now()}`;
    const externalReference =
      typeof body.externalReference === "string" ? body.externalReference : messageId;

    return {
      success: true,
      externalReference,
      outputPayload: {
        messageId,
        status: body.status === "failed" ? "failed" : "sent",
        sentAt: new Date().toISOString(),
        ...body,
      },
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown messaging error");
    const isAbort = error.name === "AbortError";
    return {
      success: false,
      outputPayload: {},
      errorCode: isAbort ? "WEBHOOK_TIMEOUT" : "WEBHOOK_EXCEPTION",
      errorMessage: error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}
