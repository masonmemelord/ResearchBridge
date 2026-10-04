"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth, type AuthState } from "../../lib/auth/auth-context";
import { AUTH_MESSAGES, ROLE_HOME, type SupportedRole } from "../../lib/auth/profile";

const panelClass =
  "mt-8 rounded-[24px] border border-rb-border bg-rb-card p-6 shadow-[0_16px_34px_rgba(17,17,17,0.10)] sm:p-8";
const alertPanelClass =
  "mt-8 rounded-[24px] border border-[#e0b3a7] bg-[#fdf1ed] p-6 sm:p-8";
const primaryButtonClass =
  "rounded-lg bg-rb-brand px-6 py-3 text-center font-bold text-white transition hover:bg-rb-brand-hover active:bg-rb-brand-active disabled:cursor-wait disabled:opacity-60";
const secondaryButtonClass =
  "rounded-lg border-2 border-rb-brand px-6 py-3 text-center font-bold text-rb-ink transition hover:bg-[rgba(0,103,71,0.08)] hover:text-rb-brand disabled:cursor-wait disabled:opacity-60";

const ROLE_NAMES: Record<SupportedRole, string> = {
  admin: "admin",
  professor: "professor",
  student: "student",
};

const HOME_LABELS: Record<SupportedRole, string> = {
  admin: "Go to the admin dashboard",
  professor: "Go to My opportunities",
  student: "Browse opportunities",
};

function redirectTarget(state: AuthState, role: SupportedRole): string | null {
  if (state.status === "signed-out" && !state.endedByUser) return "/sign-in";
  if (state.status === "signed-in" && state.role !== role) return ROLE_HOME[state.role];
  return null;
}

function StatusPanel({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section role="status" className={panelClass}>
      <h2 className="font-serif text-2xl font-bold tracking-tight text-rb-ink">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Frontend UX guard for role-specific pages. It never renders `children`
 * until the profile role matches. Supabase RLS and the admin functions still
 * authorize every read and write; this only keeps the wrong users off a page.
 */
export function RoleGate({ role, children }: { role: SupportedRole; children: ReactNode }) {
  const { state, retry, signOut, isSigningOut } = useAuth();
  const router = useRouter();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const target = redirectTarget(state, role);
  const roleName = ROLE_NAMES[role];

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  async function handleSignOut() {
    setSignOutError(null);
    const result = await signOut();
    if (!result.ok) setSignOutError(result.message);
  }

  if (state.status === "signed-in" && state.role === role) return <>{children}</>;

  switch (state.status) {
    case "loading":
      return (
        <StatusPanel title={`Checking your ${roleName} access…`}>
          <p className="mt-2 text-[15px] leading-6 text-rb-muted">
            Confirming your account before showing this page.
          </p>
        </StatusPanel>
      );

    case "signed-out":
      return state.endedByUser ? (
        <StatusPanel title="You are signed out">
          <p className="mt-2 text-[15px] leading-6 text-rb-muted">Returning to the homepage…</p>
        </StatusPanel>
      ) : (
        <StatusPanel title="Sign in to continue">
          <p className="mt-2 text-[15px] leading-6 text-rb-muted">
            This page is for signed-in {roleName} accounts. Taking you to sign in…
          </p>
          <Link href="/sign-in" className={`mt-5 inline-flex ${primaryButtonClass}`}>
            Go to sign in
          </Link>
        </StatusPanel>
      );

    case "signed-in":
      return (
        <StatusPanel title={`This page is for ${roleName} accounts`}>
          <p className="mt-2 text-[15px] leading-6 text-rb-muted">
            You are signed in as a {ROLE_NAMES[state.role]}. Taking you to your home page…
          </p>
          <Link href={ROLE_HOME[state.role]} className={`mt-5 inline-flex ${primaryButtonClass}`}>
            {HOME_LABELS[state.role]}
          </Link>
        </StatusPanel>
      );

    default: {
      const message =
        state.status === "profile-missing"
          ? AUTH_MESSAGES.missingProfile
          : state.status === "unsupported-role"
            ? AUTH_MESSAGES.unsupportedRole(state.role)
            : state.message;
      const canSignOut = state.status !== "error" || state.hasSession;
      const canRetry = state.status !== "unsupported-role";

      return (
        <section role="alert" className={alertPanelClass}>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-[#8f2d1c]">
            {state.status === "unsupported-role" || state.status === "profile-missing"
              ? "Access is not set up for this account"
              : "We could not check your access"}
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] font-semibold leading-6 text-[#8f2d1c]">
            {message}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {canRetry ? (
              <button type="button" onClick={retry} className={primaryButtonClass}>
                Try again
              </button>
            ) : null}
            {canSignOut ? (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={isSigningOut}
                className={secondaryButtonClass}
              >
                {isSigningOut ? "Signing out…" : "Sign out"}
              </button>
            ) : null}
          </div>
          {signOutError ? (
            <p className="mt-4 text-[13px] font-semibold leading-5 text-[#8f2d1c]">
              {signOutError}
            </p>
          ) : null}
        </section>
      );
    }
  }
}
