"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell, authStyles } from "../../../components/auth/AuthShell";
import { ResendConfirmation } from "../../../components/auth/ResendConfirmation";
import { useAuth } from "../../../lib/auth/auth-context";
import { publicSignupEnabled } from "../../../lib/release";
import { AUTH_MESSAGES, ROLE_HOME } from "../../../lib/auth/profile";
import {
  confirmationLinkErrorMessage,
  parseConfirmationLinkError,
  type ConfirmationLinkError,
} from "../../../lib/auth/signup";

/** `undefined` until the URL has been read in the browser. */
type LinkState = ConfirmationLinkError | null | undefined;

/**
 * Landing page for sign-up confirmation links. With the implicit flow,
 * supabase-js reads the tokens from the URL hash and signs the user in;
 * AuthProvider then resolves their profile and this page routes by role.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { state, retry, signOut, isSigningOut } = useAuth();
  const [linkError, setLinkError] = useState<LinkState>(undefined);

  useEffect(() => {
    // Child effects run before AuthProvider's, so the URL is still intact.
    // Supabase leaves error parameters in place, so this is safe either way.
    const parsed = parseConfirmationLinkError(window.location.hash, window.location.search);
    void Promise.resolve().then(() => setLinkError(parsed));
  }, []);

  const destination = state.status === "signed-in" ? ROLE_HOME[state.role] : null;

  useEffect(() => {
    if (destination) router.replace(destination);
  }, [destination, router]);

  if (destination) {
    return (
      <AuthShell caption="Email confirmation">
        <h1 className="font-serif text-3xl font-black tracking-tight text-rb-ink">You are signed in</h1>
        <p role="status" className="mt-3 text-sm leading-6 text-rb-muted">
          Your email is confirmed. Taking you to your ResearchBridge workspace…
        </p>
      </AuthShell>
    );
  }

  if (state.status === "loading" || linkError === undefined) {
    return (
      <AuthShell caption="Email confirmation">
        <h1 className="font-serif text-3xl font-black tracking-tight text-rb-ink">
          Confirming your email…
        </h1>
        <p role="status" className="mt-3 text-sm leading-6 text-rb-muted">
          This usually takes a moment.
        </p>
      </AuthShell>
    );
  }

  if (state.status === "signed-out") {
    return (
      <AuthShell
        caption="Email confirmation"
        footer={
          publicSignupEnabled() ? (
            <>
              Need an account?{" "}
              <Link href="/sign-up" className={authStyles.textLink}>
                Create one
              </Link>
            </>
          ) : undefined
        }
      >
        <h1 className="font-serif text-3xl font-black tracking-tight text-rb-ink">
          {linkError ? "This link did not work" : "Sign in to continue"}
        </h1>
        <p role={linkError ? "alert" : undefined} className="mt-3 text-sm leading-6 text-rb-muted">
          {linkError
            ? confirmationLinkErrorMessage(linkError)
            : "We could not find a confirmation in this link. If you already confirmed your email, sign in. Otherwise, request a new link below."}
        </p>
        <Link href="/sign-in" className={`mt-7 block text-center ${authStyles.primaryButton}`}>
          Go to sign in
        </Link>
        <Link href="/verify-email" className={`mt-5 block text-center ${authStyles.textLink}`}>
          Have a verification code? Enter it here
        </Link>
        <div className="mt-7 border-t border-rb-border pt-6">
          <ResendConfirmation askForEmail />
        </div>
      </AuthShell>
    );
  }

  // Signed in but the profile could not be used, or the session check failed.
  const message =
    state.status === "profile-missing"
      ? AUTH_MESSAGES.missingProfile
      : state.status === "unsupported-role"
        ? AUTH_MESSAGES.unsupportedRole(state.role)
        : state.status === "error"
          ? state.message
          : AUTH_MESSAGES.profileUnavailable;

  return (
    <AuthShell caption="Email confirmation">
      <h1 className="font-serif text-3xl font-black tracking-tight text-rb-ink">
        Your account is not ready yet
      </h1>
      <p role="alert" className={`mt-4 ${authStyles.alert}`}>
        {message}
      </p>
      <div className="mt-7 space-y-3">
        {state.status !== "unsupported-role" ? (
          <button type="button" onClick={retry} className={authStyles.primaryButton}>
            Try again
          </button>
        ) : null}
        {state.status !== "error" || state.hasSession ? (
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={isSigningOut}
            className={authStyles.secondaryButton}
          >
            {isSigningOut ? "Signing out…" : "Sign out"}
          </button>
        ) : null}
      </div>
    </AuthShell>
  );
}
