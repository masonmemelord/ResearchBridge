"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import logo from "../../../researchbridgelogo.jpeg";

/* -------------------------------------------------------------------------- */
/* Domain types and reference data                                            */
/* -------------------------------------------------------------------------- */

type Opportunity = {
  id: string;
  title: string;
  description: string;
  department: string;
  durationSemesters: 1 | 2 | 3 | 4;
  eligibleClassYears: ("Freshman" | "Sophomore" | "Junior" | "Senior")[];
  positionsAvailable: number;
  status: "draft" | "published";
  createdAt: string;
};

type ClassYear = Opportunity["eligibleClassYears"][number];
type DurationSemesters = Opportunity["durationSemesters"];

const DEPARTMENTS = [
  "Computer Science",
  "Biology",
  "Psychology",
  "Chemistry",
  "Physics",
  "Mathematics",
] as const;

const CLASS_YEARS: readonly ClassYear[] = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
];

const DURATIONS: readonly { value: DurationSemesters; label: string }[] = [
  { value: 1, label: "1 semester" },
  { value: 2, label: "2 semesters" },
  { value: 3, label: "3 semesters" },
  { value: 4, label: "4 semesters" },
];

const TITLE_MAX = 120;
const DESCRIPTION_MIN = 30;
const POSITIONS_MIN = 1;
const POSITIONS_MAX = 20;

/* -------------------------------------------------------------------------- */
/* Prototype persistence                                                      */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "researchbridge-opportunities"; //Write logic

/**
 * Temporary prototype storage. Every call happens in the browser only (event
 * handlers and the external-store snapshot below), never during server
 * rendering, and is expected to be replaced by a real data layer.
 */
function readStoredOpportunities(): Opportunity[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Opportunity[]) : [];
  } catch {
    // Unreadable or corrupted storage should not break the form.
    return [];
  }
}

/** Appends without dropping anything already saved. Throws if storage is unavailable. */
function appendStoredOpportunity(opportunity: Opportunity): Opportunity[] {
  const next = [...readStoredOpportunities(), opportunity];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  notifyStoredOpportunitiesChanged();
  return next;
}

/**
 * localStorage is an external store, so it is read through useSyncExternalStore
 * rather than an effect. The server snapshot is `null` so nothing is read during
 * server rendering or hydration.
 */
const storageListeners = new Set<() => void>();

function notifyStoredOpportunitiesChanged() {
  for (const listener of storageListeners) listener();
}

function subscribeToStoredOpportunities(onChange: () => void) {
  storageListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    storageListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getStoredCount(): number | null {
  return readStoredOpportunities().length;
}

function getServerStoredCount(): number | null {
  return null;
}

function useStoredOpportunityCount(): number | null {
  return useSyncExternalStore(
    subscribeToStoredOpportunities,
    getStoredCount,
    getServerStoredCount,
  );
}

/* -------------------------------------------------------------------------- */
/* Form state and validation                                                  */
/* -------------------------------------------------------------------------- */

type FormValues = {
  title: string;
  description: string;
  department: string;
  duration: string;
  classYears: ClassYear[];
  positions: string;
};

type FieldName = keyof FormValues;
type FormErrors = Partial<Record<FieldName, string>>;

const EMPTY_FORM: FormValues = {
  title: "",
  description: "",
  department: "",
  duration: "",
  classYears: [],
  positions: "1",
};

/** Order used for the error summary and for focusing the first invalid field. */
const FIELD_ORDER: FieldName[] = [
  "title",
  "description",
  "department",
  "duration",
  "classYears",
  "positions",
];

const FIELD_LABELS: Record<FieldName, string> = {
  title: "Research opportunity title",
  description: "Research description",
  department: "Department",
  duration: "Research duration",
  classYears: "Eligible student class years",
  positions: "Positions available",
};

/** Element that receives focus when a field is invalid. */
const FIELD_FOCUS_IDS: Record<FieldName, string> = {
  title: "title",
  description: "description",
  department: "department",
  duration: "duration",
  classYears: "class-year-freshman",
  positions: "positions",
};

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  const title = values.title.trim();
  if (!title) {
    errors.title = "Add a title so students can tell what the project is about.";
  } else if (title.length > TITLE_MAX) {
    errors.title = `Shorten the title by ${title.length - TITLE_MAX} characters (${TITLE_MAX} maximum).`;
  }

  const description = values.description.trim();
  if (!description) {
    errors.description = "Describe the research so students can judge whether it fits them.";
  } else if (description.length < DESCRIPTION_MIN) {
    errors.description = `Add ${DESCRIPTION_MIN - description.length} more characters (${DESCRIPTION_MIN} minimum).`;
  }

  if (!values.department) {
    errors.department = "Choose the department this opportunity belongs to.";
  }

  if (!values.duration) {
    errors.duration = "Choose how long students would work on this project.";
  }

  if (values.classYears.length === 0) {
    errors.classYears = "Select at least one class year that can apply.";
  }

  const positions = Number(values.positions);
  if (!values.positions.trim()) {
    errors.positions = "Enter how many students you can take on.";
  } else if (!Number.isInteger(positions)) {
    errors.positions = "Enter a whole number of positions.";
  } else if (positions < POSITIONS_MIN || positions > POSITIONS_MAX) {
    errors.positions = `Enter a number between ${POSITIONS_MIN} and ${POSITIONS_MAX}.`;
  }

  return errors;
}

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
  "w-full rounded-xl border bg-white/75 px-4 py-3 text-[15px] leading-6 text-rb-ink transition placeholder:text-[#a5978c] focus:border-rb-accent focus:ring-4 focus:ring-[rgba(217,121,35,0.22)]";

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
  /** Optional right-aligned meta, e.g. a character counter. */
  meta?: ReactNode;
  children: (aria: { describedBy: string; invalid: boolean }) => ReactNode;
};

/**
 * Wires a visible label, helper text and inline error to a single control so
 * every field in the form is described and announced the same way.
 */
function Field({ id, label, hint, error, meta, children }: FieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? `${errorId} ${hintId}` : hintId;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <label htmlFor={id} className="text-sm font-bold tracking-tight text-rb-ink">
          {label}
          <span aria-hidden="true" className="ml-1 text-rb-brand">
            *
          </span>
          <span className="sr-only"> (required)</span>
        </label>
        {meta}
      </div>
      {children({ describedBy, invalid: Boolean(error) })}
      <FieldHint id={hintId}>{hint}</FieldHint>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

type SaveResult = { opportunity: Opportunity; total: number };

export default function NewOpportunityPage() {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [showErrors, setShowErrors] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SaveResult | null>(null);
  const storedCount = useStoredOpportunityCount();

  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  const errors = validate(values);
  const visibleErrors: FormErrors = showErrors ? errors : {};
  const errorList = FIELD_ORDER.filter((field) => visibleErrors[field]);

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

  function save(status: Opportunity["status"]) {
    const nextErrors = validate(values);
    setShowErrors(true);
    setStorageError(null);

    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field]);
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }

    const opportunity: Opportunity = {
      id: crypto.randomUUID(),
      title: values.title.trim(),
      description: values.description.trim(),
      department: values.department,
      durationSemesters: Number(values.duration) as DurationSemesters,
      eligibleClassYears: values.classYears,
      positionsAvailable: Number(values.positions),
      status,
      createdAt: new Date().toISOString(),
    };

    try {
      const all = appendStoredOpportunity(opportunity);
      setSaved({ opportunity, total: all.length });
    } catch {
      setStorageError(
        "This browser blocked local storage, so the opportunity could not be saved. Check your privacy settings and try again.",
      );
    }
  }

  function resetForm() {
    setValues(EMPTY_FORM);
    setShowErrors(false);
    setStorageError(null);
    setSaved(null);
  }

  const badge = saved
    ? saved.opportunity.status === "published"
      ? { label: "Published", tone: "published" as const }
      : { label: "Draft saved", tone: "draft" as const }
    : { label: "Draft", tone: "draft" as const };

  return (
    <main className="paper-texture min-h-screen pb-20">
      <nav className="mx-auto flex max-w-[900px] flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link href="/" aria-label="ResearchBridge home">
          <Image src={logo} alt="ResearchBridge" className="h-auto w-36 sm:w-44" priority />
        </Link>
        <Link
          href="/"
          className="rounded-lg px-2 py-1 text-sm font-semibold text-rb-muted transition hover:text-rb-brand"
        >
          Back to home
        </Link>
      </nav>

      <div className="mx-auto max-w-[900px] px-5 sm:px-8">
        <header className="border-b border-rb-border pb-8 pt-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-rb-brand">
            Professor workspace
          </p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <h1 className="font-serif text-4xl font-black leading-[1.05] tracking-[-0.03em] text-rb-ink sm:text-5xl">
              Post a research opportunity
            </h1>
            <span
              className={
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold " +
                (badge.tone === "published"
                  ? "border-[#b0d0b4] bg-[#eaf5ea] text-[#2f6136]"
                  : "border-rb-soft-border bg-rb-tag-surface text-[#a04d13]")
              }
            >
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
              Status: {badge.label}
            </span>
          </div>
          <p className="mt-5 max-w-2xl text-base leading-7 text-rb-muted sm:text-lg">
            Students search ResearchBridge by department, time commitment, and class year.
            Everything you enter here is what they will see and filter on, so be specific
            about the work and who it is a good fit for.
          </p>
          {storedCount !== null && storedCount > 0 ? (
            <p className="mt-4 text-sm text-rb-muted">
              {storedCount} {storedCount === 1 ? "opportunity" : "opportunities"} already
              saved in this browser.
            </p>
          ) : null}
        </header>

        {/* Live region is always mounted so the confirmation is announced when it appears. */}
        <div aria-live="polite">
          {saved ? (
            <section className="mt-8 rounded-[24px] border border-rb-border bg-rb-card p-6 shadow-[0_16px_34px_rgba(74,53,35,0.12)] sm:p-8">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eaf5ea] text-[#2f6136]">
                  <CheckIcon className="h-6 w-6" />
                </span>
                <div>
                  <h2
                    ref={successHeadingRef}
                    tabIndex={-1}
                    className="font-serif text-2xl font-bold tracking-tight text-rb-ink focus-visible:outline-none sm:text-3xl"
                  >
                    {saved.opportunity.status === "published"
                      ? "Opportunity published"
                      : "Draft saved"}
                  </h2>
                  <p className="mt-2 max-w-xl text-[15px] leading-6 text-rb-muted">
                    {saved.opportunity.status === "published"
                      ? "This opportunity is marked as published, so it is ready for students to discover."
                      : "This opportunity is saved as a draft. It is not visible to students until you publish it."}{" "}
                    Prototype note: it is stored only in this browser, and {saved.total}{" "}
                    {saved.total === 1 ? "opportunity is" : "opportunities are"} saved so far.
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
                    Department
                  </dt>
                  <dd className="mt-1 text-[15px] font-semibold text-rb-ink">
                    {saved.opportunity.department}
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
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {saved.opportunity.eligibleClassYears.map((year) => (
                      <span
                        key={year}
                        className="inline-flex rounded-md bg-rb-tag-surface px-2.5 py-1 text-xs font-semibold text-[#a04d13]"
                      >
                        {year}
                      </span>
                    ))}
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
              </dl>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg bg-rb-brand px-6 py-3.5 text-center font-bold text-white shadow-[0_10px_22px_rgba(132,43,26,0.2)] transition hover:-translate-y-0.5 hover:bg-rb-brand-hover"
                >
                  Create another opportunity
                </button>
                <Link
                  href="/"
                  className="rounded-lg border-2 border-[#251c18] px-6 py-3.5 text-center font-bold text-rb-ink transition hover:bg-[#251c18] hover:text-white"
                >
                  Back to home
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
              save("published");
            }}
            className="mt-8 rounded-[24px] border border-rb-border bg-rb-card p-6 shadow-[0_16px_34px_rgba(74,53,35,0.12)] sm:p-8"
          >
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
                hint="Write it the way a student would scan it, for example “Machine learning for early disease detection”."
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
                    placeholder="Machine learning for early disease detection"
                    className={controlState(invalid)}
                  />
                )}
              </Field>

              <Field
                id="description"
                label={FIELD_LABELS.description}
                hint="Cover the research question, what a student would actually do week to week, and any skills that help."
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

              <div className="grid gap-7 sm:grid-cols-2">
                <Field
                  id="department"
                  label={FIELD_LABELS.department}
                  hint="Students filter by department first."
                  error={visibleErrors.department}
                >
                  {({ describedBy, invalid }) => (
                    <select
                      id="department"
                      name="department"
                      required
                      value={values.department}
                      onChange={(event) => update("department", event.target.value)}
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      className={controlState(invalid)}
                    >
                      <option value="">Select a department</option>
                      {DEPARTMENTS.map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>

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
                          "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[15px] font-semibold transition hover:border-rb-accent has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[rgba(217,121,35,0.22)] " +
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
                          className="h-[18px] w-[18px] shrink-0 accent-[#b83e28]"
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
            </div>

            {storageError ? (
              <p
                role="alert"
                className="mt-7 flex items-start gap-2 rounded-2xl border border-[#e0b3a7] bg-[#fdf1ed] p-4 text-[13px] font-semibold leading-5 text-[#8f2d1c]"
              >
                <WarningIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{storageError}</span>
              </p>
            ) : null}

            <div className="mt-9 flex flex-col gap-3 border-t border-rb-border pt-7 sm:flex-row sm:items-center">
              <button
                type="submit"
                className="rounded-lg bg-rb-brand px-7 py-4 text-center font-bold text-white shadow-[0_10px_22px_rgba(132,43,26,0.2)] transition hover:-translate-y-0.5 hover:bg-rb-brand-hover sm:order-2"
              >
                Publish opportunity
              </button>
              <button
                type="button"
                onClick={() => save("draft")}
                className="rounded-lg border-2 border-[#251c18] px-7 py-4 text-center font-bold text-rb-ink transition hover:bg-[#251c18] hover:text-white sm:order-1"
              >
                Save draft
              </button>
              <p className="text-[13px] leading-5 text-rb-muted sm:order-3 sm:ml-2">
                Drafts stay private to you. Publishing makes the opportunity visible to
                students. Both are stored in this browser only for now.
              </p>
            </div>
          </form>
        ) : null}
      </div>
    </main>
  );
}
