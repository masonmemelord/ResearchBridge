"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthShell, authStyles } from "../../components/auth/AuthShell";
import { ResendConfirmation } from "../../components/auth/ResendConfirmation";
import { AUTH_MESSAGES, ROLE_HOME, fetchProfileRole } from "../../lib/auth/profile";
import { isPlausibleEmail, isSignupCode, normalizeEmail, signupCodeErrorMessage } from "../../lib/auth/signup";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = normalizeEmail(email);
    if (!isPlausibleEmail(address)) { setError("Enter the email address that received the code."); return; }
    if (!isSignupCode(code)) { setError("Enter the six-digit code from your email."); return; }
    setError(null);
    setBusy(true);
    let redirecting = false;
    try {
      const client = getSupabaseBrowserClient();
      const response = await client.auth.verifyOtp({ email: address, token: code, type: "email" });
      if (response.error) { setError(signupCodeErrorMessage(response.error)); return; }
      if (!response.data.session?.user) { setError("Your email was verified. Sign in to continue."); return; }
      const profile = await fetchProfileRole(client, response.data.session.user.id);
      if (profile.kind === "role") {
        redirecting = true;
        setCode("");
        router.replace(ROLE_HOME[profile.role]);
        return;
      }
      await client.auth.signOut({ scope: "local" });
      setError(profile.kind === "missing" ? AUTH_MESSAGES.missingProfile : AUTH_MESSAGES.profileUnavailable);
    } catch {
      setError("We could not verify the code. Check your connection and try again.");
    } finally {
      if (!redirecting) setBusy(false);
    }
  }

  return (
    <AuthShell caption="Email verification" footer={<Link href="/sign-in" className={authStyles.textLink}>Back to sign in</Link>}>
      <h1 className="font-serif text-3xl font-black tracking-tight text-rb-ink">Verify your email</h1>
      <p className="mt-3 text-sm leading-6 text-rb-muted">Enter the six-digit code sent to your own inbox. Codes expire in one hour.</p>
      <form onSubmit={handleVerify} noValidate aria-busy={busy} className="mt-7 space-y-5">
        <div>
          <label htmlFor="verification-email" className={authStyles.label}>Email</label>
          <input id="verification-email" type="email" autoComplete="email" required value={email}
            onChange={(event) => { setEmail(event.target.value); setError(null); }} className={authStyles.input} />
        </div>
        <div>
          <label htmlFor="verification-code" className={authStyles.label}>Verification code</label>
          <input id="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code"
            maxLength={6} required value={code}
            onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }}
            className={authStyles.input} />
        </div>
        {error ? <p role="alert" className={authStyles.alert}>{error}</p> : null}
        <button type="submit" disabled={busy} className={authStyles.primaryButton}>
          {busy ? "Verifying…" : "Verify email"}
        </button>
      </form>
      <div className="mt-7 border-t border-rb-border pt-6">
        <p className="mb-3 text-sm text-rb-muted">Need a new code?</p>
        <ResendConfirmation askForEmail />
      </div>
    </AuthShell>
  );
}
