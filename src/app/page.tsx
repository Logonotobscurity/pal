import Link from "next/link";

export default function CommandPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">
        PAL
      </p>

      <h1 className="max-w-2xl text-center text-3xl font-semibold text-neutral-100 sm:text-4xl">
        What needs to happen?
      </h1>

      <p className="max-w-lg text-center text-neutral-400">
        Speak naturally. PAL understands the meaning, builds the work, and{" "}
        <span className="text-neutral-200">asks before it acts</span>.
      </p>

      {/* Core promise strip */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-500">
        <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1">
          Speak
        </span>
        <span className="text-neutral-600">→</span>
        <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1">
          Understand
        </span>
        <span className="text-neutral-600">→</span>
        <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1">
          Plan
        </span>
        <span className="text-neutral-600">→</span>
        <span className="rounded-full border border-emerald-900/60 bg-emerald-950/40 px-3 py-1 text-emerald-400">
          Ask
        </span>
        <span className="text-neutral-600">→</span>
        <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1">
          Act
        </span>
        <span className="text-neutral-600">→</span>
        <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1">
          Verify
        </span>
      </div>

      {/* Primary surfaces */}
      <div className="mt-8 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/approvals"
          className="group rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 transition hover:border-emerald-800/60 hover:bg-neutral-900"
        >
          <h3 className="text-sm font-semibold text-neutral-100 group-hover:text-emerald-400">
            PAL is asking
          </h3>
          <p className="mt-2 text-xs text-neutral-400">
            Review proposals that need your decision. Nothing consequential happens without you.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
            <span>→</span>
            <span>Go to approvals</span>
          </div>
        </Link>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 opacity-80">
          <h3 className="text-sm font-semibold text-neutral-300">Voice command</h3>
          <p className="mt-2 text-xs text-neutral-400">
            Speak in any mix of languages. PAL turns meaning into a clear plan and asks before acting.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
            <span>→</span>
            <span>Backend ready</span>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 opacity-80">
          <h3 className="text-sm font-semibold text-neutral-300">Activity & provenance</h3>
          <p className="mt-2 text-xs text-neutral-400">
            Full evidence chain from speech to action. Every decision is auditable.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
            <span>→</span>
            <span>Coming next</span>
          </div>
        </div>
      </div>

      {/* Safety invariant — always visible */}
      <div className="mt-10 max-w-xl rounded-xl border border-neutral-800 bg-neutral-900/30 px-6 py-5 text-center">
        <p className="text-xs font-medium text-neutral-300">Safety invariant</p>
        <p className="mt-2 text-sm text-neutral-400">
          Agents propose. Policy decides. You approve. Executor acts. Verifier confirms.
        </p>
        <p className="mt-1 text-xs text-neutral-600">
          No model may directly execute an external side effect.
        </p>
      </div>

      <div className="mt-6">
        <Link
          href="/login"
          className="rounded-lg border border-neutral-700 px-6 py-2.5 text-sm text-neutral-300 transition hover:border-neutral-400 hover:text-neutral-100"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
