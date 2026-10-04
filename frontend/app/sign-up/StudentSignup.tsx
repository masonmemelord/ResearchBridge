"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AuthShell, authStyles } from "../../components/auth/AuthShell";
import { ResendConfirmation } from "../../components/auth/ResendConfirmation";
import { hasSession, useAuth } from "../../lib/auth/auth-context";
import { AUTH_MESSAGES, ROLE_HOME, fetchProfileRole } from "../../lib/auth/profile";
import {
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  SIGNUP_CODE_LENGTH,
  authCallbackUrl,
  isSignupCode,
  normalizeEmail,
  normalizeFullName,
  signUpErrorMessage,
  signupCodeErrorMessage,
  validateSignUp,
  type SignUpFieldErrors,
  type SignUpFields,
} from "../../lib/auth/signup";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

type Step =
  | { kind: "form" }
  | { kind: "verify-email"; email: string }
  | { kind: "redirecting" };

const FIELD_ORDER: (keyof SignUpFields)[] = ["fullName", "email", "password", "confirmPassword"];

const EMPTY_FIELDS: SignUpFields = { fullName: "", email: "", password: "", confirmPassword: "" };

async function discardSession(supabase: SupabaseClient) {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (signOutError) {
    console.error("Could not clear the incomplete session", signOutError);
  }
}

type FieldProps = {
  id: keyof SignUpFields;
  label: string;
  type: "text" | "email" | "password";
  autoComplete: string;
  value: string;
  error?: string;
  hint?: ReactNode;
  maxLength?: number;
  inputRef: (element: HTMLInputElement | null) => void;
  onChange: (value: string) => void;
};

function Field({ id, label, type, autoComplete, value, error, hint, maxLength, inputRef, onChange }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <label htmlFor={id} className={authStyles.label}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        name={id}
        type={type}
        required
        autoComplete={autoComplete}
        maxLength={maxLength}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        onChange={(event) => onChange(event.target.value)}
        className={authStyles.input}
      />
      {hint ? (
        <p id={hintId} className={authStyles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={authStyles.fieldError}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function SignUpPage() {
  const router = useRouter();
  const { state, signOut, isSigningOut } = useAuth();
  const [fields, setFields] = useState<SignUpFields>(EMPTY_FIELDS);
  const [fieldErrors, setFieldErrors] = useState<SignUpFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "form" });
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<Partial<Record<keyof SignUpFields, HTMLInputElement | null>>>({});
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step.kind === "verify-email") codeInputRef.current?.focus();
  }, [step.kind]);

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step.kind !== "verify-email") return;
    if (!isSignupCode(code)) {
      setCodeError(`Enter the ${SIGNUP_CODE_LENGTH}-digit code from your email.`);
      codeInputRef.current?.focus();
      return;
    }

    setIsVerifying(true);
    setCodeError(null);
    let redirecting = false;
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email: step.email,
        token: code,
        type: "email",
      });
      if (error) {
        setCodeError(signupCodeErrorMessage(error));
        return;
      }
      if (!data.session?.user) {
        setCodeError("Your email was verified. Sign in to finish opening your account.");
        return;
      }
      const profile = await fetchProfileRole(supabase, data.session.user.id);
      if (profile.kind === "role") {
        redirecting = true;
        setCode("");
        setStep({ kind: "redirecting" });
        router.replace(ROLE_HOME[profile.role]);
        return;
      }
      await discardSession(supabase);
      setCodeError(profile.kind === "missing" ? AUTH_MESSAGES.missingProfile : AUTH_MESSAGES.profileUnavailable);
    } catch {
      setCodeError("We could not verify the code. Check your connection and try again.");
    } finally {
      if (!redirecting) setIsVerifying(false);
    }
  }

  function updateField(name: keyof SignUpFields, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
    // Clear a field's error as soon as the user starts fixing it.
    if (fieldErrors[name]) setFieldErrors((current) => ({ ...current, [name]: undefined }));
  }

  function focusFirstError(errors: SignUpFieldErrors) {
    const first = FIELD_ORDER.find((name) => errors[name]);
    if (first) inputRefs.current[first]?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const errors = validateSignUp(fields);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstError(errors);
      return;
    }

    setIsSubmitting(true);
    let redirecting = false;
    const email = normalizeEmail(fields.email);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: fields.password,
        options: {
          emailRedirectTo: authCallbackUrl(window.location.origin),
          // `self_signup` tells the database trigger to create a *student*
          // profile. The role is fixed in SQL and never read from this data.
          data: { self_signup: true, full_name: normalizeFullName(fields.fullName) },
        },
      });

      if (error) {
        console.warn("Supabase sign-up was rejected", error.code);
        const result = signUpErrorMessage(error);
        if (result.field) {
          const next = { [result.field]: result.message };
          setFieldErrors(next);
          focusFirstError(next);
        } else {
          setFormError(result.message);
        }
        return;
      }

      if (!data.session) {
        // Email confirmation is required. Supabase returns the same response
        // for an address that already has an account, so the next screen
        // must not claim the account is new.
        setFields(EMPTY_FIELDS);
        setCode("");
        setStep({ kind: "verify-email", email });
        return;
      }

      // Confirmation is disabled for this project, so the user is already
      // signed in. The database trigger created their profile with the user.
      const profile = await fetchProfileRole(supabase, data.session.user.id);
      if (profile.kind === "role") {
        redirecting = true;
        setStep({ kind: "redirecting" });
        router.replace(ROLE_HOME[profile.role]);
        return;
      }

      await discardSession(supabase);
      if (profile.kind === "error") console.error("Profile lookup failed", profile.error);
      setFormError(
        profile.kind === "missing" ? AUTH_MESSAGES.missingProfile : AUTH_MESSAGES.profileUnavailable,
      );
    } catch (configurationError) {
      console.error("Supabase sign-up is not configured", configurationError);
      setFormError(AUTH_MESSAGES.notConfigured);
    } finally {
      if (!redirecting) setIsSubmitting(false);
    }
  }

  const signInFooter = (
    <>
      Already have an account?{" "}
      <Link href="/sign-in" className={authStyles.textLink}>
        Sign in
      </Link>
    </>
  );

  if (step.kind === "redirecting") {
    return (
      <AuthShell caption="Create your account">
        <h1 className="font-serif text-3xl font-black tracking-tight text-rb-ink">Account created</h1>
        <p role="status" className="mt-3 text-sm leading-6 text-rb-muted">
          Taking you to published opportunities…
        </p>
      </AuthShell>
    );
  }

  if (step.kind === "verify-email") {
    return (
      <AuthShell caption="Create your account" footer={signInFooter}>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-rb-brand">One more step</p>
        <h1 className="mt-3 font-serif text-4xl font-black tracking-tight text-rb-ink">Check your email</h1>
        <p className="mt-3 text-sm leading-6 text-rb-muted">
          Enter the six-digit code sent to <strong className="break-all text-rb-ink">{step.email}</strong>.
          The code expires in one hour.
        </p>
        <p className="mt-3 text-sm leading-6 text-rb-muted">
          Not in your inbox? Check your spam folder, or request another code when the timer ends.
        </p>

        <form onSubmit={handleVerifyCode} noValidate aria-busy={isVerifying} className="mt-7 space-y-4">
          <div>
            <label htmlFor="verification-code" className={authStyles.label}>Verification code</label>
            <input
              ref={codeInputRef}
              id="verification-code"
              name="verification-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={SIGNUP_CODE_LENGTH}
              value={code}
              onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, SIGNUP_CODE_LENGTH)); setCodeError(null); }}
              aria-invalid={codeError ? true : undefined}
              aria-describedby={codeError ? "verification-code-error" : undefined}
              className={authStyles.input}
            />
            {codeError ? <p id="verification-code-error" role="alert" className={authStyles.fieldError}>{codeError}</p> : null}
          </div>
          <button type="submit" disabled={isVerifying} className={authStyles.primaryButton}>
            {isVerifying ? "Verifying…" : "Verify email"}
          </button>
        </form>

        <div className="mt-7">
          <ResendConfirmation
            email={step.email}
            initialCooldown={RESEND_COOLDOWN_SECONDS}
            onSent={() => { setCode(""); setCodeError(null); }}
          />
        </div>

        <button
          type="button"
          onClick={() => { setCode(""); setCodeError(null); setStep({ kind: "form" }); }}
          className={`mt-5 block w-full rounded text-center text-sm ${authStyles.textLink}`}
        >
          Use a different email
        </button>
      </AuthShell>
    );
  }

  // While a submission is in flight the new session appears before the
  // redirect, so do not flash the "already signed in" panel.
  if (hasSession(state) && !isSubmitting && !isVerifying) {
    const home = state.status === "signed-in" ? ROLE_HOME[state.role] : "/";
    return (
      <AuthShell caption="Create your account">
        <h1 className="font-serif text-3xl font-black tracking-tight text-rb-ink">
          You are already signed in
        </h1>
        <p className="mt-3 text-sm leading-6 text-rb-muted">
          {"email" in state && state.email ? (
            <>
              You are signed in as <strong className="text-rb-ink">{state.email}</strong>.{" "}
            </>
          ) : null}
          Sign out first if you want to create a different account.
        </p>
        <div className="mt-7 space-y-3">
          <Link href={home} className={`block text-center ${authStyles.primaryButton}`}>
            Continue
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={isSigningOut}
            className={authStyles.secondaryButton}
          >
            {isSigningOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </AuthShell>
    );
  }

  const errorCount = Object.values(fieldErrors).filter(Boolean).length;

  return (
    <AuthShell caption="Create your account" footer={signInFooter}>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-rb-brand">For students</p>
      <h1 className="mt-3 font-serif text-4xl font-black tracking-tight text-rb-ink">
        Create an account
      </h1>
      <p className="mt-3 text-sm leading-6 text-rb-muted">
        Browse published research opportunities from faculty. Professor accounts are set up by the
        ResearchBridge team, so professors should{" "}
        <Link href="/sign-in" className={authStyles.textLink}>
          sign in
        </Link>{" "}
        with the details they received.
      </p>

      <form onSubmit={handleSubmit} aria-busy={isSubmitting} noValidate className="mt-7 space-y-5">
        <p className="sr-only" aria-live="polite">
          {errorCount > 0 ? `${errorCount} field${errorCount === 1 ? "" : "s"} need attention.` : ""}
        </p>

        <Field
          id="fullName"
          label="Full name"
          type="text"
          autoComplete="name"
          maxLength={NAME_MAX_LENGTH}
          value={fields.fullName}
          error={fieldErrors.fullName}
          inputRef={(element) => {
            inputRefs.current.fullName = element;
          }}
          onChange={(value) => updateField("fullName", value)}
        />

        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={fields.email}
          error={fieldErrors.email}
          hint="Use an inbox you can open now. We will send a six-digit verification code."
          inputRef={(element) => {
            inputRefs.current.email = element;
          }}
          onChange={(value) => updateField("email", value)}
        />

        <Field
          id="password"
          label="Password"
          type={showPasswords ? "text" : "password"}
          autoComplete="new-password"
          value={fields.password}
          error={fieldErrors.password}
          hint={`At least ${PASSWORD_MIN_LENGTH} characters. A longer passphrase is stronger.`}
          inputRef={(element) => {
            inputRefs.current.password = element;
          }}
          onChange={(value) => updateField("password", value)}
        />

        <Field
          id="confirmPassword"
          label="Confirm password"
          type={showPasswords ? "text" : "password"}
          autoComplete="new-password"
          value={fields.confirmPassword}
          error={fieldErrors.confirmPassword}
          inputRef={(element) => {
            inputRefs.current.confirmPassword = element;
          }}
          onChange={(value) => updateField("confirmPassword", value)}
        />

        <label className="flex items-center gap-2 text-sm font-semibold text-rb-ink">
          <input
            type="checkbox"
            checked={showPasswords}
            onChange={(event) => setShowPasswords(event.target.checked)}
            className="h-4 w-4 accent-[#006747]"
          />
          Show passwords
        </label>

        {formError ? (
          <p role="alert" className={authStyles.alert}>
            {formError}
          </p>
        ) : null}

        <button type="submit" disabled={isSubmitting} className={authStyles.primaryButton}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
