/**
 * AgentStatus — thin status surface for PAL pipeline stages.
 *
 * Purpose: communicate *what kind of work* is happening (ASK concept),
 * not just a generic spinner. Ready to host Thinking Orbs when the
 * dependency is added (`npm install thinking-orbs`).
 *
 * Stages align with: Speak → Understand → Plan → Ask → Act → Verify
 */

"use client";

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

type AgentStatusProps = {
  stage: AgentStage;
  /** Optional override for the short label */
  label?: string;
  /** Show the secondary hint line */
  showHint?: boolean;
  /** Size of the status chip */
  size?: "sm" | "md";
  className?: string;
};

/**
 * Minimal status chip. Replace the inner placeholder with <ThinkingOrb /> when ready.
 */
export function AgentStatus({
  stage,
  label,
  showHint = true,
  size = "md",
  className = "",
}: AgentStatusProps) {
  const copy = STAGE_COPY[stage];
  const toneClass = TONE_CLASS[copy.tone];
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${toneClass} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label ?? copy.label}
    >
      {/* Placeholder for Thinking Orb — keep layout stable when swapping in the real component */}
      <span
        className={`inline-block shrink-0 rounded-full bg-current opacity-70 ${
          size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5"
        } ${stage !== "idle" && stage !== "done" && stage !== "error" ? "animate-pulse" : ""}`}
        aria-hidden
      />
      <span className={`font-medium ${textSize}`}>{label ?? copy.label}</span>
      {showHint && size !== "sm" && (
        <span className="hidden text-xs opacity-70 sm:inline">{copy.hint}</span>
      )}
    </div>
  );
}

/** Map common pipeline step names to AgentStage (for steppers / logs). */
export function stageFromPipelineStep(
  step: "voice" | "speech" | "meaning" | "plan" | "policy" | "approval" | "execution" | "verification",
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
