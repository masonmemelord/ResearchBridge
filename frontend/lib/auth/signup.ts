import type { AuthError } from "@supabase/supabase-js";

/**
 * Pure helpers for student self-signup. Kept free of React and network calls
 * so they can be unit tested. Supabase Auth and Postgres re-validate
 * everything; these checks only give faster, clearer feedback.
 */

export const NAME_MAX_LENGTH = 120;
export const EMAIL_MAX_LENGTH = 254;
/** Matches `minimum_password_length` in backend/supabase/config.toml. */
export const PASSWORD_MIN_LENGTH = 8;
/** Supabase Auth hashes with bcrypt, which rejects passwords over 72 bytes. */
export const PASSWORD_MAX_BYTES = 72;
/** Client-side pause between confirmation emails, so users cannot spam resend. */
export const RESEND_COOLDOWN_SECONDS = 60;
export const SIGNUP_CODE_LENGTH = 6;
export const AUTH_CALLBACK_PATH = "/auth/callback";

export type SignUpFields = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type SignUpFieldErrors = Partial<Record<keyof SignUpFields, string>>;

export function normalizeFullName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeEmail(value: string): string {
  return value.trim();
}

export function isSignupCode(value: string): boolean {
  return /^\d{6}$/.test(value);
}

// Deliberately loose: one "@", no spaces, and a dot in the domain. Supabase
// performs the authoritative check and the confirmation email proves ownership.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isPlausibleEmail(value: string): boolean {
  return value.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(value);
}

/** Returns one message per invalid field, in form order. Empty when valid. */
export function validateSignUp(fields: SignUpFields): SignUpFieldErrors {
  const errors: SignUpFieldErrors = {};
  const name = normalizeFullName(fields.fullName);
  const email = normalizeEmail(fields.email);

  if (!name) errors.fullName = "Enter your full name.";
  else if (name.length > NAME_MAX_LENGTH)
    errors.fullName = `Use ${NAME_MAX_LENGTH} characters or fewer.`;

  if (!email) errors.email = "Enter your email address.";
  else if (!isPlausibleEmail(email))
    errors.email = "Enter a valid email address, like name@university.edu.";

  if (!fields.password) errors.password = "Create a password.";
  else if (fields.password.length < PASSWORD_MIN_LENGTH)
    errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  else if (new TextEncoder().encode(fields.password).length > PASSWORD_MAX_BYTES)
    errors.password = "Use a shorter password. The limit is about 72 characters.";

  if (!fields.confirmPassword) errors.confirmPassword = "Re-enter your password.";
  else if (fields.password && fields.confirmPassword !== fields.password)
    errors.confirmPassword = "The passwords do not match.";

  return errors;
}

/** Where confirmation links send people back to. Must be on the Supabase redirect allow-list. */
export function authCallbackUrl(origin: string): string {
  return new URL(AUTH_CALLBACK_PATH, origin).toString();
}

type AuthErrorLike = Pick<AuthError, "code" | "status" | "message"> & { name?: string };

const RATE_LIMIT_CODES = new Set([
  "over_request_rate_limit",
  "over_email_send_rate_limit",
]);

function isNetworkError(error: AuthErrorLike): boolean {
  return error.name === "AuthRetryableFetchError" || error.status === 0;
}

export type SignUpErrorResult = {
  message: string;
  /** Field to attach the message to, when the error is about one input. */
  field?: keyof SignUpFields;
};

export function signUpErrorMessage(error: AuthErrorLike): SignUpErrorResult {
  if (isNetworkError(error)) {
    return { message: "We could not reach the sign-up service. Check your internet connection and try again." };
  }
  switch (error.code) {
    case "user_already_exists":
    case "email_exists":
      return {
        field: "email",
        message: "An account already uses this email. Sign in instead, or use a different email.",
      };
    case "weak_password":
      return {
        field: "password",
        message: "Choose a stronger password. Avoid common or previously leaked passwords and mix letters with numbers or symbols.",
      };
    case "email_address_invalid":
      return { field: "email", message: "This email address cannot be used. Check it, or try a different one." };
    case "email_address_not_authorized":
      return {
        message: "We cannot send email to this address yet. Contact the ResearchBridge team so they can finish email setup.",
      };
    case "signup_disabled":
    case "email_provider_disabled":
      return { message: "New accounts are not being accepted right now. Contact the ResearchBridge team." };
  }
  if ((error.code && RATE_LIMIT_CODES.has(error.code)) || error.status === 429) {
    return { message: "Too many attempts. Wait a few minutes, then try again." };
  }
  return { message: "Your account was not created. Try again, and contact the ResearchBridge team if it keeps happening." };
}

export function resendErrorMessage(error: AuthErrorLike): string {
  if (isNetworkError(error)) {
    return "We could not reach the email service. Check your internet connection and try again.";
  }
  if (error.code === "over_email_send_rate_limit") {
    // Used both for the per-address cooldown and the project's hourly email cap.
    return "An email was sent to this address recently. Wait a minute or two, then ask for another code.";
  }
  if ((error.code && RATE_LIMIT_CODES.has(error.code)) || error.status === 429) {
    return "Too many requests. Wait a few minutes before asking for another code.";
  }
  if (error.code === "email_address_invalid" || error.code === "validation_failed") {
    return "Enter a valid email address.";
  }
  return "We could not send a new code. Try again in a few minutes.";
}

export function signupCodeErrorMessage(error: AuthErrorLike): string {
  if (isNetworkError(error)) return "We could not reach the verification service. Check your connection and try again.";
  if ((error.code && RATE_LIMIT_CODES.has(error.code)) || error.status === 429)
    return "Too many attempts. Wait a few minutes before trying again.";
  if (error.code === "otp_expired" || error.code === "invalid_otp" || error.code === "token_expired")
    return "That code is invalid or expired. Check the latest email we sent and try again.";
  return "We could not verify that code. Check the latest email we sent or request a new code.";
}

export type ConfirmationLinkError = { code: string; description: string };

/**
 * Supabase reports failed confirmation links in the URL hash (implicit flow)
 * or query string. Returns null when the URL carries no error.
 */
export function parseConfirmationLinkError(hash: string, search: string): ConfirmationLinkError | null {
  for (const raw of [hash.replace(/^#/, ""), search.replace(/^\?/, "")]) {
    const params = new URLSearchParams(raw);
    const code = params.get("error_code") ?? params.get("error");
    const description = params.get("error_description");
    if (code || description) {
      return { code: code ?? "unknown_error", description: description ?? "" };
    }
  }
  return null;
}

export function confirmationLinkErrorMessage(error: ConfirmationLinkError): string {
  if (error.code === "otp_expired") {
    return "This confirmation link has expired or was already used. Request a new link below.";
  }
  if (error.code === "access_denied") {
    return "This confirmation link is no longer valid. Request a new link below.";
  }
  return "We could not confirm your email with this link. Request a new link below, or sign in if you already confirmed.";
}
