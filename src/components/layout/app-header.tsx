import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/layout/logout-button";

type AppHeaderProps = {
  /** Highlight the active nav item */
  active?: "home" | "evaluation" | "approvals" | "login";
  /**
   * Optional override. When omitted, session is read from Supabase
   * so public pages also show Sign out after login.
   */
  signedIn?: boolean;
};

const linkBase =
  "text-sm text-neutral-400 transition hover:text-neutral-100";
const linkActive = "text-sm font-medium text-emerald-400";

export async function AppHeader({ active, signedIn }: AppHeaderProps) {
  let isSignedIn = signedIn ?? false;

  if (signedIn === undefined) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      isSignedIn = Boolean(user);
    } catch {
      isSignedIn = false;
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-100">
              PAL
            </span>
          </Link>
          <nav className="hidden items-center gap-4 sm:flex" aria-label="Primary">
            <Link
              href="/"
              className={active === "home" ? linkActive : linkBase}
            >
              Home
            </Link>
            <Link
              href="/evaluation"
              className={active === "evaluation" ? linkActive : linkBase}
            >
              Evaluation
            </Link>
            <Link
              href="/approvals"
              className={active === "approvals" ? linkActive : linkBase}
            >
              Approvals
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/Logonotobscurity/pal"
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkBase} hidden sm:inline`}
          >
            GitHub
          </a>
          {isSignedIn ? (
            <LogoutButton />
          ) : (
            <Link
              href="/login"
              className={
                active === "login"
                  ? "rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 transition hover:border-neutral-500 hover:text-neutral-100"
              }
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
      <nav
        className="flex gap-4 overflow-x-auto border-t border-neutral-900 px-4 py-2 sm:hidden"
        aria-label="Mobile"
      >
        <Link href="/" className={active === "home" ? linkActive : linkBase}>
          Home
        </Link>
        <Link
          href="/evaluation"
          className={active === "evaluation" ? linkActive : linkBase}
        >
          Evaluation
        </Link>
        <Link
          href="/approvals"
          className={active === "approvals" ? linkActive : linkBase}
        >
          Approvals
        </Link>
      </nav>
    </header>
  );
}
