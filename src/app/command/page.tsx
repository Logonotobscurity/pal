import { AppHeader } from "@/components/layout/app-header";
import { CommandWorkspace } from "@/components/agent/command-workspace";

export default function CommandPage() {
  return (
    <>
      <AppHeader active="command" />
      <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
          Command
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-100">
          Speak, then PAL asks
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-400">
          Type or speak a mixed-language request. With a workspace ID and signed-in session,
          PAL runs the real semantic and workflow agents, creates a pending proposal, and
          executes only after you approve.
        </p>
        <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
          <CommandWorkspace />
        </div>
      </main>
    </>
  );
}
