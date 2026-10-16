/**
 * Native Executor
 *
 * Records approved message.send actions into the `outbound_messages` table.
 * This is a functioning native path that does not require an external webhook.
 *
 * Only called by the Execution Service after approval.
 */

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Capability } from "@/core/capabilities/registry";
import type { ExecutorResponse } from "./mock";

export type NativeMessageInput = {
  recipientId: string;
  message: string;
  channel?: string;
};

export async function executeMessageSendNative(
  supabase: SupabaseClient,
  workspaceId: string,
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

  const payload = validation.data as NativeMessageInput;

  const { data, error } = await supabase
    .from("outbound_messages")
    .insert({
      workspace_id: workspaceId,
      recipient_id: payload.recipientId,
      body: payload.message,
      channel: payload.channel ?? "native",
      status: "recorded",
    })
    .select("id")
    .single();

  if (error) {
    return {
      success: false,
      outputPayload: {},
      errorCode: "NATIVE_WRITE_FAILED",
      errorMessage: error.message,
    };
  }

  return {
    success: true,
    externalReference: data.id as string,
    outputPayload: {
      messageId: data.id,
      status: "sent",
      sentAt: new Date().toISOString(),
      channel: payload.channel ?? "native",
    },
  };
}
