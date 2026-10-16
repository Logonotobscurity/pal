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

type DemoProposal = {
  title: string;
  payload: string;
  mix: string;
  why: string;
};

export function CommandWorkspace() {
  const [text, setText] = useState(PRESETS[0]!);
  const [stage, setStage] = useState<AgentStage>("idle");
  const [meaning, setMeaning] = useState<Interpreted | DemoProposal | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      recognitionRef.current?.stop();
    };
  }, []);

  function startMic() {
    setMicError(null);
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: typeof globalThis.SpeechRecognition; webkitSpeechRecognition?: typeof globalThis.SpeechRecognition })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof globalThis.SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-NG";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) setText(transcript);
      setListening(false);
    };

    recognition.onerror = () => {
      setMicError("Could not capture speech. Try again or type.");
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function stopMic() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function run() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    setDecision(null);
    setMeaning(null);
    const utterance = text.trim();
    if (!utterance) return;

    // Prefer live demo endpoint when available (PR #6); fall back to local interpret.
    try {
      const res = await fetch("/api/demo/pipeline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: utterance }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.proposal) {
          setMeaning(data.proposal);
          setStage("asking");
          return;
        }
      }
    } catch {
      // fall through to local demo
    }

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

  const display = meaning as (Interpreted & DemoProposal) | null;

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

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={listening ? stopMic : startMic}
          className={`h-9 rounded-full border px-3 text-xs ${
            listening
              ? "border-red-700 text-red-400"
              : "border-neutral-800 text-neutral-500 hover:text-neutral-200"
          }`}
        >
          {listening ? "Stop mic" : "Mic"}
        </button>
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

      {micError ? <p className="text-xs text-red-400">{micError}</p> : null}

      <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-500">
        Optional mic fills the utterance (Web Speech API). Run still posts to the live
        demo endpoint when available, otherwise uses the local demo. No external side
        effects are sent.
      </div>

      <button
        type="button"
        onClick={run}
        className="h-12 rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-500"
      >
        Run pipeline
      </button>

      {display && stage === "asking" && !decision ? (
        <article className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-5">
          <p className="text-xs uppercase tracking-wide text-emerald-400">PAL is asking</p>
          <h2 className="mt-1 text-lg font-medium text-neutral-100">{display.title}</h2>
          <p className="mt-2 font-mono text-xs text-neutral-400">{display.payload}</p>
          <p className="mt-2 text-xs text-neutral-500">
            {display.mix} · {display.why}
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
