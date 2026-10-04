"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { hasSession, useAuth } from "../../lib/auth/auth-context";
import { ADMIN_HOME, PROFESSOR_ROUTES, ROLE_HOME } from "../../lib/auth/profile";
import { publicSignupEnabled, resumeDemoEnabled } from "../../lib/release";

type AuthNavProps = {
  /** "home" keeps the landing page's prominent call to action. */
  variant?: "compact" | "home";
};

const homeCtaClass =
  "rounded-md border-2 border-[#006747] bg-[#006747] px-4 py-3 text-sm font-bold text-white shadow-[4px_4px_0_#418fde] transition hover:-translate-y-0.5 hover:bg-[#00513a] active:translate-y-0 active:bg-[#003b2a] sm:px-6";

const textActionClass = {
  compact:
    "rounded-lg px-2 py-1 text-sm font-semibold text-rb-brand transition hover:text-rb-brand-hover disabled:cursor-wait disabled:opacity-60",
  home: "rounded-lg px-1 py-1 text-[15px] font-semibold text-rb-ink transition hover:text-rb-brand disabled:cursor-wait disabled:opacity-60",
} as const;

/**
 * Auth-aware navigation actions. Shows only actions that fit the signed-in
 * user's profile role; it hides links but does not protect anything.
 */
export function AuthNav({ variant = "compact" }: AuthNavProps) {
  const { state, isSigningOut, signOut } = useAuth();
  const pathname = usePathname();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const isProfessor = state.status === "signed-in" && state.role === "professor";
  const isStudent = state.status === "signed-in" && state.role === "student";
  const isAdmin = state.status === "signed-in" && state.role === "admin";

  async function handleSignOut() {
    setSignOutError(null);
    const result = await signOut();
    if (!result.ok) setSignOutError(result.message);
  }

  const signedOutActions =
    variant === "home" ? (
      <>
        <Link href="/sign-in" className={textActionClass.home}>
          Sign in
        </Link>
        <Link href={publicSignupEnabled() ? "/sign-up" : "/access"} className={homeCtaClass}>
          {publicSignupEnabled() ? "Get started" : "Request access"}
        </Link>
      </>
    ) : (
      <Link href="/sign-in" className={textActionClass.compact}>
        Sign in
      </Link>
    );

  if (state.status === "loading") {
    // Reserve the signed-out layout invisibly so the bar does not jump or
    // briefly offer actions that do not apply to this user.
    return (
      <div className="flex items-center gap-3 sm:gap-6">
        <span className="sr-only">Checking sign-in status</span>
        <div aria-hidden="true" inert className="invisible flex items-center gap-3 sm:gap-6">
          {signedOutActions}
        </div>
      </div>
    );
  }

  if (!hasSession(state)) {
    return <div className="flex items-center gap-3 sm:gap-6">{signedOutActions}</div>;
  }

  const compactLinkClass =
    "rounded-lg px-2 py-1 text-sm font-semibold text-rb-muted transition hover:text-rb-brand";

  const primaryAction =
    variant === "home" && isProfessor ? (
      <Link href={ROLE_HOME.professor} className={`hidden sm:inline-flex ${homeCtaClass}`}>
        My opportunities
      </Link>
    ) : variant === "home" && isAdmin ? (
      <Link href={ADMIN_HOME} className={`hidden sm:inline-flex ${homeCtaClass}`}>
        Admin dashboard
      </Link>
    ) : variant === "home" && isStudent ? (
      <Link href={ROLE_HOME.student} className={`hidden sm:inline-flex ${homeCtaClass}`}>
        Browse opportunities
      </Link>
    ) : variant === "compact" && isProfessor ? (
      <>
        {pathname !== PROFESSOR_ROUTES.opportunities ? (
          <Link href={PROFESSOR_ROUTES.opportunities} className={compactLinkClass}>
            My opportunities
          </Link>
        ) : null}
        {pathname !== PROFESSOR_ROUTES.newOpportunity ? (
          <Link href={PROFESSOR_ROUTES.newOpportunity} className={compactLinkClass}>
            Post an opportunity
          </Link>
        ) : null}
      </>
    ) : variant === "compact" && isAdmin ? (
      <>
        {pathname !== ADMIN_HOME ? (
          <Link href={ADMIN_HOME} className={compactLinkClass}>
            Admin dashboard
          </Link>
        ) : null}
        {pathname !== ROLE_HOME.student ? (
          <Link href={ROLE_HOME.student} className={compactLinkClass}>
            Browse opportunities
          </Link>
        ) : null}
      </>
    ) : null;

  return (
    <div className="relative flex items-center gap-3 sm:gap-6">
      {isStudent && resumeDemoEnabled() && pathname !== "/student/resume" ? (
        <Link href="/student/resume" className={textActionClass[variant]}>My résumé</Link>
      ) : null}
      {variant === "compact" ? primaryAction : null}
      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={isSigningOut}
        className={textActionClass[variant]}
      >
        {isSigningOut ? "Signing out…" : "Sign out"}
      </button>
      {variant === "home" ? primaryAction : null}

      {signOutError ? (
        <div
          role="alert"
          className="absolute right-0 top-full z-30 mt-3 w-72 max-w-[calc(100vw-2.5rem)] rounded-xl border border-[#e0b3a7] bg-[#fdf1ed] p-4 text-left text-[13px] font-semibold leading-5 text-[#8f2d1c] shadow-[0_14px_30px_rgba(17,17,17,0.12)]"
        >
          <p>{signOutError}</p>
          <button
            type="button"
            onClick={() => setSignOutError(null)}
            className="mt-2 rounded text-[13px] font-bold text-[#8f2d1c] underline underline-offset-2 hover:text-rb-brand-hover"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}
