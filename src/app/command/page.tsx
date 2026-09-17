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
          Type a mixed-language request. The orb follows the real pipeline. Execution
          never starts until you say yes.
        </p>
        <p className="mt-2 text-xs text-neutral-600">
          Public demo — no sign-in. Approvals still uses a signed-in workspace.
        </p>
        <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
          <CommandWorkspace />
        </div>
      </main>
    </>
  );
}
