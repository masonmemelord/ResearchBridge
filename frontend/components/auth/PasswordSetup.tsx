"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ROLE_HOME } from "../../lib/auth/profile";
import { finishPasswordSetup } from "../../lib/auth/password-setup";
import { NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH, passwordError } from "../../lib/auth/signup";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import { AuthShell, authStyles } from "./AuthShell";

export function PasswordSetup({ userId, email, initialPassword = "", initialName }: {
  userId: string; email: string; initialPassword?: string; initialName?: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState(initialPassword);
  const [confirmation, setConfirmation] = useState(initialPassword);
  const [name, setName] = useState(initialName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    const invalid = passwordError(password, confirmation);
    if (invalid) { setError(invalid); return; }
    saving.current = true;
    setBusy(true);
    setError(null);
    let complete = false;
    try {
      const result = await finishPasswordSetup(getSupabaseBrowserClient(), userId, password, initialName === undefined ? undefined : name);
      if (!result.ok) { setError(result.message); return; }
      complete = true;
      setPassword(""); setConfirmation("");
      router.replace(ROLE_HOME[result.role]);
    } catch {
      setError("Setup could not finish. Check your connection and try again.");
    } finally {
      if (!complete) { saving.current = false; setBusy(false); }
    }
  }

  return <AuthShell caption="Finish account setup" footer={<Link href="/reset-password" className={authStyles.textLink}>Forgot password or lost your session?</Link>}>
    <h1 className="font-serif text-3xl font-black tracking-tight text-rb-ink">Set your password</h1>
    <p className="mt-3 text-sm leading-6 text-rb-muted">Your email is verified. Finish setting up <strong className="break-all">{email}</strong>.</p>
    <form onSubmit={submit} noValidate aria-busy={busy} className="mt-7 space-y-5">
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        {initialName !== undefined ? <div>
          <label htmlFor="setup-name" className={authStyles.label}>Full name</label>
          <input id="setup-name" autoComplete="name" maxLength={NAME_MAX_LENGTH} value={name} onChange={event => setName(event.target.value)} className={authStyles.input} required />
        </div> : null}
        <div>
          <label htmlFor="setup-password" className={authStyles.label}>New password</label>
          <input id="setup-password" type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} value={password} onChange={event => setPassword(event.target.value)} className={authStyles.input} required />
          <p className={authStyles.hint}>Use at least {PASSWORD_MIN_LENGTH} characters.</p>
        </div>
        <div>
          <label htmlFor="setup-confirmation" className={authStyles.label}>Confirm password</label>
          <input id="setup-confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} className={authStyles.input} required />
        </div>
        {error ? <p role="alert" className={authStyles.alert}>{error}</p> : null}
        <button className={authStyles.primaryButton} type="submit" disabled={busy}>{busy ? "Saving…" : "Set password and continue"}</button>
      </fieldset>
    </form>
  </AuthShell>;
}
