"use client";

import { useEffect, useRef, useState } from "react";
import { AgentStatus, type AgentStage } from "@/components/agent/agent-status";
import { interpret, type Interpreted } from "@/lib/interpret";

const PIPELINE: AgentStage[] = [
  "listening",
  "transcribing",
  "understanding",
  "planning",
  "asking",
];

const PRESETS = [
  "Send Ksh 5000 to Mama Wanjiku kesho by 5pm",
  "Remind Ngozi to pay eighty five thousand naira by tomorrow",
  "Show me Chinedu last invoice",
];

export function CommandWorkspace() {
  const [text, setText] = useState(PRESETS[0]!);
  const [stage, setStage] = useState<AgentStage>("idle");
  const [meaning, setMeaning] = useState<Interpreted | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  function run() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    setDecision(null);
    setMeaning(null);
    const utterance = text.trim();
    if (!utterance) return;

    PIPELINE.forEach((s, i) => {
      const id = window.setTimeout(() => {
        setStage(s);
        if (s === "asking") setMeaning(interpret(utterance));
      }, i * 900);
      timers.current.push(id);
    });
  }

  function decide(next: "approved" | "rejected") {
    setDecision(next);
    setStage(next === "approved" ? "acting" : "idle");

    if (next === "approved") {
      const verifyId = window.setTimeout(() => setStage("verifying"), 1200);
      const doneId = window.setTimeout(() => setStage("done"), 2400);
      timers.current.push(verifyId, doneId);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AgentStatus stage={stage} size="md" />

      <label className="flex flex-col gap-2 text-sm text-neutral-400">
        Utterance
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm text-neutral-100 outline-none focus:border-emerald-700"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            className="h-9 rounded-full border border-neutral-800 px-3 text-xs text-neutral-500 hover:text-neutral-200"
            onClick={() => setText(p)}
          >
            {p.split(" ").slice(0, 4).join(" ")}…
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-500">
        Demo mode · no external side effects are sent. Approval still controls the
        Act stage, and PAL visibly enters Verify before finishing.
      </div>

      <button
        type="button"
        onClick={run}
        className="h-12 rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-500"
      >
        Run pipeline
      </button>

      {meaning && stage === "asking" && !decision ? (
        <article className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-5">
          <p className="text-xs uppercase tracking-wide text-emerald-400">PAL is asking</p>
          <h2 className="mt-1 text-lg font-medium text-neutral-100">{meaning.title}</h2>
          <p className="mt-2 font-mono text-xs text-neutral-400">{meaning.payload}</p>
          <p className="mt-2 text-xs text-neutral-500">
            {meaning.mix} · {meaning.why}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="h-11 rounded-lg bg-neutral-100 px-4 text-sm font-medium text-neutral-950"
              onClick={() => decide("approved")}
            >
              Yes, do this
            </button>
            <button
              type="button"
              className="h-11 rounded-lg border border-neutral-700 px-4 text-sm text-neutral-200"
              onClick={() => decide("rejected")}
            >
              No, reject
            </button>
          </div>
        </article>
      ) : null}

      {decision === "approved" ? (
        <p className="text-sm text-green-400">
          Approved. PAL is acting, then verifying the outcome. No live side effects are
          sent by this public demo.
        </p>
      ) : null}
      {decision === "rejected" ? (
        <p className="text-sm text-neutral-400">Rejected. Nothing was executed.</p>
      ) : null}
    </div>
  );
}
