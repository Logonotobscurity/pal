import Link from "next/link";

export default function CommandPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">
        PAL
      </p>
      <h1 className="max-w-xl text-center text-3xl font-semibold text-neutral-100 sm:text-4xl">
        What needs to happen?
      </h1>
      <p className="text-neutral-400">Speak naturally. PAL understands, plans, and executes.</p>
      
      {/* Status indicator */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
          <p className="text-xs text-neutral-500">Phase 3 Complete: Full pipeline operational</p>
        </div>
      </div>

      {/* Feature cards */}
      <div className="mt-8 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/approvals"
          className="group rounded-lg border border-neutral-800 bg-neutral-900/50 p-6 transition hover:border-neutral-600 hover:bg-neutral-900"
        >
          <h3 className="text-sm font-semibold text-neutral-100 group-hover:text-green-400">
            Approvals
          </h3>
          <p className="mt-2 text-xs text-neutral-400">
            Review and approve pending actions
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
            <span>→</span>
            <span>Phase 3.3</span>
          </div>
        </Link>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6 opacity-75">
          <h3 className="text-sm font-semibold text-neutral-300">
            Voice Command
          </h3>
          <p className="mt-2 text-xs text-neutral-400">
            Speak naturally to create actions
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
            <span>→</span>
            <span>Phase 1 (Backend ready)</span>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6 opacity-75">
          <h3 className="text-sm font-semibold text-neutral-300">
            Activity Feed
          </h3>
          <p className="mt-2 text-xs text-neutral-400">
            View execution history and audit trail
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
            <span>→</span>
            <span>Coming soon</span>
          </div>
        </div>
      </div>

      {/* Pipeline status */}
      <div className="mt-12 max-w-2xl rounded-lg border border-neutral-800 bg-neutral-900/30 p-6">
        <h2 className="text-center text-sm font-semibold text-neutral-300">
          Complete Pipeline
        </h2>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-500">
          <span className="rounded bg-green-950/50 px-2 py-1 text-green-400">Voice</span>
          <span>→</span>
          <span className="rounded bg-green-950/50 px-2 py-1 text-green-400">Speech</span>
          <span>→</span>
          <span className="rounded bg-green-950/50 px-2 py-1 text-green-400">Meaning</span>
          <span>→</span>
          <span className="rounded bg-green-950/50 px-2 py-1 text-green-400">Plan</span>
          <span>→</span>
          <span className="rounded bg-green-950/50 px-2 py-1 text-green-400">Policy</span>
          <span>→</span>
          <span className="rounded bg-green-950/50 px-2 py-1 text-green-400">Approval</span>
          <span>→</span>
          <span className="rounded bg-green-950/50 px-2 py-1 text-green-400">Execution</span>
          <span>→</span>
          <span className="rounded bg-green-950/50 px-2 py-1 text-green-400">Verification</span>
        </div>
        <p className="mt-4 text-center text-xs text-neutral-600">
          All backend components implemented and tested
        </p>
      </div>

      {/* Auth */}
      <div className="mt-8">
        <Link
          href="/login"
          className="rounded-md border border-neutral-700 px-6 py-2 text-sm text-neutral-300 transition hover:border-neutral-400 hover:text-neutral-100"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
