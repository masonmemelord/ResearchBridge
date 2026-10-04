"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  APPLICATION_MESSAGE_MAX,
  applicationMessageError,
  formatDate,
  submitApplication,
  withdrawApplication,
  type MyApplication,
} from "../../lib/applications/applications";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

const primaryButtonClass =
  "inline-flex justify-center rounded-lg bg-rb-brand px-4 py-3 text-sm font-bold text-white transition hover:bg-rb-brand-hover active:bg-rb-brand-active disabled:cursor-wait disabled:opacity-60";
const secondaryButtonClass =
  "inline-flex justify-center rounded-lg border-2 border-rb-brand px-4 py-2.5 text-sm font-bold text-rb-ink transition hover:bg-[rgba(0,103,71,0.08)] hover:text-rb-brand disabled:cursor-wait disabled:opacity-60";
const errorTextClass = "text-[13px] font-semibold leading-5 text-[#8f2d1c]";

type ApplyPanelProps = {
  opportunityId: string;
  opportunityTitle: string;
  studentId: string;
  /** null = not applied; undefined = still loading the student's applications. */
  application: MyApplication | null | undefined;
  onApplied: (application: MyApplication) => void;
  onWithdrawn: (opportunityId: string) => void;
};

type Mode = "idle" | "form" | "confirm-withdraw";

/**
 * Student apply/withdraw control for one opportunity card. The database
 * attaches the student's name and account email; this sends only the
 * optional message.
 */
export function ApplyPanel({
  opportunityId,
  opportunityTitle,
  studentId,
  application,
  onApplied,
  onWithdrawn,
}: ApplyPanelProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [message, setMessage] = useState("");
  const [showMessageError, setShowMessageError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const ids = useId();
  const messageId = `${ids}-message`;
  const hintId = `${ids}-hint`;
  const countId = `${ids}-count`;
  const messageErrorId = `${ids}-message-error`;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const applyButtonRef = useRef<HTMLButtonElement>(null);
  const appliedRef = useRef<HTMLParagraphElement>(null);
  const withdrawButtonRef = useRef<HTMLButtonElement>(null);
  const focusTarget = useRef<"textarea" | "apply" | "applied" | "withdraw" | null>(null);

  // Move focus after the panel re-renders into its next state.
  useEffect(() => {
    const target = focusTarget.current;
    focusTarget.current = null;
    if (target === "textarea") textareaRef.current?.focus();
    else if (target === "apply") applyButtonRef.current?.focus();
    else if (target === "applied") appliedRef.current?.focus();
    else if (target === "withdraw") withdrawButtonRef.current?.focus();
  });

  const messageError = applicationMessageError(message);
  const visibleMessageError = showMessageError ? messageError : undefined;
  const remaining = APPLICATION_MESSAGE_MAX - message.trim().length;

  async function handleSubmit() {
    setShowMessageError(true);
    setError(null);
    if (messageError) {
      textareaRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const result = await submitApplication(getSupabaseBrowserClient(), {
        opportunityId,
        studentId,
        message,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMode("idle");
      setMessage("");
      setShowMessageError(false);
      setAnnouncement(`Application sent for ${opportunityTitle}.`);
      focusTarget.current = "applied";
      onApplied(result.value);
    } catch {
      setError("Supabase is not configured for this frontend.");
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdraw() {
    if (!application) return;
    setError(null);
    setBusy(true);
    try {
      const result = await withdrawApplication(getSupabaseBrowserClient(), application.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMode("idle");
      setAnnouncement(`Application withdrawn for ${opportunityTitle}.`);
      focusTarget.current = "apply";
      onWithdrawn(opportunityId);
    } catch {
      setError("Supabase is not configured for this frontend.");
    } finally {
      setBusy(false);
    }
  }

  let body;
  if (application === undefined) {
    body = <p className="text-sm text-rb-muted">Checking your application status…</p>;
  } else if (application) {
    const appliedOn = formatDate(application.createdAt);
    body = (
      <div>
        <p
          ref={appliedRef}
          tabIndex={-1}
          className="flex items-center gap-2 text-sm font-bold text-[#006747] focus-visible:outline-none"
        >
          <span aria-hidden="true">✓</span>
          {appliedOn ? `Applied on ${appliedOn}` : "Applied"}
        </p>
        <p className="mt-1 text-sm leading-6 text-rb-muted">
          The professor can see your name, email, and message.
        </p>
        {mode === "confirm-withdraw" ? (
          <div className="mt-4 rounded-xl border border-rb-border bg-rb-surface p-4">
            <p className="text-sm font-semibold text-rb-ink">
              Withdraw your application? The professor will no longer see it.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleWithdraw()}
                disabled={busy}
                className={primaryButtonClass}
              >
                {busy ? "Withdrawing…" : "Yes, withdraw"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("idle");
                  setError(null);
                  focusTarget.current = "withdraw";
                }}
                disabled={busy}
                className={secondaryButtonClass}
              >
                Keep application
              </button>
            </div>
          </div>
        ) : (
          <button
            ref={withdrawButtonRef}
            type="button"
            onClick={() => {
              setMode("confirm-withdraw");
              setError(null);
            }}
            className="mt-3 rounded text-sm font-semibold text-rb-brand underline underline-offset-2 hover:text-rb-brand-hover"
          >
            Withdraw application
          </button>
        )}
      </div>
    );
  } else if (mode === "form") {
    body = (
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
        aria-busy={busy}
      >
        <label htmlFor={messageId} className="text-sm font-bold text-rb-ink">
          Message to the professor <span className="font-normal text-rb-muted">(optional)</span>
        </label>
        <p id={hintId} className="mt-1 text-[13px] leading-5 text-rb-muted">
          Mention relevant coursework, skills, or availability. Your name and account email
          are included automatically.
        </p>
        <textarea
          ref={textareaRef}
          id={messageId}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          aria-describedby={`${hintId} ${countId}${visibleMessageError ? ` ${messageErrorId}` : ""}`}
          aria-invalid={visibleMessageError ? true : undefined}
          className={
            "mt-2 w-full rounded-lg border bg-white px-3 py-2 text-sm leading-6 text-rb-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rb-brand " +
            (visibleMessageError ? "border-[#b4432f]" : "border-rb-border")
          }
        />
        <p
          id={countId}
          className={`mt-1 text-xs ${remaining < 0 ? "font-bold text-[#8f2d1c]" : "text-rb-muted"}`}
        >
          {remaining >= 0
            ? `${remaining} characters left`
            : `${-remaining} characters over the limit`}
        </p>
        {visibleMessageError ? (
          <p id={messageErrorId} className={`mt-1 ${errorTextClass}`}>
            {visibleMessageError}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="submit" disabled={busy} className={primaryButtonClass}>
            {busy ? "Sending…" : "Send application"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setMode("idle");
              setError(null);
              setShowMessageError(false);
              focusTarget.current = "apply";
            }}
            className={secondaryButtonClass}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  } else {
    body = (
      <button
        ref={applyButtonRef}
        type="button"
        onClick={() => {
          setMode("form");
          setError(null);
          focusTarget.current = "textarea";
        }}
        className={primaryButtonClass}
      >
        Apply
      </button>
    );
  }

  return (
    <div>
      {body}
      {error ? (
        <p role="alert" className={`mt-3 ${errorTextClass}`}>
          {error}
        </p>
      ) : null}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
