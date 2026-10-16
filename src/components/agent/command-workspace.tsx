"use client";

import { useEffect, useRef, useState } from "react";
import { AgentStatus, type AgentStage } from "@/components/agent/agent-status";
import { interpret, type Interpreted } from "@/lib/interpret";

const PRESETS = [
  "Send Ksh 5000 to Mama Wanjiku kesho by 5pm",
  "Remind Ngozi to pay eighty five thousand naira by tomorrow",
  "Show me Chinedu last invoice",
];

type Proposal = {
  id?: string;
  title: string;
  payload: string;
  mix: string;
  why: string;
  actionType?: string;
  version?: number;
};

export function CommandWorkspace() {
  const [text, setText] = useState(PRESETS[0]!);
  const [workspaceId, setWorkspaceId] = useState("");
  const [stage, setStage] = useState<AgentStage>("idle");
  const [meaning, setMeaning] = useState<Interpreted | Proposal | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    return () => {
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
    setError(null);
    setDecision(null);
    setMeaning(null);
    const utterance = text.trim();
    if (!utterance) return;

    setStage("understanding");

    if (workspaceId) {
      try {
        const res = await fetch("/api/command/run", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: utterance, workspaceId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? data.details ?? "Command failed");
          setStage("idle");
          return;
        }
        setMeaning(data.proposal);
        setStage("asking");
        return;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
        setStage("idle");
        return;
      }
    }

    setStage("asking");
    setMeaning(interpret(utterance));
  }

  async function decide(next: "approved" | "rejected") {
    setDecision(next);
    const proposal = meaning as Proposal | null;

    if (next === "approved" && proposal?.id && workspaceId) {
      setStage("acting");
      try {
        const approveRes = await fetch(`/api/proposals/${proposal.id}/approve`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            version: proposal.version ?? 1,
            reason: "Approved from command",
          }),
        });
        if (!approveRes.ok) {
          const data = await approveRes.json();
          setError(data.error ?? "Approval failed");
          setStage("idle");
          return;
        }

        const execRes = await fetch(`/api/executions/${proposal.id}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ workspaceId }),
        });
        if (!execRes.ok) {
          const data = await execRes.json();
          setError(data.error ?? "Execution failed");
          setStage("idle");
          return;
        }

        setStage("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
        setStage("idle");
      }
    } else {
      setStage(next === "approved" ? "acting" : "idle");
      if (next === "approved") {
        setTimeout(() => setStage("done"), 1200);
      }
    }
  }

  const display = meaning as Proposal | null;

  return (
    <div className="flex flex-col gap-6">
      <AgentStatus stage={stage} size="md" />

      <label className="flex flex-col gap-2 text-sm text-neutral-400">
        Workspace ID (required for realistic path)
        <input
          value={workspaceId}
          onChange={(e) => setWorkspaceId(e.target.value)}
          placeholder="Paste a workspace UUID you belong to"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-sm text-neutral-100 outline-none focus:border-emerald-700"
        />
      </label>

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
      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-xs text-neutral-500">
        With a workspace ID (and signed in), this runs the real semantic + workflow agents,
        creates a pending proposal, and executes via the native path only after you approve.
        Without a workspace it falls back to the local demo.
      </div>

      <button
        type="button"
        onClick={run}
        className="h-12 rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-500"
      >
        Run
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
          Approved. {workspaceId ? "Execution requested." : "Demo only — no side effects."}
        </p>
      ) : null}
      {decision === "rejected" ? (
        <p className="text-sm text-neutral-400">Rejected. Nothing was executed.</p>
      ) : null}
    </div>
  );
}
