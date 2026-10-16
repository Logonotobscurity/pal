"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Props = {
  workspaceId: string;
  sessionId: string;
};

/**
 * Subscribes to the realtime transcript channel and displays partial/final text.
 * Used by the command or voice UI once a session exists.
 */
export function TranscriptListener({ workspaceId, sessionId }: Props) {
  const [partial, setPartial] = useState("");
  const [finalText, setFinalText] = useState("");

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const channelName = `transcripts:${workspaceId}:${sessionId}`;
    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "partial" }, ({ payload }) => {
        if (payload?.text) setPartial(payload.text as string);
      })
      .on("broadcast", { event: "final" }, ({ payload }) => {
        if (payload?.text) {
          setFinalText(payload.text as string);
          setPartial("");
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, sessionId]);

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 text-sm">
      {finalText ? (
        <p className="text-neutral-100">{finalText}</p>
      ) : partial ? (
        <p className="text-neutral-400 italic">{partial}</p>
      ) : (
        <p className="text-neutral-600">Waiting for transcript…</p>
      )}
    </div>
  );
}
