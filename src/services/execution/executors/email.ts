/**
 * Email Executor
 *
 * Real path for sending email when EMAIL_WEBHOOK_URL is set.
 * Mirrors the messaging webhook contract so providers can be swapped.
 *
 * Only called by the Execution Service after approval.
 */

import "server-only";
import type { Capability } from "@/core/capabilities/registry";
import type { ExecutorResponse } from "./mock";

const WEBHOOK_TIMEOUT_MS = 15_000;

export type EmailSendInput = {
  recipientId: string;
  message: string;
  subject?: string;
};

export async function executeEmailSendReal(
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

  const payload = validation.data as EmailSendInput & { channel?: string };
  const webhookUrl = process.env.EMAIL_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      success: false,
      outputPayload: {},
      errorCode: "EXECUTOR_NOT_CONFIGURED",
      errorMessage:
        "EMAIL_WEBHOOK_URL is not set. Configure an email endpoint to enable email delivery.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.EMAIL_WEBHOOK_SECRET
          ? { authorization: `Bearer ${process.env.EMAIL_WEBHOOK_SECRET}` }
          : {}),
      },
      body: JSON.stringify({
        capability: capability.name,
        channel: "email",
        recipientId: payload.recipientId,
        message: payload.message,
        subject: payload.subject ?? "PAL message",
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
        errorMessage: `Email webhook returned ${res.status}`,
      };
    }

    const messageId =
      typeof body.messageId === "string" ? body.messageId : `email_${Date.now()}`;

    return {
      success: true,
      externalReference:
        typeof body.externalReference === "string" ? body.externalReference : messageId,
      outputPayload: {
        messageId,
        status: body.status === "failed" ? "failed" : "sent",
        sentAt: new Date().toISOString(),
        channel: "email",
        ...body,
      },
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown email error");
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
