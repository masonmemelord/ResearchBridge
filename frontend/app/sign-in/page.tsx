"use client";

import {
  isAuthApiError,
  isAuthRetryableFetchError,
  type AuthError,
  type SupabaseClient,
} from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthShell, authStyles } from "../../components/auth/AuthShell";
import { ResendConfirmation } from "../../components/auth/ResendConfirmation";
import { AUTH_MESSAGES, ROLE_HOME, fetchProfileRole } from "../../lib/auth/profile";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import { publicSignupEnabled } from "../../lib/release";

function signInErrorMessage(error: AuthError): string {
  if (isAuthRetryableFetchError(error)) {
    return "We could not reach the sign-in service. Check your internet connection and try again.";
  }
  if (error.code === "email_not_confirmed") {
    return "This email address has not been verified yet. Enter the code sent to your inbox, or request a new code below.";
  }
  if (error.code === "over_request_rate_limit" || (isAuthApiError(error) && error.status === 429)) {
    return "Too many sign-in attempts. Wait a minute, then try again.";
  }
  if (error.code === "invalid_credentials" || (isAuthApiError(error) && error.status === 400)) {
    return "The email or password was not accepted. Check both fields and try again.";
  }
  return "Sign-in did not complete. Try again, and contact the ResearchBridge team if it keeps happening.";
}

/**
 * Removes an incomplete session from this browser. Local scope clears stored
 * tokens even when Supabase cannot be reached.
 */
async function discardSession(supabase: SupabaseClient) {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (signOutError) {
    console.error("Could not clear the incomplete session", signOutError);
  }
}

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Email that Supabase reported as unconfirmed, to offer a new code. */
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setUnconfirmedEmail(null);
    setIsSubmitting(true);
    let redirecting = false;

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !data.user) {
        if (signInError) console.warn("Supabase sign-in was rejected", signInError.code);
        if (signInError?.code === "email_not_confirmed") setUnconfirmedEmail(email.trim());
        setError(
          signInError
            ? signInErrorMessage(signInError)
            : "Sign-in did not complete. Try again, and contact the ResearchBridge team if it keeps happening.",
        );
        return;
      }

      // The destination comes only from the user's own profiles row, never from input.
      const profile = await fetchProfileRole(supabase, data.user.id);
      if (profile.kind === "role") {
        redirecting = true;
        router.replace(ROLE_HOME[profile.role]);
        return;
      }

      await discardSession(supabase);
      if (profile.kind === "error") console.error("Profile lookup failed", profile.error);
      setError(
        profile.kind === "missing"
          ? AUTH_MESSAGES.missingProfile
          : profile.kind === "unsupported-role"
            ? AUTH_MESSAGES.unsupportedRole(profile.role)
            : AUTH_MESSAGES.profileUnavailable,
      );
    } catch (configurationError) {
      console.error("Supabase sign-in is not configured", configurationError);
      setError(AUTH_MESSAGES.notConfigured);
    } finally {
      // Stay busy while navigating so the form cannot be submitted twice.
      if (!redirecting) setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      caption="Secure sign in"
      footer={
        <>
          Need an account?{" "}
          <Link href={publicSignupEnabled() ? "/sign-up" : "/access"} className={authStyles.textLink}>
            {publicSignupEnabled() ? "Create an account" : "Request an invitation"}
          </Link>
          <span className="mt-1 block text-xs leading-5">
            Pilot accounts are set up by the ResearchBridge team.
          </span>
        </>
      }
    >
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-rb-brand">Welcome back</p>
      <h1 className="mt-3 font-serif text-4xl font-black tracking-tight text-rb-ink">Sign in</h1>
      <p className="mt-3 text-sm leading-6 text-rb-muted">
        Use the account connected to your ResearchBridge profile. Professor accounts can
        publish opportunities; student accounts can browse published work.
      </p>

      <form onSubmit={handleSubmit} aria-busy={isSubmitting} className="mt-7 space-y-5">
        <div>
          <label htmlFor="email" className={authStyles.label}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={authStyles.input}
          />
        </div>

        <div>
          <label htmlFor="password" className={authStyles.label}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={authStyles.input}
          />
        </div>

        {error ? (
          <p role="alert" className={authStyles.alert}>
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={isSubmitting} className={authStyles.primaryButton}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {unconfirmedEmail ? (
        <div className="mt-6 border-t border-rb-border pt-6">
          <Link href="/verify-email" className={`mb-5 inline-block ${authStyles.textLink}`}>
            Enter verification code
          </Link>
          <ResendConfirmation key={unconfirmedEmail} email={unconfirmedEmail} />
        </div>
      ) : null}
    </AuthShell>
  );
}
