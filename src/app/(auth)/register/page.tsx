import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-neutral-500">
          PAL
        </p>
        <h1 className="text-2xl font-semibold">Create your workspace</h1>
        <p className="max-w-sm text-center text-sm text-neutral-400">
          Signing up creates your profile and a personal workspace with you as
          owner.
        </p>
      </div>
      <RegisterForm />
      <p className="text-sm text-neutral-400">
        Already have an account?{" "}
        <Link href="/login" className="text-neutral-100 underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
