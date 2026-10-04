"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { AUTH_MESSAGES } from "../../lib/auth/profile";
import {
  RESEND_COOLDOWN_SECONDS,
  authCallbackUrl,
  isPlausibleEmail,
  normalizeEmail,
  resendErrorMessage,
} from "../../lib/auth/signup";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import { authStyles } from "./AuthShell";

type ResendConfirmationProps = {
  /** Pre-filled address, such as the one just used to sign up. */
  email?: string;
  /** Show an editable email field. When false, `email` is required. */
  askForEmail?: boolean;
  /**
   * Seconds to wait before the first resend. Use this right after an email
   * was sent, because Supabase rejects repeat sends inside its cooldown
   * (60 seconds by default on hosted projects).
   */
  initialCooldown?: number;
  onSent?: () => void;
};

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

/**
 * Requests a fresh sign-up confirmation email. Messages never reveal whether
 * an account exists for the address.
 */
export function ResendConfirmation({
  email = "",
  askForEmail = false,
  initialCooldown = 0,
  onSent,
}: ResendConfirmationProps) {
  const inputId = useId();
  const [address, setAddress] = useState(email);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [cooldown, setCooldown] = useState(initialCooldown);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = normalizeEmail(askForEmail ? address : email);
    if (!isPlausibleEmail(target)) {
      setStatus({ kind: "error", message: "Enter the email address you signed up with." });
      return;
    }

    setStatus({ kind: "sending" });
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: target,
        options: { emailRedirectTo: authCallbackUrl(window.location.origin) },
      });
      if (error) {
        console.warn("Confirmation email resend was rejected", error.code);
        setStatus({ kind: "error", message: resendErrorMessage(error) });
        return;
      }
      setStatus({ kind: "sent", email: target });
      setCooldown(RESEND_COOLDOWN_SECONDS);
      onSent?.();
    } catch (configurationError) {
      console.error("Supabase is not configured", configurationError);
      setStatus({ kind: "error", message: AUTH_MESSAGES.notConfigured });
    }
  }

  const busy = status.kind === "sending";
  const waiting = cooldown > 0;

  return (
    <form onSubmit={handleSubmit} aria-busy={busy} className="space-y-3" noValidate>
      {askForEmail ? (
        <div>
          <label htmlFor={inputId} className={authStyles.label}>
            Email used to sign up
          </label>
          <input
            id={inputId}
            type="email"
            autoComplete="email"
            required
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className={authStyles.input}
          />
        </div>
      ) : null}

      <button type="submit" disabled={busy || waiting} className={authStyles.secondaryButton}>
        {busy
          ? "Sending…"
          : waiting
            ? `Send another link in ${cooldown}s`
            : "Send another code"}
      </button>

      <div aria-live="polite">
        {status.kind === "sent" ? (
          <p className={authStyles.success}>
            If {status.email} has an unconfirmed ResearchBridge account, a new verification code is on
            its way. Check your spam folder too.
          </p>
        ) : null}
        {status.kind === "error" ? (
          <p role="alert" className={authStyles.alert}>
            {status.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
