import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";

const tiers = [
  {
    name: "Tier 1 — Transcription",
    why: "Establish ASR quality on code-switched audio before measuring understanding.",
    metrics: ["WER", "CER", "Code-switch span F1", "Language-pair identification"],
  },
  {
    name: "Tier 2 — Information extraction",
    why: "Names, amounts, dates, and negations must survive into MeaningState or SME actions fail.",
    metrics: [
      "Critical field recall / precision",
      "Entity F1",
      "Negation accuracy",
      "Numeric accuracy",
    ],
  },
  {
    name: "Tier 3 — Semantic understanding",
    why: "PAL acts on intent and constraints, not raw words.",
    metrics: [
      "Intent accuracy",
      "Constraint detection",
      "Ambiguity / insufficient-context flags",
    ],
  },
  {
    name: "Tier 4 — Action quality",
    why: "The right constrained workflow must be proposed after policy.",
    metrics: [
      "Action validity",
      "Action correctness",
      "Approval routing accuracy",
      "False auto-approval rate",
    ],
  },
  {
    name: "Tier 5 — Safety",
    why: "No model may execute external side effects unsupervised.",
    metrics: [
      "Critical-field blocking (low confidence)",
      "Unsupervised side-effect rate (must be 0%)",
      "Provenance coverage",
    ],
  },
];

export default function MethodologyPage() {
  return (
    <>
      <AppHeader active="evaluation" />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
          Evaluation
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-neutral-100 sm:text-3xl">
          Methodology
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">
          PAL measures <strong className="font-medium text-neutral-300">speech → meaning → action</strong>,
          not transcription alone. Three ASR front-ends (Sahara, Whisper Large-v3,
          AfriSpeech-Whisper) feed the <em>same</em> pipeline so differences isolate
          speech quality under code-switching.
        </p>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Thesis
          </h2>
          <blockquote className="mt-3 border-l-2 border-emerald-700/60 pl-4 text-sm text-neutral-300">
            Speech quality determines action quality — under a hard human-approval gate.
          </blockquote>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Pipeline under test
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-neutral-400">
            <li>Audio → SpeechEvent (transcript + optional code-switch metadata)</li>
            <li>SpeechEvent → MeaningState (intent, entities, constraints, confidence)</li>
            <li>MeaningState → ActionPlan / WorkflowIR (capability-registry only)</li>
            <li>Policy → ActionProposal (risk class, approval required)</li>
            <li>Owner decision (“PAL is asking”) → execute → verify</li>
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Metric tiers
          </h2>
          <ul className="mt-4 space-y-4">
            {tiers.map((t) => (
              <li
                key={t.name}
                className="rounded-xl border border-neutral-800 bg-neutral-900/30 px-5 py-4"
              >
                <h3 className="text-sm font-semibold text-neutral-100">{t.name}</h3>
                <p className="mt-1 text-xs text-neutral-500">{t.why}</p>
                <p className="mt-2 text-xs text-neutral-400">
                  {t.metrics.join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Data & preprocessing
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-neutral-400">
            <li>
              <strong className="text-neutral-300">AfriSwitch</strong> — in-the-wild African
              code-switched conversation (gated HF).
            </li>
            <li>
              <strong className="text-neutral-300">AfriSwitchCare</strong> — clinical CS; stress-tests
              high-stakes fields.
            </li>
            <li>
              <strong className="text-neutral-300">NigBench-MAMAI-Speech-QA</strong> — Nigerian spoken
              QA / SME-style phrasing.
            </li>
            <li>
              Preprocess: 16 kHz mono where required; punctuation-normalized WER/CER; map
              critical fields for Tier 2; prefer speaker-disjoint splits when IDs exist.
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Safety invariant
          </h2>
          <p className="mt-3 text-sm text-neutral-400">
            Models only produce typed proposals. Policy is deterministic. Consequential
            actions require explicit owner approval showing the exact payload. Unsupervised
            side-effect rate is measured and must remain <strong className="text-emerald-400">0%</strong>.
          </p>
        </section>

        <section className="mt-10 rounded-xl border border-neutral-800 bg-neutral-900/30 px-5 py-4">
          <p className="text-xs text-neutral-500">
            Full protocol: <code className="text-neutral-400">docs/PAL_BENCHMARK.md</code> ·
            Numbers on the results page are evaluation-slice estimates; re-run with live
            API keys for official reproduction.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/evaluation"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              ← Back to results
            </Link>
            <Link
              href="/approvals"
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-500"
            >
              Approvals
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
