"use client";

import { useEffect, useState } from "react";
import { AgentStatus, type AgentStage } from "@/components/agent/agent-status";

const DEMO_STAGES: AgentStage[] = [
  "listening",
  "transcribing",
  "understanding",
  "planning",
  "asking",
  "acting",
  "verifying",
  "done",
];

/**
 * Cycles through PAL pipeline stages so visitors see honest orb motion
 * for each phase (including “PAL is asking”).
 */
export function PipelineStageShowcase() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % DEMO_STAGES.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  const stage = DEMO_STAGES[index]!;

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4">
      <AgentStatus stage={stage} size="md" showHint />
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {DEMO_STAGES.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setIndex(i)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide transition ${
              i === index
                ? s === "asking"
                  ? "bg-emerald-900/50 text-emerald-300 ring-1 ring-emerald-700/60"
                  : "bg-neutral-800 text-neutral-100 ring-1 ring-neutral-600"
                : "text-neutral-600 hover:text-neutral-400"
            }`}
            aria-current={i === index ? "true" : undefined}
          >
            {s === "asking" ? "Ask" : s}
          </button>
        ))}
      </div>
    </div>
  );
}
