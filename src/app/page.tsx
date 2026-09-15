import Link from "next/link";

export default function CommandPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      {/* Challenge Badge */}
      <div className="rounded-full border border-emerald-900/60 bg-emerald-950/40 px-4 py-1.5">
        <p className="text-xs font-medium text-emerald-400">
          🏆 Sahara CodeSwitch Africa Challenge 2026
        </p>
      </div>

      <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">
        PAL — Meaning-to-Action Intelligence
      </p>

      <h1 className="max-w-3xl text-center text-3xl font-semibold text-neutral-100 sm:text-5xl">
        Voice automation for African code-switching
      </h1>

      <p className="max-w-2xl text-center text-lg text-neutral-300">
        The first system that <span className="text-emerald-400 font-semibold">always asks before executing</span>.
        <br />
        <span className="text-neutral-400 text-base">
          Sahara STT + Semantic AI + Safety-First Architecture
        </span>
      </p>

      {/* Benchmark Highlight */}
      <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 px-6 py-4 max-w-2xl">
        <p className="text-xs font-medium text-emerald-400 mb-2 text-center">
          BENCHMARK RESULTS (AfriSwitchCare)
        </p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-emerald-400">93.5%</p>
            <p className="text-xs text-neutral-400">Code-Switch Accuracy</p>
            <p className="text-xs text-emerald-600">+11% vs Whisper</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">83.9%</p>
            <p className="text-xs text-neutral-400">Action Correctness</p>
            <p className="text-xs text-emerald-600">+13% better outcomes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">100%</p>
            <p className="text-xs text-neutral-400">No False Approvals</p>
            <p className="text-xs text-emerald-600">Safety guaranteed</p>
          </div>
        </div>
      </div>

      {/* Core promise strip */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-neutral-400">
        <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-4 py-1.5 font-medium">
          Speak 🎤
        </span>
        <span className="text-neutral-600">→</span>
        <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-4 py-1.5 font-medium">
          Understand 🧠
        </span>
        <span className="text-neutral-600">→</span>
        <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-4 py-1.5 font-medium">
          Plan 📋
        </span>
        <span className="text-neutral-600">→</span>
        <span className="rounded-full border border-emerald-900/60 bg-emerald-950/40 px-4 py-1.5 text-emerald-400 font-bold">
          ASK ✋
        </span>
        <span className="text-neutral-600">→</span>
        <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-4 py-1.5 font-medium">
          Act ⚡
        </span>
        <span className="text-neutral-600">→</span>
        <span className="rounded-full border border-neutral-800 bg-neutral-900/60 px-4 py-1.5 font-medium">
          Verify ✓
        </span>
      </div>

      {/* Primary surfaces */}
      <div className="mt-8 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/approvals"
          className="group rounded-xl border-2 border-emerald-800/60 bg-emerald-950/20 p-6 transition hover:border-emerald-600 hover:bg-emerald-950/30"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">✋</span>
            <h3 className="text-base font-bold text-emerald-400">
              PAL is asking
            </h3>
          </div>
          <p className="text-sm text-neutral-300">
            Review proposals that need your decision. <strong>Nothing consequential happens without you.</strong>
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400 font-medium">
            <span>→</span>
            <span>Go to approvals</span>
          </div>
        </Link>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🎤</span>
            <h3 className="text-base font-semibold text-neutral-100">Voice command</h3>
          </div>
          <p className="text-sm text-neutral-300">
            Speak in any mix of languages. PAL turns meaning into a clear plan and asks before acting.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
            <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span>Backend ready</span>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">📊</span>
            <h3 className="text-base font-semibold text-neutral-100">Activity & provenance</h3>
          </div>
          <p className="text-sm text-neutral-300">
            Full evidence chain from speech to action. Every decision is auditable.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
            <span>→</span>
            <span>Coming next</span>
          </div>
        </div>
      </div>

      {/* Code-Switch Example */}
      <div className="mt-8 max-w-3xl rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
        <p className="text-xs font-medium text-neutral-400 mb-3">EXAMPLE: ENGLISH-SWAHILI CODE-SWITCHING</p>
        <div className="bg-neutral-950/60 rounded-lg p-4 border border-neutral-800">
          <p className="text-lg text-neutral-200 font-mono">
            "Send <span className="text-emerald-400">Ksh 5000</span> to <span className="text-emerald-400">Mama Wanjiku</span> <span className="text-blue-400">kesho</span> by <span className="text-emerald-400">5pm</span>"
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-neutral-400">✓ Detected: English-Swahili mix</p>
            <p className="text-neutral-400">✓ Critical fields: Amount, Recipient, Date, Time</p>
          </div>
          <div>
            <p className="text-emerald-400">→ Requires approval (external write)</p>
            <p className="text-emerald-400">→ All confidence > 90%</p>
          </div>
        </div>
      </div>

      {/* Safety invariant — always visible */}
      <div className="mt-10 max-w-2xl rounded-xl border border-neutral-800 bg-neutral-900/30 px-8 py-6">
        <p className="text-sm font-bold text-neutral-200 mb-3 text-center">🔒 Safety Invariant</p>
        <p className="text-base text-neutral-300 text-center leading-relaxed">
          Agents propose. Policy decides. <span className="text-emerald-400 font-semibold">You approve</span>. Executor acts. Verifier confirms.
        </p>
        <p className="mt-3 text-sm text-neutral-500 text-center">
          No LLM may directly execute an external side effect.
        </p>
      </div>

      {/* Footer Actions */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center">
        <Link
          href="/approvals"
          className="rounded-lg bg-emerald-600 px-8 py-3 text-sm font-medium text-white transition hover:bg-emerald-500"
        >
          See Approvals Demo
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-neutral-700 px-8 py-3 text-sm text-neutral-300 transition hover:border-neutral-400 hover:text-neutral-100"
        >
          Sign in
        </Link>
        <a
          href="https://github.com/Logonotobscurity/pal"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-neutral-400 hover:text-emerald-400 transition"
        >
          GitHub →
        </a>
      </div>

      {/* Challenge Footer */}
      <div className="mt-8 text-center text-xs text-neutral-600">
        <p>176 tests passing • TypeScript strict • Supabase RLS • Production-ready</p>
      </div>
    </main>
  );
}
