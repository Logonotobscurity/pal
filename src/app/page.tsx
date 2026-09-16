import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { PipelineStageShowcase } from "@/components/agent/pipeline-stage-showcase";

export default function CommandPage() {
  return (
    <>
      <AppHeader active="home" />
      <main className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 py-12 sm:px-6">
        <div className="rounded-full border border-emerald-900/60 bg-emerald-950/40 px-4 py-1.5">
          <p className="text-xs font-medium text-emerald-400">
            Sahara CodeSwitch Africa Challenge 2026
          </p>
        </div>

        <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">
          Meaning-to-Action Intelligence
        </p>

        <h1 className="max-w-3xl text-center text-3xl font-semibold text-neutral-100 sm:text-5xl">
          Voice automation for African code-switching
        </h1>

        <p className="max-w-2xl text-center text-lg text-neutral-300">
          The system that{" "}
          <span className="font-semibold text-emerald-400">always asks before executing</span>.
          <span className="mt-1 block text-base text-neutral-400">
            Sahara STT · Semantic AI · Safety-first architecture
          </span>
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/approvals"
            className="rounded-lg bg-emerald-600 px-8 py-3 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            See Approvals
          </Link>
          <Link
            href="/evaluation"
            className="rounded-lg border border-neutral-700 px-8 py-3 text-sm text-neutral-200 transition hover:border-neutral-500 hover:text-neutral-100"
          >
            View evaluation
          </Link>
        </div>

        {/* Thinking Orbs — live stage showcase */}
        <section className="flex w-full max-w-2xl flex-col items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 px-6 py-6">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Agent state · Thinking Orbs
          </p>
          <PipelineStageShowcase />
          <p className="text-center text-xs text-neutral-600">
            Each motion matches a real pipeline phase — Ask uses a calm breath while you decide.
          </p>
        </section>

        <div className="w-full max-w-2xl rounded-xl border border-emerald-900/40 bg-emerald-950/20 px-6 py-5">
          <p className="mb-3 text-center text-xs font-medium text-emerald-400">
            Benchmark (AfriSwitchCare / mixed speech)
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-400">93.5%</p>
              <p className="text-xs text-neutral-400">Code-switch F1</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">83.9%</p>
              <p className="text-xs text-neutral-400">Action correctness</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">0%</p>
              <p className="text-xs text-neutral-400">Unsafe auto-actions</p>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-neutral-500">
            <Link href="/evaluation" className="text-emerald-500 hover:underline">
              Full results →
            </Link>
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-neutral-400">
          {["Speak", "Understand", "Plan"].map((label) => (
            <span key={label} className="flex items-center gap-2">
              <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 font-medium">
                {label}
              </span>
              <span className="text-neutral-600">→</span>
            </span>
          ))}
          <span className="rounded-full border border-emerald-900/60 bg-emerald-950/40 px-3 py-1.5 font-bold text-emerald-400">
            Ask
          </span>
          <span className="text-neutral-600">→</span>
          <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 font-medium">
            Act
          </span>
          <span className="text-neutral-600">→</span>
          <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 font-medium">
            Verify
          </span>
        </div>

        <div className="mt-4 grid w-full max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/approvals"
            className="group rounded-xl border-2 border-emerald-800/50 bg-emerald-950/15 p-6 transition hover:border-emerald-600/80"
          >
            <h3 className="text-base font-bold text-emerald-400">PAL is asking</h3>
            <p className="mt-2 text-sm text-neutral-300">
              Review proposals that need your decision. Nothing consequential happens without you.
            </p>
            <p className="mt-4 text-sm font-medium text-emerald-400">Go to approvals →</p>
          </Link>

          <Link
            href="/evaluation"
            className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 transition hover:border-neutral-600"
          >
            <h3 className="text-base font-semibold text-neutral-100">Evaluation</h3>
            <p className="mt-2 text-sm text-neutral-300">
              Sahara vs Whisper vs AfriSpeech-Whisper — WER, critical fields, and action quality.
            </p>
            <p className="mt-4 text-sm text-neutral-500">View benchmark →</p>
          </Link>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
            <h3 className="text-base font-semibold text-neutral-100">Voice command</h3>
            <p className="mt-2 text-sm text-neutral-300">
              Speak in any mix of languages. PAL turns meaning into a plan and asks before acting.
            </p>
            <p className="mt-4 text-xs text-neutral-500">Backend ready · orbs show live stage</p>
          </div>
        </div>

        <div className="w-full max-w-3xl rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
          <p className="mb-3 text-xs font-medium text-neutral-500">Example · English–Swahili</p>
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-4">
            <p className="font-mono text-base text-neutral-200 sm:text-lg">
              "Send <span className="text-emerald-400">Ksh 5000</span> to{" "}
              <span className="text-emerald-400">Mama Wanjiku</span>{" "}
              <span className="text-sky-400">kesho</span> by{" "}
              <span className="text-emerald-400">5pm</span>"
            </p>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-neutral-400 sm:grid-cols-2">
            <p>Detected mix · Critical fields extracted</p>
            <p className="text-emerald-400/90">Requires approval (external write)</p>
          </div>
        </div>

        <div className="max-w-xl rounded-xl border border-neutral-800 bg-neutral-900/30 px-6 py-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Safety invariant
          </p>
          <p className="mt-2 text-sm text-neutral-300">
            Agents propose. Policy decides.{" "}
            <span className="font-semibold text-emerald-400">You approve</span>. Executor acts.
            Verifier confirms.
          </p>
          <p className="mt-2 text-xs text-neutral-600">
            No LLM may directly execute an external side effect.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
          <Link href="/login" className="text-neutral-400 transition hover:text-neutral-100">
            Sign in
          </Link>
          <span className="text-neutral-700">·</span>
          <a
            href="https://github.com/Logonotobscurity/pal"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 transition hover:text-emerald-400"
          >
            GitHub
          </a>
        </div>
      </main>
    </>
  );
}
