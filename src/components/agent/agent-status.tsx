/**
 * AgentStatus — status surface for PAL pipeline stages.
 *
 * Communicates *what kind of work* is happening (ASK concept) via
 * Thinking Orbs (`thinking-orbs`), not a generic spinner.
 *
 * Stages: Speak → Understand → Plan → Ask → Act → Verify
 */

"use client";

import { ThinkingOrb } from "thinking-orbs";

export type AgentStage =
  | "idle"
  | "listening"
  | "transcribing"
  | "understanding"
  | "planning"
  | "asking"
  | "acting"
  | "verifying"
  | "done"
  | "error";

/** Orb states supported by thinking-orbs (subset we map to). */
export type OrbState =
  | "listening"
  | "searching"
  | "solving"
  | "shaping"
  | "composing"
  | "working"
  | "breathing"
  | "connecting";

const STAGE_COPY: Record<
  AgentStage,
  { label: string; hint: string; tone: "neutral" | "active" | "ask" | "success" | "danger" }
> = {
  idle: { label: "Ready", hint: "Speak when you’re ready", tone: "neutral" },
  listening: { label: "Listening", hint: "Hearing your request", tone: "active" },
  transcribing: { label: "Transcribing", hint: "Turning speech into text", tone: "active" },
  understanding: { label: "Understanding", hint: "Extracting meaning", tone: "active" },
  planning: { label: "Planning", hint: "Building the work", tone: "active" },
  asking: { label: "PAL is asking", hint: "Waiting for your decision", tone: "ask" },
  acting: { label: "Acting", hint: "Running the approved action", tone: "active" },
  verifying: { label: "Verifying", hint: "Confirming the outcome", tone: "active" },
  done: { label: "Done", hint: "Verified", tone: "success" },
  error: { label: "Needs attention", hint: "Something went wrong", tone: "danger" },
};

const TONE_CLASS: Record<(typeof STAGE_COPY)[AgentStage]["tone"], string> = {
  neutral: "border-neutral-800 bg-neutral-900/50 text-neutral-400",
  active: "border-neutral-700 bg-neutral-900 text-neutral-200",
  ask: "border-emerald-900/60 bg-emerald-950/30 text-emerald-300",
  success: "border-green-900/50 bg-green-950/20 text-green-400",
  danger: "border-red-900/50 bg-red-950/20 text-red-400",
};

/** Map PAL pipeline stage → honest Thinking Orb animation. */
export function orbStateForStage(stage: AgentStage): OrbState {
  switch (stage) {
    case "listening":
      return "listening";
    case "transcribing":
      return "searching";
    case "understanding":
      return "solving";
    case "planning":
      return "shaping";
    case "asking":
      return "breathing"; // human is the active agent
    case "acting":
      return "working";
    case "verifying":
      return "searching";
    case "idle":
    case "done":
      return "breathing";
    case "error":
      return "connecting";
    default:
      return "breathing";
  }
}

type AgentStatusProps = {
  stage: AgentStage;
  label?: string;
  showHint?: boolean;
  /** sm → 20px orb; md → 64px orb */
  size?: "sm" | "md";
  /** Freeze animation (e.g. idle resting frame) */
  paused?: boolean;
  className?: string;
};

export function AgentStatus({
  stage,
  label,
  showHint = true,
  size = "md",
  paused,
  className = "",
}: AgentStatusProps) {
  const copy = STAGE_COPY[stage];
  const toneClass = TONE_CLASS[copy.tone];
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const orbSize = size === "sm" ? 20 : 64;
  const orbState = orbStateForStage(stage);
  const isPaused =
    paused ?? (stage === "idle" || stage === "done" || stage === "error");

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-full border px-3 py-1.5 ${toneClass} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label ?? copy.label}
    >
      <span className="inline-flex shrink-0 items-center justify-center" aria-hidden>
        <ThinkingOrb
          state={orbState}
          size={orbSize}
          theme="dark"
          paused={isPaused}
          aria-label={label ?? copy.label}
        />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={`font-medium leading-tight ${textSize}`}>
          {label ?? copy.label}
        </span>
        {showHint && size !== "sm" && (
          <span className="text-xs leading-tight opacity-70">{copy.hint}</span>
        )}
      </span>
    </div>
  );
}

/** Map common pipeline step names to AgentStage (for steppers / logs). */
export function stageFromPipelineStep(
  step:
    | "voice"
    | "speech"
    | "meaning"
    | "plan"
    | "policy"
    | "approval"
    | "execution"
    | "verification",
): AgentStage {
  switch (step) {
    case "voice":
      return "listening";
    case "speech":
      return "transcribing";
    case "meaning":
      return "understanding";
    case "plan":
    case "policy":
      return "planning";
    case "approval":
      return "asking";
    case "execution":
      return "acting";
    case "verification":
      return "verifying";
    default:
      return "idle";
  }
}
