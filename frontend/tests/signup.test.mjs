import test from "node:test";
import assert from "node:assert/strict";
import {
  authCallbackUrl,
  confirmationLinkErrorMessage,
  isSignupCode,
  normalizeFullName,
  parseConfirmationLinkError,
  resendErrorMessage,
  signUpErrorMessage,
  signupCodeErrorMessage,
  validateSignUp,
} from "../lib/auth/signup.ts";

const valid = { fullName: "Ada Lovelace", email: "ada@example.edu", password: "correct horse", confirmPassword: "correct horse" };

test("accepts a complete, valid sign-up form", () => {
  assert.deepEqual(validateSignUp(valid), {});
});

test("requires exactly six decimal digits before asking Supabase to verify", () => {
  assert.equal(isSignupCode("024681"), true);
  for (const code of ["12345", "1234567", "123 456", "12abcd", "", "１２３４５６"]) {
    assert.equal(isSignupCode(code), false, code);
  }
});

test("code verification errors never expose Supabase's raw response", () => {
  assert.match(signupCodeErrorMessage({ code: "otp_expired", status: 403, message: "sensitive detail" }), /expired/);
  assert.match(signupCodeErrorMessage({ code: "over_request_rate_limit", status: 429, message: "sensitive detail" }), /Too many/);
  assert.doesNotMatch(signupCodeErrorMessage({ code: "unexpected_failure", status: 500, message: "sensitive detail" }), /sensitive detail/);
});

test("requires every field", () => {
  const errors = validateSignUp({ fullName: "  ", email: "", password: "", confirmPassword: "" });
  assert.deepEqual(Object.keys(errors), ["fullName", "email", "password", "confirmPassword"]);
});

test("rejects malformed email addresses", () => {
  for (const email of ["ada", "ada@", "ada@example", "a da@example.edu", `${"a".repeat(250)}@x.io`]) {
    assert.ok(validateSignUp({ ...valid, email }).email, email);
  }
  assert.equal(validateSignUp({ ...valid, email: "  ada@example.edu  " }).email, undefined, "surrounding spaces are trimmed");
});

test("enforces password length in characters and bcrypt bytes", () => {
  assert.match(validateSignUp({ ...valid, password: "short", confirmPassword: "short" }).password, /at least 8/);
  const tooLong = "é".repeat(40); // 40 characters but 80 UTF-8 bytes
  assert.match(validateSignUp({ ...valid, password: tooLong, confirmPassword: tooLong }).password, /shorter/);
});

test("requires matching passwords", () => {
  assert.equal(validateSignUp({ ...valid, confirmPassword: "different" }).confirmPassword, "The passwords do not match.");
});

test("caps and normalizes names", () => {
  assert.equal(normalizeFullName("  Ada \t  Lovelace \n"), "Ada Lovelace");
  assert.ok(validateSignUp({ ...valid, fullName: "x".repeat(121) }).fullName);
});

test("builds the callback URL on the current origin", () => {
  assert.equal(authCallbackUrl("http://127.0.0.1:3000"), "http://127.0.0.1:3000/auth/callback");
  assert.equal(authCallbackUrl("https://researchbridge.example/"), "https://researchbridge.example/auth/callback");
});

test("maps Supabase sign-up errors to field-specific, recoverable messages", () => {
  assert.equal(signUpErrorMessage({ code: "user_already_exists", status: 422, message: "" }).field, "email");
  assert.equal(signUpErrorMessage({ code: "weak_password", status: 422, message: "" }).field, "password");
  assert.match(signUpErrorMessage({ code: "over_email_send_rate_limit", status: 429, message: "" }).message, /Too many/);
  assert.match(signUpErrorMessage({ code: undefined, status: 429, message: "" }).message, /Too many/);
  assert.match(signUpErrorMessage({ name: "AuthRetryableFetchError", code: undefined, status: 0, message: "" }).message, /internet/);
  assert.match(signUpErrorMessage({ code: "signup_disabled", status: 422, message: "" }).message, /not being accepted/);
  const fallback = signUpErrorMessage({ code: "unexpected_failure", status: 500, message: "internal detail" });
  assert.equal(fallback.field, undefined);
  assert.doesNotMatch(fallback.message, /internal detail/, "raw server messages are never shown");
});

test("maps resend errors without revealing whether an account exists", () => {
  assert.match(resendErrorMessage({ code: "over_email_send_rate_limit", status: 429, message: "" }), /sent to this address recently/);
  assert.match(resendErrorMessage({ code: "over_request_rate_limit", status: 429, message: "" }), /Too many requests/);
  assert.match(resendErrorMessage({ code: "unexpected_failure", status: 500, message: "" }), /could not send/);
});

test("reads confirmation-link errors from the hash or query string", () => {
  const hash = "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";
  assert.deepEqual(parseConfirmationLinkError(hash, ""), { code: "otp_expired", description: "Email link is invalid or has expired" });
  assert.deepEqual(parseConfirmationLinkError("", "?error=access_denied"), { code: "access_denied", description: "" });
  assert.equal(parseConfirmationLinkError("#access_token=abc&refresh_token=def", ""), null);
  assert.equal(parseConfirmationLinkError("", ""), null);
  assert.match(confirmationLinkErrorMessage({ code: "otp_expired", description: "" }), /expired/);
});
