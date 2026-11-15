"use client";

import Link from "next/link";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PROFESSOR_ROUTES, fetchProfileRole } from "../../lib/auth/profile";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import { draftSavingEnabled } from "../../lib/release";
import {
  DETAIL_TEXT_MAX,
  DETAIL_TEXT_MIN,
  PAY_PERIODS,
  WEEKLY_HOURS_MAX,
  WEEKLY_HOURS_MIN,
  compensationLabel,
  weeklyHoursLabel,
} from "../../lib/opportunities/details";

import {
  CLASS_YEARS, DEPARTMENT_MAX, DEPARTMENT_MIN,
  DESCRIPTION_MIN, DURATIONS, EMPTY_FORM, FIELD_FOCUS_IDS, FIELD_LABELS,
  FIELD_ORDER, KEYWORD_MAX_LENGTH, KEYWORD_MIN_LENGTH, KEYWORDS_MAX,
  POSITIONS_MAX, POSITIONS_MIN, PREFERRED_MAJOR_MAX_LENGTH,
  PREFERRED_MAJOR_MIN_LENGTH, PREFERRED_MAJORS_INPUT_MAX, PREFERRED_MAJORS_MAX,
  SCHOOLS, TITLE_MAX, opportunityFields, parseOpportunity, parseCommaSeparatedList, validate,
  type ClassYear, type FieldName, type FormErrors,
  type FormValues, type Opportunity,
} from "../../lib/opportunities/form";
import { EDIT_MESSAGES, updateOpportunity, type EditableOpportunity } from "../../lib/opportunities/editing";

/* -------------------------------------------------------------------------- */
/* Small presentational helpers                                               */
/* -------------------------------------------------------------------------- */

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 2.6 18.4 17H1.6L10 2.6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 7.6v4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="14.6" r="1" fill="currentColor" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="m5 12.5 4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const controlClass =
  "w-full rounded-xl border bg-white/75 px-4 py-3 text-[15px] leading-6 text-rb-ink transition placeholder:text-[rgba(17,17,17,0.6)] focus:border-rb-brand focus:ring-4 focus:ring-[rgba(0,103,71,0.22)]";

function controlState(hasError: boolean) {
  return hasError
    ? `${controlClass} border-[#b03320] bg-[#fdf1ed]`
    : `${controlClass} border-rb-soft-border`;
}

function FieldHint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-2 text-[13px] leading-5 text-rb-muted">
      {children}
    </p>
  );
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p
      id={id}
      className="mt-2 flex items-start gap-2 text-[13px] font-semibold leading-5 text-[#8f2d1c]"
    >
      <WarningIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

type FieldProps = {
  id: string;
  label: string;
  hint: string;
  error?: string;
  /** Optional fields show an "Optional" marker instead of the required asterisk. */
  optional?: boolean;
  /** Optional right-aligned meta, e.g. a character counter. */
  meta?: ReactNode;
  children: (aria: { describedBy: string; invalid: boolean }) => ReactNode;
};

/**
 * Wires a visible label, helper text and inline error to a single control so
 * every field in the form is described and announced the same way.
 */
function Field({ id, label, hint, error, optional = false, meta, children }: FieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? `${errorId} ${hintId}` : hintId;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <label htmlFor={id} className="text-sm font-bold tracking-tight text-rb-ink">
          {label}
          {optional ? (
            <span className="ml-2 text-[13px] font-semibold text-rb-muted">(optional)</span>
          ) : (
            <>
              <span aria-hidden="true" className="ml-1 text-rb-brand">
                *
              </span>
              <span className="sr-only"> (required)</span>
            </>
          )}
        </label>
        {meta}
      </div>
      {children({ describedBy, invalid: Boolean(error) })}
      <FieldHint id={hintId}>{hint}</FieldHint>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

function TextCounter({ value }: { value: string }) {
  const length = value.trim().length;
  return (
    <span
      className={
        "text-[13px] font-semibold tabular-nums " +
        (length > DETAIL_TEXT_MAX ? "text-[#8f2d1c]" : "text-rb-muted")
      }
    >
      {length} / {DETAIL_TEXT_MAX}
    </span>
  );
}

function RequiredLegend({ children }: { children: ReactNode }) {
  return (
    <legend className="mb-2 text-sm font-bold tracking-tight text-rb-ink">
      {children}
      <span aria-hidden="true" className="ml-1 text-rb-brand">
        *
      </span>
      <span className="sr-only"> (required)</span>
    </legend>
  );
}

function fieldsetDescription(hintId: string, errorId: string, hasError: boolean) {
  return hasError ? `${errorId} ${hintId}` : hintId;
}

function TagList({ items, label }: { items: readonly string[]; label: string }) {
  return (
    <ul aria-label={label} className="mt-2 flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="inline-flex rounded-md bg-rb-tag-surface px-2.5 py-1 text-xs font-semibold text-[#006747]"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

type SaveResult = { opportunity: Opportunity };

const NETWORK_SAVE_ERROR =
  "The opportunity could not be saved to Supabase. Your form entries are still here; check your internet connection and try again.";

export function OpportunityEditor({ existing, onReload }: {
  existing?: EditableOpportunity;
  onReload?: () => void;
}) {
  const [values, setValues] = useState<FormValues>(existing?.values ?? EMPTY_FORM);
  const [showErrors, setShowErrors] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState<SaveResult | null>(null);

  const savingRef = useRef(false);
  const isDirty = !saved && JSON.stringify(values) !== JSON.stringify(existing?.values ?? EMPTY_FORM);

  useEffect(() => {
    if (!isDirty) return;
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty]);

  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  const errors = validate(values);
  const visibleErrors: FormErrors = showErrors ? errors : {};
  const errorList = FIELD_ORDER.filter((field) => visibleErrors[field]);
  const preferredMajorCount = parseCommaSeparatedList(values.preferredMajors).length;
  const keywordCount = parseCommaSeparatedList(values.keywords).length;

  // Send focus to the confirmation so keyboard and screen reader users land on it.
  useEffect(() => {
    if (saved) successHeadingRef.current?.focus();
  }, [saved]);

  function update<K extends FieldName>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function toggleClassYear(year: ClassYear, checked: boolean) {
    setValues((current) => ({
      ...current,
      classYears: checked
        ? [...current.classYears, year].sort(
            (a, b) => CLASS_YEARS.indexOf(a) - CLASS_YEARS.indexOf(b),
          )
        : current.classYears.filter((value) => value !== year),
    }));
  }

  function focusField(field: FieldName) {
    document.getElementById(FIELD_FOCUS_IDS[field])?.focus();
  }

  async function save(status: Opportunity["status"]) {
    if (savingRef.current) return;
    const parsed = parseOpportunity(values, existing?.status ?? status);
    setShowErrors(true);
    setSaveError(null);
    if (!parsed.ok) {
      focusField(FIELD_ORDER.find((field) => parsed.errors[field]) ?? "title");
      return;
    }
    const opportunityInput = parsed.value;
    savingRef.current = true;
    setIsSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError && isAuthRetryableFetchError(authError)) {
        setSaveError(NETWORK_SAVE_ERROR);
        return;
      }
      if (authError || !authData.user) {
        setSaveError(
          "Your session has ended. Sign in again with your professor account; your form entries will need to be re-entered.",
        );
        return;
      }

      // RLS enforces this too; checking first gives a clearer message.
      const profile = await fetchProfileRole(supabase, authData.user.id);
      if (profile.kind === "error") {
        console.error("Profile lookup failed", profile.error);
        setSaveError(NETWORK_SAVE_ERROR);
        return;
      }
      if (profile.kind !== "role" || profile.role !== "professor") {
        setSaveError(
          "This account does not have a professor profile. Ask the ResearchBridge team to verify the account role.",
        );
        return;
      }

      if (existing && existing.professorId !== authData.user.id) {
        setSaveError("Sign in with the professor account that owns this listing before saving.");
        return;
      }
      if (existing) {
        const updated = await updateOpportunity(supabase, existing, opportunityInput);
        if (!updated.ok) {
          setSaveError(updated.message);
          return;
        }
        setSaved({ opportunity: { ...opportunityInput, ...updated.value } });
        return;
      }
      const { data: inserted, error: insertError } = await supabase
        .from("opportunities")
        .insert({
          ...opportunityFields(opportunityInput),
          professor_id: authData.user.id,
          status: opportunityInput.status,
        })
        .select("id, created_at")
        .single();

      if (insertError || !inserted) {
        console.error("Supabase opportunity insert failed", insertError);
        setSaveError(
          insertError?.code === "42501"
            ? "Supabase denied this save. Confirm that you are signed in as the professor who owns the opportunity."
            : NETWORK_SAVE_ERROR,
        );
        return;
      }

      const opportunity: Opportunity = {
        ...opportunityInput,
        id: inserted.id,
        createdAt: inserted.created_at,
      };
      setSaved({ opportunity });
    } catch (error) {
      console.error("Supabase is not configured", error);
      setSaveError(
        "Supabase is not configured for this frontend. Check the public URL and anon-key environment variables.",
      );
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  function resetForm() {
    setValues(EMPTY_FORM);
    setShowErrors(false);
    setSaveError(null);
    setSaved(null);
  }

  const status = saved?.opportunity.status ?? existing?.status;
  const badge = {
    label: status === "published" ? "Published" : status === "closed" ? "Closed" : status === "draft" ? "Draft" : "Not published",
    tone: status === "published" ? "published" : "draft",
  };

  return (
    <>
        <header className="border-b border-rb-border pb-8 pt-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-rb-brand">
            Professor workspace
          </p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <h1 className="font-serif text-4xl font-black leading-[1.05] tracking-[-0.03em] text-rb-ink sm:text-5xl">
              {existing ? "Edit research opportunity" : "Post a research opportunity"}
            </h1>
            <span
              className={
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold " +
                (badge.tone === "published"
                  ? "border-[rgba(0,103,71,0.35)] bg-[#e6f0ea] text-[#006747]"
                  : "border-[rgba(65,143,222,0.45)] bg-rb-tag-surface text-[#006747]")
              }
            >
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
              Status: {badge.label}
            </span>
          </div>
          <p className="mt-5 max-w-2xl text-base leading-7 text-rb-muted sm:text-lg">
            Students browse and search ResearchBridge using the details below, so each one
            is its own field. Keep the title a plain description of the work.
          </p>
          <ul className="mt-4 grid max-w-2xl gap-2 text-[15px] leading-6 text-rb-muted sm:grid-cols-2">
            <li>
              <span className="font-bold text-rb-ink">School</span> is the broader academic
              school the research sits in.
            </li>
            <li>
              <span className="font-bold text-rb-ink">Department</span> is the unit or
              discipline hosting the research.
            </li>
            <li>
              <span className="font-bold text-rb-ink">Preferred majors</span> describe likely
              backgrounds. They do not restrict who can apply.
            </li>
            <li>
              <span className="font-bold text-rb-ink">Keywords</span> help students discover
              the opportunity through search.
            </li>
          </ul>
          <p className="mt-4 text-sm text-rb-muted">
            {existing
              ? "Save your changes to update this listing. Its status and existing applications stay the same."
              : "Opportunities are saved under your professor account."}
          </p>
        </header>

        {/* Live region is always mounted so the confirmation is announced when it appears. */}
        <div aria-live="polite">
          {saved ? (
            <section className="mt-8 rounded-[24px] border border-rb-border bg-rb-card p-6 shadow-[0_16px_34px_rgba(17,17,17,0.10)] sm:p-8">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e6f0ea] text-[#006747]">
                  <CheckIcon className="h-6 w-6" />
                </span>
                <div>
                  <h2
                    ref={successHeadingRef}
                    tabIndex={-1}
                    className="font-serif text-2xl font-bold tracking-tight text-rb-ink focus-visible:outline-none sm:text-3xl"
                  >
                    {existing ? "Changes saved" : saved.opportunity.status === "published" ? "Opportunity published" : "Draft saved"}
                  </h2>
                  <p className="mt-2 max-w-xl text-[15px] leading-6 text-rb-muted">
                    {existing
                      ? saved.opportunity.status === "published"
                        ? "Your updated listing is visible to students. Existing applications are still attached to it."
                        : "Your changes are saved. This listing remains private, and existing applications are still attached to it."
                      : saved.opportunity.status === "published"
                        ? "Students can now find and apply to it. Applicants appear under My opportunities."
                        : "This opportunity is saved as a private draft. Students cannot see it until you publish it."}
                  </p>
                </div>
              </div>

              <dl className="mt-7 grid gap-x-8 gap-y-5 border-t border-rb-border pt-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-rb-muted">
                    Title
                  </dt>
                  <dd className="mt-1 font-serif text-xl font-bold text-rb-ink">
                    {saved.opportunity.title}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-rb-muted">
                    School
                  </dt>
                  <dd className="mt-1 text-[15px] font-semibold text-rb-ink">
                    {saved.opportunity.school}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-rb-muted">
                    Hosting department
                  </dt>
                  <dd className="mt-1 text-[15px] font-semibold text-rb-ink">
                    {saved.opportunity.department}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-rb-muted">
                    Preferred majors
                  </dt>
                  <dd>
                    {saved.opportunity.preferredMajors.length > 0 ? (
                      <TagList items={saved.opportunity.preferredMajors} label="Preferred majors" />
                    ) : (
                      <p className="mt-1 text-[15px] font-semibold text-rb-ink">
                        Open to all majors
                      </p>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-rb-muted">
                    Keywords
                  </dt>
                  <dd>
                    <TagList items={saved.opportunity.keywords} label="Keywords" />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-rb-muted">
                    Duration
                  </dt>
                  <dd className="mt-1 text-[15px] font-semibold text-rb-ink">
                    {saved.opportunity.durationSemesters}{" "}
                    {saved.opportunity.durationSemesters === 1 ? "semester" : "semesters"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-rb-muted">
                    Eligible class years
                  </dt>
                  <dd>
                    <TagList
                      items={saved.opportunity.eligibleClassYears}
                      label="Eligible class years"
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-rb-muted">
                    Positions available
                  </dt>
                  <dd className="mt-1 text-[15px] font-semibold text-rb-ink">
                    {saved.opportunity.positionsAvailable}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-rb-muted">
                    Time commitment
                  </dt>
                  <dd className="mt-1 text-[15px] font-semibold text-rb-ink">
                    {weeklyHoursLabel(saved.opportunity.weeklyHours.min, saved.opportunity.weeklyHours.max)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-rb-muted">
                    Compensation
                  </dt>
                  <dd className="mt-1 text-[15px] font-semibold text-rb-ink">
                    {compensationLabel(
                      saved.opportunity.isPaid,
                      saved.opportunity.payAmount,
                      saved.opportunity.payPeriod,
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-rb-muted">
                    Learning outcomes
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-6 text-rb-ink">
                    {saved.opportunity.learningOutcomes}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold uppercase tracking-[0.14em] text-rb-muted">
                    Expected duties and skills
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-6 text-rb-ink">
                    {saved.opportunity.dutiesAndSkills}
                  </dd>
                </div>
              </dl>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                {!existing ? <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg bg-rb-brand px-6 py-3.5 text-center font-bold text-white shadow-[0_10px_22px_rgba(0,103,71,0.2)] transition hover:-translate-y-0.5 hover:bg-rb-brand-hover active:bg-rb-brand-active"
                >
                  Create another opportunity
                </button> : null}
                {saved.opportunity.status === "published" ? (
                  <Link
                    href="/opportunities"
                    className="rounded-lg border-2 border-rb-brand px-6 py-3.5 text-center font-bold text-rb-ink transition hover:bg-[rgba(0,103,71,0.08)] hover:text-rb-brand active:bg-[rgba(0,103,71,0.16)]"
                  >
                    View published opportunities
                  </Link>
                ) : null}
                <Link
                  href={PROFESSOR_ROUTES.opportunities}
                  className="rounded-lg border-2 border-rb-brand px-6 py-3.5 text-center font-bold text-rb-ink transition hover:bg-[rgba(0,103,71,0.08)] hover:text-rb-brand active:bg-[rgba(0,103,71,0.16)]"
                >
                  View my opportunities
                </Link>
              </div>
            </section>
          ) : null}
        </div>

        {!saved ? (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void save(existing?.status ?? "published");
            }}
            aria-busy={isSaving}
            className="mt-8 rounded-[24px] border border-rb-border bg-rb-card p-6 shadow-[0_16px_34px_rgba(17,17,17,0.10)] sm:p-8"
          >
            <fieldset disabled={isSaving} className="min-w-0">
            {existing && (!existing.values.learningOutcomes || !existing.values.hoursFrom || !existing.values.isPaid || !existing.values.dutiesAndSkills) ? (
              <p className="mb-6 rounded-xl bg-rb-tag-surface p-4 text-sm leading-6 text-rb-ink">
                This older listing is missing some details. Add the learning outcomes, weekly hours,
                compensation, and duties before saving so students have the full picture.
              </p>
            ) : null}
            {errorList.length > 0 ? (
              <div
                role="alert"
                className="mb-8 rounded-2xl border border-[#e0b3a7] bg-[#fdf1ed] p-5"
              >
                <h2 className="flex items-center gap-2 text-sm font-bold text-[#8f2d1c]">
                  <WarningIcon className="h-4 w-4 shrink-0" />
                  {errorList.length === 1
                    ? "1 field needs attention before saving"
                    : `${errorList.length} fields need attention before saving`}
                </h2>
                <ul className="mt-3 space-y-1.5">
                  {errorList.map((field) => (
                    <li key={field}>
                      <button
                        type="button"
                        onClick={() => focusField(field)}
                        className="rounded text-left text-[13px] font-semibold text-[#8f2d1c] underline underline-offset-2 hover:text-rb-brand-hover"
                      >
                        {FIELD_LABELS[field]}: {visibleErrors[field]}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-7">
              <Field
                id="title"
                label={FIELD_LABELS.title}
                hint="A short, readable description of the role, for example “Cell Signaling Research Assistant”. School, department, and majors have their own fields below."
                error={visibleErrors.title}
                meta={
                  <span
                    className={
                      "text-[13px] font-semibold tabular-nums " +
                      (values.title.length > TITLE_MAX ? "text-[#8f2d1c]" : "text-rb-muted")
                    }
                  >
                    {values.title.length} / {TITLE_MAX}
                  </span>
                }
              >
                {({ describedBy, invalid }) => (
                  <input
                    id="title"
                    name="title"
                    type="text"
                    required
                    maxLength={TITLE_MAX}
                    value={values.title}
                    onChange={(event) => update("title", event.target.value)}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    placeholder="Cell Signaling Research Assistant"
                    className={controlState(invalid)}
                  />
                )}
              </Field>

              <Field
                id="description"
                label={FIELD_LABELS.description}
                hint="Cover the research question, the project's goals, and any faculty-approved contact or application steps. Learning outcomes, duties, and skills have their own fields below."
                error={visibleErrors.description}
                meta={
                  <span className="text-[13px] font-semibold tabular-nums text-rb-muted">
                    {values.description.trim().length} characters ({DESCRIPTION_MIN} minimum)
                  </span>
                }
              >
                {({ describedBy, invalid }) => (
                  <textarea
                    id="description"
                    name="description"
                    required
                    rows={6}
                    value={values.description}
                    onChange={(event) => update("description", event.target.value)}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    placeholder="We are building models that flag early signs of disease from routine clinical data. Students will help clean datasets, run experiments, and present weekly findings."
                    className={`${controlState(invalid)} min-h-[150px] resize-y`}
                  />
                )}
              </Field>

              <Field
                id="learning-outcomes"
                label={FIELD_LABELS.learningOutcomes}
                hint={`What students will learn or gain, such as methods, tools, or a poster or publication. ${DETAIL_TEXT_MIN} to ${DETAIL_TEXT_MAX} characters.`}
                error={visibleErrors.learningOutcomes}
                meta={<TextCounter value={values.learningOutcomes} />}
              >
                {({ describedBy, invalid }) => (
                  <textarea
                    id="learning-outcomes"
                    name="learningOutcomes"
                    required
                    rows={4}
                    value={values.learningOutcomes}
                    onChange={(event) => update("learningOutcomes", event.target.value)}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    placeholder="Students will learn to design experiments, analyze imaging data in Python, and present findings at lab meetings."
                    className={`${controlState(invalid)} min-h-[110px] resize-y`}
                  />
                )}
              </Field>

              <Field
                id="duties-and-skills"
                label={FIELD_LABELS.dutiesAndSkills}
                hint={`Day-to-day duties, plus skills students should bring or will use. Note anything required versus helpful. ${DETAIL_TEXT_MIN} to ${DETAIL_TEXT_MAX} characters.`}
                error={visibleErrors.dutiesAndSkills}
                meta={<TextCounter value={values.dutiesAndSkills} />}
              >
                {({ describedBy, invalid }) => (
                  <textarea
                    id="duties-and-skills"
                    name="dutiesAndSkills"
                    required
                    rows={4}
                    value={values.dutiesAndSkills}
                    onChange={(event) => update("dutiesAndSkills", event.target.value)}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    placeholder="Prepare samples, run microscopy sessions, and keep a lab notebook. Helpful: intro biology lab experience. Required: reliable weekly attendance."
                    className={`${controlState(invalid)} min-h-[110px] resize-y`}
                  />
                )}
              </Field>

              <div className="grid gap-7 sm:grid-cols-2">
                <Field
                  id="school"
                  label={FIELD_LABELS.school}
                  hint="The broader academic school the research belongs to."
                  error={visibleErrors.school}
                >
                  {({ describedBy, invalid }) => (
                    <select
                      id="school"
                      name="school"
                      required
                      value={values.school}
                      onChange={(event) => update("school", event.target.value)}
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      className={controlState(invalid)}
                    >
                      <option value="">Select a school</option>
                      {SCHOOLS.map((school) => (
                        <option key={school} value={school}>
                          {school}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>

                <Field
                  id="department"
                  label={FIELD_LABELS.department}
                  hint="The unit hosting the research, e.g. “Cell and Molecular Biology”, “Computer Science”, or “Biomedical Engineering”."
                  error={visibleErrors.department}
                >
                  {({ describedBy, invalid }) => (
                    <input
                      id="department"
                      name="department"
                      type="text"
                      required
                      minLength={DEPARTMENT_MIN}
                      maxLength={DEPARTMENT_MAX}
                      autoComplete="off"
                      value={values.department}
                      onChange={(event) => update("department", event.target.value)}
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      placeholder="Cell and Molecular Biology"
                      className={controlState(invalid)}
                    />
                  )}
                </Field>
              </div>

              <Field
                id="preferred-majors"
                label={FIELD_LABELS.preferredMajors}
                optional
                hint={`Separate majors with commas. These describe likely backgrounds and do not limit who can apply. Up to ${PREFERRED_MAJORS_MAX}, each ${PREFERRED_MAJOR_MIN_LENGTH} to ${PREFERRED_MAJOR_MAX_LENGTH} characters. Leave blank if the opportunity is open to all majors.`}
                error={visibleErrors.preferredMajors}
                meta={
                  <span
                    className={
                      "text-[13px] font-semibold tabular-nums " +
                      (preferredMajorCount > PREFERRED_MAJORS_MAX ? "text-[#8f2d1c]" : "text-rb-muted")
                    }
                  >
                    {preferredMajorCount === 0
                      ? "Open to all majors"
                      : `${preferredMajorCount} / ${PREFERRED_MAJORS_MAX} majors`}
                  </span>
                }
              >
                {({ describedBy, invalid }) => (
                  <input
                    id="preferred-majors"
                    name="preferredMajors"
                    type="text"
                    maxLength={PREFERRED_MAJORS_INPUT_MAX}
                    autoComplete="off"
                    value={values.preferredMajors}
                    onChange={(event) => update("preferredMajors", event.target.value)}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    placeholder="Biology, Neuroscience, Biomedical Engineering"
                    className={controlState(invalid)}
                  />
                )}
              </Field>

              <Field
                id="keywords"
                label={FIELD_LABELS.keywords}
                hint={`Separate keywords with commas, for example “cell signaling, microscopy, wet lab”. Use 1 to ${KEYWORDS_MAX}, each ${KEYWORD_MIN_LENGTH} to ${KEYWORD_MAX_LENGTH} characters.`}
                error={visibleErrors.keywords}
                meta={
                  <span
                    className={
                      "text-[13px] font-semibold tabular-nums " +
                      (keywordCount > KEYWORDS_MAX ? "text-[#8f2d1c]" : "text-rb-muted")
                    }
                  >
                    {keywordCount} / {KEYWORDS_MAX} keywords
                  </span>
                }
              >
                {({ describedBy, invalid }) => (
                  <input
                    id="keywords"
                    name="keywords"
                    type="text"
                    required
                    autoComplete="off"
                    value={values.keywords}
                    onChange={(event) => update("keywords", event.target.value)}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    placeholder="cell signaling, microscopy, wet lab"
                    className={controlState(invalid)}
                  />
                )}
              </Field>

              <div className="grid gap-7 sm:grid-cols-2">
                <Field
                  id="duration"
                  label={FIELD_LABELS.duration}
                  hint="How long you expect a student to stay on the project."
                  error={visibleErrors.duration}
                >
                  {({ describedBy, invalid }) => (
                    <select
                      id="duration"
                      name="duration"
                      required
                      value={values.duration}
                      onChange={(event) => update("duration", event.target.value)}
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      className={controlState(invalid)}
                    >
                      <option value="">Select a duration</option>
                      {DURATIONS.map((duration) => (
                        <option key={duration.value} value={duration.value}>
                          {duration.label}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>

                <fieldset
                  aria-describedby={fieldsetDescription(
                    "weekly-hours-hint",
                    "weekly-hours-error",
                    Boolean(visibleErrors.hoursFrom || visibleErrors.hoursTo),
                  )}
                >
                  <RequiredLegend>{FIELD_LABELS.hoursFrom} (hours per week)</RequiredLegend>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="hours-from" className="mb-1 block text-[13px] font-semibold text-rb-muted">
                        Hours
                      </label>
                      <input
                        id="hours-from"
                        name="hoursFrom"
                        type="number"
                        required
                        inputMode="numeric"
                        min={WEEKLY_HOURS_MIN}
                        max={WEEKLY_HOURS_MAX}
                        step={1}
                        value={values.hoursFrom}
                        onChange={(event) => update("hoursFrom", event.target.value)}
                        aria-invalid={Boolean(visibleErrors.hoursFrom)}
                        aria-describedby={fieldsetDescription(
                          "weekly-hours-hint",
                          "weekly-hours-error",
                          Boolean(visibleErrors.hoursFrom || visibleErrors.hoursTo),
                        )}
                        placeholder="8"
                        className={controlState(Boolean(visibleErrors.hoursFrom))}
                      />
                    </div>
                    <div>
                      <label htmlFor="hours-to" className="mb-1 block text-[13px] font-semibold text-rb-muted">
                        Up to (optional)
                      </label>
                      <input
                        id="hours-to"
                        name="hoursTo"
                        type="number"
                        inputMode="numeric"
                        min={WEEKLY_HOURS_MIN}
                        max={WEEKLY_HOURS_MAX}
                        step={1}
                        value={values.hoursTo}
                        onChange={(event) => update("hoursTo", event.target.value)}
                        aria-invalid={Boolean(visibleErrors.hoursTo)}
                        aria-describedby={fieldsetDescription(
                          "weekly-hours-hint",
                          "weekly-hours-error",
                          Boolean(visibleErrors.hoursFrom || visibleErrors.hoursTo),
                        )}
                        placeholder="10"
                        className={controlState(Boolean(visibleErrors.hoursTo))}
                      />
                    </div>
                  </div>
                  <FieldHint id="weekly-hours-hint">
                    {`Whole hours from ${WEEKLY_HOURS_MIN} to ${WEEKLY_HOURS_MAX}. Fill in “Up to” only for a range, such as 8 to 10.`}
                  </FieldHint>
                  {visibleErrors.hoursFrom || visibleErrors.hoursTo ? (
                    <FieldError id="weekly-hours-error">
                      {visibleErrors.hoursFrom ?? visibleErrors.hoursTo}
                    </FieldError>
                  ) : null}
                </fieldset>
              </div>

              <fieldset
                aria-describedby={
                  visibleErrors.classYears
                    ? "class-years-error class-years-hint"
                    : "class-years-hint"
                }
              >
                <legend className="mb-2 text-sm font-bold tracking-tight text-rb-ink">
                  {FIELD_LABELS.classYears}
                  <span aria-hidden="true" className="ml-1 text-rb-brand">
                    *
                  </span>
                  <span className="sr-only"> (required, select at least one)</span>
                </legend>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {CLASS_YEARS.map((year) => {
                    const checked = values.classYears.includes(year);
                    return (
                      <label
                        key={year}
                        htmlFor={`class-year-${year.toLowerCase()}`}
                        className={
                          "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[15px] font-semibold transition hover:border-rb-accent has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[rgba(0,103,71,0.22)] " +
                          (checked
                            ? "border-rb-brand bg-rb-tag-surface text-rb-ink"
                            : visibleErrors.classYears
                              ? "border-[#b03320] bg-[#fdf1ed] text-rb-ink"
                              : "border-rb-soft-border bg-white/75 text-rb-ink")
                        }
                      >
                        <input
                          id={`class-year-${year.toLowerCase()}`}
                          type="checkbox"
                          name="classYears"
                          value={year}
                          checked={checked}
                          onChange={(event) => toggleClassYear(year, event.target.checked)}
                          aria-invalid={Boolean(visibleErrors.classYears)}
                          className="h-[18px] w-[18px] shrink-0 accent-[#006747]"
                        />
                        {year}
                      </label>
                    );
                  })}
                </div>
                <FieldHint id="class-years-hint">
                  Select every year that can apply. Students outside these years will not see
                  the opportunity as a match.
                </FieldHint>
                {visibleErrors.classYears ? (
                  <FieldError id="class-years-error">{visibleErrors.classYears}</FieldError>
                ) : null}
              </fieldset>

              <div className="sm:max-w-[240px]">
                <Field
                  id="positions"
                  label={FIELD_LABELS.positions}
                  hint={`How many students you can take, from ${POSITIONS_MIN} to ${POSITIONS_MAX}.`}
                  error={visibleErrors.positions}
                >
                  {({ describedBy, invalid }) => (
                    <input
                      id="positions"
                      name="positions"
                      type="number"
                      required
                      inputMode="numeric"
                      min={POSITIONS_MIN}
                      max={POSITIONS_MAX}
                      step={1}
                      value={values.positions}
                      onChange={(event) => update("positions", event.target.value)}
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      className={controlState(invalid)}
                    />
                  )}
                </Field>
              </div>

              <fieldset
                aria-describedby={fieldsetDescription("is-paid-hint", "is-paid-error", Boolean(visibleErrors.isPaid))}
              >
                <RequiredLegend>{FIELD_LABELS.isPaid}: is this position paid?</RequiredLegend>
                <div className="grid gap-3 sm:max-w-md sm:grid-cols-2">
                  {(
                    [
                      { value: "yes", label: "Yes, paid" },
                      { value: "no", label: "No, unpaid" },
                    ] as const
                  ).map((option) => {
                    const checked = values.isPaid === option.value;
                    return (
                      <label
                        key={option.value}
                        htmlFor={`is-paid-${option.value}`}
                        className={
                          "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[15px] font-semibold transition hover:border-rb-accent has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[rgba(0,103,71,0.22)] " +
                          (checked
                            ? "border-rb-brand bg-rb-tag-surface text-rb-ink"
                            : visibleErrors.isPaid
                              ? "border-[#b03320] bg-[#fdf1ed] text-rb-ink"
                              : "border-rb-soft-border bg-white/75 text-rb-ink")
                        }
                      >
                        <input
                          id={`is-paid-${option.value}`}
                          type="radio"
                          name="isPaid"
                          value={option.value}
                          checked={checked}
                          onChange={() => update("isPaid", option.value)}
                          className="h-[18px] w-[18px] shrink-0 accent-[#006747]"
                        />
                        {option.label}
                      </label>
                    );
                  })}
                </div>
                <FieldHint id="is-paid-hint">
                  Students see this on the listing. Choose No for volunteer or course-credit positions.
                </FieldHint>
                {visibleErrors.isPaid ? (
                  <FieldError id="is-paid-error">{visibleErrors.isPaid}</FieldError>
                ) : null}

                {values.isPaid === "yes" ? (
                  <div className="mt-5 grid gap-7 sm:grid-cols-2">
                    <Field
                      id="pay-amount"
                      label="Pay amount (US dollars)"
                      hint="For example 15 or 15.50."
                      error={visibleErrors.payAmount}
                    >
                      {({ describedBy, invalid }) => (
                        <input
                          id="pay-amount"
                          name="payAmount"
                          type="text"
                          required
                          inputMode="decimal"
                          autoComplete="off"
                          value={values.payAmount}
                          onChange={(event) => update("payAmount", event.target.value)}
                          aria-describedby={describedBy}
                          aria-invalid={invalid}
                          placeholder="15.00"
                          className={controlState(invalid)}
                        />
                      )}
                    </Field>
                    <Field
                      id="pay-period"
                      label="Amount covers"
                      hint="Whether the amount is hourly, per semester, or a one-time total."
                      error={visibleErrors.payPeriod}
                    >
                      {({ describedBy, invalid }) => (
                        <select
                          id="pay-period"
                          name="payPeriod"
                          required
                          value={values.payPeriod}
                          onChange={(event) => update("payPeriod", event.target.value)}
                          aria-describedby={describedBy}
                          aria-invalid={invalid}
                          className={controlState(invalid)}
                        >
                          <option value="">Select a pay period</option>
                          {PAY_PERIODS.map((period) => (
                            <option key={period.value} value={period.value}>
                              {period.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </Field>
                  </div>
                ) : null}
              </fieldset>
            </div>

            <p role="status" className="sr-only">
              {isSaving ? "Saving opportunity…" : ""}
            </p>

            {saveError ? (
              <div
                role="alert"
                className="mt-7 flex items-start gap-2 rounded-2xl border border-[#e0b3a7] bg-[#fdf1ed] p-4 text-[13px] font-semibold leading-5 text-[#8f2d1c]"
              >
                <WarningIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p>{saveError}</p>
                  {saveError === EDIT_MESSAGES.conflict && onReload ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Reload the latest listing and discard your unsaved changes?")) onReload();
                      }}
                      className="mt-3 rounded font-bold underline underline-offset-2"
                    >
                      Reload latest version
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="mt-9 flex flex-col gap-3 border-t border-rb-border pt-7 sm:flex-row sm:items-center">
              {!existing && draftSavingEnabled() ? (
                <button
                  type="button"
                  onClick={() => void save("draft")}
                  disabled={isSaving}
                  className="rounded-lg border border-rb-ink px-7 py-4 text-center font-bold text-rb-ink transition hover:bg-rb-surface disabled:cursor-wait disabled:opacity-60 sm:order-1"
                >
                  Save draft
                </button>
              ) : null}
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-rb-brand px-7 py-4 text-center font-bold text-white shadow-[0_10px_22px_rgba(0,103,71,0.2)] transition hover:-translate-y-0.5 hover:bg-rb-brand-hover active:bg-rb-brand-active disabled:cursor-wait disabled:opacity-60 sm:order-2"
              >
                {isSaving ? "Saving…" : existing ? "Save changes" : "Publish opportunity"}
              </button>
              {existing ? (
                <Link
                  href={PROFESSOR_ROUTES.opportunities}
                  onClick={(event) => {
                    if (isSaving || (isDirty && !window.confirm("Discard your unsaved changes?"))) event.preventDefault();
                  }}
                  className="rounded-lg border-2 border-rb-brand px-7 py-3.5 text-center font-bold text-rb-ink sm:order-3"
                >
                  Cancel
                </Link>
              ) : null}
              <p className="text-[13px] leading-5 text-rb-muted sm:order-4 sm:ml-2">
                {existing
                  ? "Saving keeps the current status. Published changes are visible to students immediately."
                  : "Publishing makes this opportunity visible to signed-in students. You can edit it later from My opportunities."}
              </p>
            </div>
            </fieldset>
          </form>
        ) : null}
    </>
  );
}
