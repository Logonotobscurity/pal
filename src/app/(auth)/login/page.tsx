import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">
          PAL
        </p>
        <h1 className="text-2xl font-semibold">Sign in</h1>
      </div>
      <LoginForm />
      <p className="text-sm text-neutral-400">
        No account yet?{" "}
        <Link href="/register" className="text-neutral-100 underline">
          Create one
        </Link>
      </p>
    </main>
  );
}
