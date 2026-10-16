/**
 * Realtime transcript broadcast
 *
 * Publishes partial and final transcripts to a Supabase Realtime channel
 * so the client can subscribe without polling.
 *
 * Channel name: `transcripts:${workspaceId}:${sessionId}`
 * Events: `partial` | `final`
 */

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TranscriptEvent =
  | {
      type: "partial";
      sessionId: string;
      workspaceId: string;
      text: string;
      sequence?: number;
    }
  | {
      type: "final";
      sessionId: string;
      workspaceId: string;
      eventId: string;
      text: string;
    };

export async function broadcastTranscript(
  supabase: SupabaseClient,
  event: TranscriptEvent,
): Promise<void> {
  const channelName = `transcripts:${event.workspaceId}:${event.sessionId}`;

  const channel = supabase.channel(channelName);

  await channel.send({
    type: "broadcast",
    event: event.type,
    payload: event,
  });

  // Leave the channel after send so we don't accumulate server-side subscriptions.
  supabase.removeChannel(channel);
}
