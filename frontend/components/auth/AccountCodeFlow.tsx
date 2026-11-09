"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { authCallbackUrl, isPlausibleEmail, isSignupCode, normalizeEmail, RESEND_COOLDOWN_SECONDS, resendErrorMessage, signupCodeErrorMessage } from "../../lib/auth/signup";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import { AuthShell, authStyles } from "./AuthShell";
import { PasswordSetup } from "./PasswordSetup";
import { ResendConfirmation } from "./ResendConfirmation";

export function AccountCodeFlow({ mode }: { mode: "email" | "recovery" | "invite" }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [requested, setRequested] = useState(false);
  const [verified, setVerified] = useState<{ id: string; email: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const pending = useRef(false);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function requestCode() {
    if (pending.current || cooldown > 0) return;
    const address = normalizeEmail(email);
    if (!isPlausibleEmail(address)) { setError("Enter a valid email address."); return; }
    pending.current = true; setBusy(true); setError(null);
    try {
      const result = await getSupabaseBrowserClient().auth.resetPasswordForEmail(address, {
        redirectTo: authCallbackUrl(window.location.origin),
      });
      if (result.error && result.error.code !== "user_not_found") { setError(resendErrorMessage(result.error)); return; }
      setEmail(address); setCode(""); setRequested(true); setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch { setError("We could not reach the email service. Check your connection and retry."); }
    finally { pending.current = false; setBusy(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    if (mode === "recovery" && !requested) { await requestCode(); return; }
    const address = normalizeEmail(email);
    if (!isPlausibleEmail(address)) { setError("Enter the email address that received the code."); return; }
    if (!isSignupCode(code)) { setError("Enter the six-digit code from your email."); return; }
    pending.current = true; setBusy(true); setError(null);
    try {
      const result = await getSupabaseBrowserClient().auth.verifyOtp({ email: address, token: code, type: mode });
      if (result.error) { setError(signupCodeErrorMessage(result.error)); return; }
      if (!result.data.session?.user) { setError("Verification did not return a session. Request a new code and try again."); return; }
      setCode("");
      setVerified({ id: result.data.session.user.id, email: result.data.session.user.email ?? address });
    } catch { setError("We could not verify the code. Check your connection and retry."); }
    finally { pending.current = false; setBusy(false); }
  }

  if (verified) return <PasswordSetup userId={verified.id} email={verified.email} initialName={mode === "email" ? "" : undefined} />;
  const asking = mode === "recovery" && !requested;
  const title = mode === "recovery" ? "Reset your password" : mode === "invite" ? "Accept your invitation" : "Verify your email";
  return <AuthShell caption={title} footer={<Link href="/sign-in" className={authStyles.textLink}>Back to sign in</Link>}>
    <h1 className="font-serif text-3xl font-black tracking-tight text-rb-ink">{title}</h1>
    <p className="mt-3 text-sm leading-6 text-rb-muted">{asking
      ? "Enter your account email. We will send a code so you can choose a new password."
      : mode === "recovery" ? "If this address has an account, a recovery code is on its way. Check your inbox and spam folder."
      : "Enter the six-digit code sent to your own inbox. After verification, you will set your password."}</p>
    <form onSubmit={verify} noValidate aria-busy={busy} className="mt-7 space-y-5">
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <div>
          <label htmlFor="code-email" className={authStyles.label}>Email</label>
          <input id="code-email" type="email" autoComplete="email" value={email} readOnly={mode === "recovery" && requested} onChange={event => setEmail(event.target.value)} className={authStyles.input} required />
        </div>
        {!asking ? <div>
          <label htmlFor="account-code" className={authStyles.label}>Verification code</label>
          <input id="account-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className={authStyles.input} required />
        </div> : null}
        {error ? <p role="alert" className={authStyles.alert}>{error}</p> : null}
        <button type="submit" disabled={busy} className={authStyles.primaryButton}>{busy ? "Working…" : asking ? "Send recovery code" : "Verify code"}</button>
      </fieldset>
    </form>
    {mode === "email" ? <div className="mt-7"><ResendConfirmation email={email} /></div> : null}
    {mode === "recovery" && requested ? <div className="mt-5 space-y-4">
      <button type="button" disabled={busy || cooldown > 0} onClick={() => void requestCode()} className={authStyles.secondaryButton}>{cooldown > 0 ? `Send another code in ${cooldown}s` : "Send another code"}</button>
      <button type="button" disabled={busy} onClick={() => { setRequested(false); setCode(""); setError(null); }} className={authStyles.textLink}>Use a different email</button>
    </div> : null}
    {mode === "invite" ? <p className="mt-5 text-sm text-rb-muted">Need another invitation? Contact the team that invited you.</p> : null}
  </AuthShell>;
}
