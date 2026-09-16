import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { AppHeader } from "@/components/layout/app-header";

export default function LoginPage() {
  return (
    <>
      <AppHeader active="login" />
      <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-6 px-6 py-12">
        <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900/40 p-8">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">PAL</p>
            <h1 className="text-xl font-semibold text-neutral-100">Sign in</h1>
            <p className="text-sm text-neutral-400">
              Review what PAL is asking — nothing consequential runs without you.
            </p>
          </div>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-neutral-400">
            No account yet?{" "}
            <Link href="/register" className="text-emerald-400 hover:underline">
              Create one
            </Link>
          </p>
        </div>

        <div className="w-full max-w-md rounded-lg border border-neutral-800/80 bg-neutral-900/20 px-4 py-3 text-center">
          <p className="text-xs font-medium text-neutral-400">Demo / judges</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">
            Create a free account to open your personal workspace, or explore{" "}
            <Link href="/evaluation" className="text-emerald-500/90 hover:underline">
              Evaluation
            </Link>{" "}
            without signing in. Approvals require auth so proposals stay tenant-scoped.
          </p>
        </div>

        <Link href="/" className="text-xs text-neutral-500 transition hover:text-neutral-300">
          ← Back to home
        </Link>
      </main>
    </>
  );
}
