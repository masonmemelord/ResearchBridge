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
import logo from "../../../TRALogo.png";

/* -------------------------------------------------------------------------- */
/* Domain types and reference data                                            */
/* -------------------------------------------------------------------------- */

/**
 * Version of the stored record shape. Bump it whenever stored fields change so
 * older localStorage entries can be told apart and migrated.
 */
const OPPORTUNITY_SCHEMA_VERSION = 2;

type Opportunity = {
  schemaVersion: typeof OPPORTUNITY_SCHEMA_VERSION;
  id: string;
  title: string;
  description: string;
  /** Broader academic school, e.g. "Science and Engineering". */
  school: "Architecture" | "Liberal Arts" | "Public Health" | "Science and Engineering";
  /** Unit hosting the research, e.g. "Cell and Molecular Biology". */
  department: string;
  /** Likely academic backgrounds. Empty means open to all majors; never a hard restriction. */
  preferredMajors: string[];
  /** Search terms that help students discover the opportunity. */
  keywords: string[];
  durationSemesters: 1 | 2 | 3 | 4;
  eligibleClassYears: ("Freshman" | "Sophomore" | "Junior" | "Senior")[];
  positionsAvailable: number;
  status: "draft" | "published";
  createdAt: string;
};

type School = Opportunity["school"];
type ClassYear = Opportunity["eligibleClassYears"][number];
type DurationSemesters = Opportunity["durationSemesters"];

const SCHOOLS: readonly School[] = [
  "Architecture",
  "Liberal Arts",
  "Public Health",
  "Science and Engineering",
];

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
const DEPARTMENT_MIN = 2;
const DEPARTMENT_MAX = 100;
const PREFERRED_MAJORS_MAX = 8;
const PREFERRED_MAJOR_MIN_LENGTH = 2;
const PREFERRED_MAJOR_MAX_LENGTH = 60;
/** Room for the maximum number of full-length majors joined by ", ". */
const PREFERRED_MAJORS_INPUT_MAX =
  PREFERRED_MAJORS_MAX * PREFERRED_MAJOR_MAX_LENGTH + (PREFERRED_MAJORS_MAX - 1) * 2;
const KEYWORDS_MAX = 8;
const KEYWORD_MIN_LENGTH = 2;
const KEYWORD_MAX_LENGTH = 30;
const POSITIONS_MIN = 1;
const POSITIONS_MAX = 20;

function isSchool(value: string): value is School {
  return (SCHOOLS as readonly string[]).includes(value);
}

/**
 * Splits comma-separated input into trimmed, non-empty values. Duplicates are
 * compared case-insensitively; the first spelling the user typed is kept.
 */
function parseCommaSeparatedList(value: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of value.split(",")) {
    const item = part.trim().replace(/\s+/g, " ");
    const key = item.toLocaleLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

/* -------------------------------------------------------------------------- */
/* Prototype persistence                                                      */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "researchbridge-opportunities"; //Write logic

/*
 * Temporary prototype storage. Every call happens in the browser only (event
 * handlers and the external-store snapshot below), never during server
 * rendering, and is expected to be replaced by a real data layer.
 *
 * Stored entries are never rewritten. An entry is one of:
 * - current: `schemaVersion: 2` and a fully valid Opportunity.
 * - legacy:  an object without `schemaVersion` (saved before school, majors and
 *            keywords existed). Kept verbatim; missing fields are not invented.
 *            These need a migration before moving to database persistence.
 * - invalid: anything else (non-objects, unknown versions, broken v2 records).
 */

type StoredEntryKind = "current" | "legacy" | "invalid";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isCurrentOpportunity(value: unknown): value is Opportunity {
  if (!isRecord(value) || value.schemaVersion !== OPPORTUNITY_SCHEMA_VERSION) return false;
  const years = value.eligibleClassYears;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    typeof value.school === "string" &&
    isSchool(value.school) &&
    typeof value.department === "string" &&
    isStringArray(value.preferredMajors) &&
    isStringArray(value.keywords) &&
    DURATIONS.some((duration) => duration.value === value.durationSemesters) &&
    isStringArray(years) &&
    years.every((year) => (CLASS_YEARS as readonly string[]).includes(year)) &&
    typeof value.positionsAvailable === "number" &&
    Number.isInteger(value.positionsAvailable) &&
    (value.status === "draft" || value.status === "published") &&
    typeof value.createdAt === "string"
  );
}

function classifyStoredEntry(entry: unknown): StoredEntryKind {
  if (!isRecord(entry)) return "invalid";
  if (!("schemaVersion" in entry)) return "legacy";
  return isCurrentOpportunity(entry) ? "current" : "invalid";
}

/** Thrown instead of writing when the stored value exists but is not a JSON array. */
class UnreadableStoredDataError extends Error {}

/** Parses the raw stored value. `null` means data exists but cannot be read as an array. */
function parseStoredEntries(raw: string | null): unknown[] | null {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Appends without touching anything already saved and returns the new total.
 * Throws if storage is unavailable, or UnreadableStoredDataError if the existing
 * value would otherwise be overwritten.
 */
function appendStoredOpportunity(opportunity: Opportunity): number {
  const existing = parseStoredEntries(window.localStorage.getItem(STORAGE_KEY));
  if (existing === null) throw new UnreadableStoredDataError();
  const next = [...existing, opportunity];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  notifyStoredOpportunitiesChanged();
  return next.length;
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

type StorageSummary = {
  /** The stored value exists but is not a readable JSON array. */
  unreadable: boolean;
  total: number;
  current: number;
  legacy: number;
  invalid: number;
};

const EMPTY_SUMMARY: StorageSummary = {
  unreadable: false,
  total: 0,
  current: 0,
  legacy: 0,
  invalid: 0,
};

function summarizeStoredEntries(raw: string | null): StorageSummary {
  const entries = parseStoredEntries(raw);
  if (entries === null) return { ...EMPTY_SUMMARY, unreadable: true };
  const summary = { ...EMPTY_SUMMARY, total: entries.length };
  for (const entry of entries) summary[classifyStoredEntry(entry)] += 1;
  return summary;
}

// useSyncExternalStore requires a stable snapshot, so the summary is cached by raw value.
let cachedRaw: string | null | undefined;
let cachedSummary: StorageSummary = EMPTY_SUMMARY;

function getStorageSummary(): StorageSummary | null {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage is blocked; saving reports its own error.
    return EMPTY_SUMMARY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSummary = summarizeStoredEntries(raw);
  }
  return cachedSummary;
}

function getServerStorageSummary(): StorageSummary | null {
  return null;
}

function useStorageSummary(): StorageSummary | null {
  return useSyncExternalStore(
    subscribeToStoredOpportunities,
    getStorageSummary,
    getServerStorageSummary,
  );
}

/* -------------------------------------------------------------------------- */
/* Form state and validation                                                  */
/* -------------------------------------------------------------------------- */

/** Raw input values; list fields stay as typed text until they are saved. */
type FormValues = {
  title: string;
  description: string;
  school: string;
  department: string;
  preferredMajors: string;
  keywords: string;
  duration: string;
  classYears: ClassYear[];
  positions: string;
};

type FieldName = keyof FormValues;
type FormErrors = Partial<Record<FieldName, string>>;

const EMPTY_FORM: FormValues = {
  title: "",
  description: "",
  school: "",
  department: "",
  preferredMajors: "",
  keywords: "",
  duration: "",
  classYears: [],
  positions: "1",
};

/** Order used for the error summary and for focusing the first invalid field. */
const FIELD_ORDER: FieldName[] = [
  "title",
  "description",
  "school",
  "department",
  "preferredMajors",
  "keywords",
  "duration",
  "classYears",
  "positions",
];

const FIELD_LABELS: Record<FieldName, string> = {
  title: "Opportunity title",
  description: "Research description",
  school: "School",
  department: "Hosting department or discipline",
  preferredMajors: "Preferred majors",
  keywords: "Keywords",
  duration: "Research duration",
  classYears: "Eligible student class years",
  positions: "Positions available",
};

/** Element that receives focus when a field is invalid. */
const FIELD_FOCUS_IDS: Record<FieldName, string> = {
  title: "title",
  description: "description",
  school: "school",
  department: "department",
  preferredMajors: "preferred-majors",
  keywords: "keywords",
  duration: "duration",
  classYears: "class-year-freshman",
  positions: "positions",
};

type ListLimits = {
  singular: string;
  plural: string;
  maxItems: number;
  minLength: number;
  maxLength: number;
};

/** Checks count and per-item length of an already parsed list. Emptiness is the caller's call. */
function validateList(items: readonly string[], limits: ListLimits): string | undefined {
  const { singular, plural, maxItems, minLength, maxLength } = limits;
  const quote = (list: string[]) => list.map((item) => `“${item}”`).join(", ");
  const capitalized = plural.charAt(0).toUpperCase() + plural.slice(1);

  if (items.length > maxItems) {
    const extra = items.length - maxItems;
    return `Remove ${extra} ${extra === 1 ? singular : plural} (${maxItems} maximum).`;
  }
  const tooShort = items.filter((item) => item.length < minLength);
  if (tooShort.length > 0) {
    return `${capitalized} need at least ${minLength} characters. Lengthen or remove: ${quote(tooShort)}.`;
  }
  const tooLong = items.filter((item) => item.length > maxLength);
  if (tooLong.length > 0) {
    return `${capitalized} can be at most ${maxLength} characters. Shorten: ${quote(tooLong)}.`;
  }
  return undefined;
}

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

  if (!isSchool(values.school)) {
    errors.school = "Choose the school this opportunity belongs to.";
  }

  const department = values.department.trim();
  if (!department) {
    errors.department = "Enter the department or discipline hosting the research.";
  } else if (department.length < DEPARTMENT_MIN) {
    errors.department = `Use at least ${DEPARTMENT_MIN} characters for the department name.`;
  } else if (department.length > DEPARTMENT_MAX) {
    errors.department = `Shorten the department by ${department.length - DEPARTMENT_MAX} characters (${DEPARTMENT_MAX} maximum).`;
  }

  // Preferred majors are optional; an empty list means open to all majors.
  errors.preferredMajors = validateList(parseCommaSeparatedList(values.preferredMajors), {
    singular: "major",
    plural: "majors",
    maxItems: PREFERRED_MAJORS_MAX,
    minLength: PREFERRED_MAJOR_MIN_LENGTH,
    maxLength: PREFERRED_MAJOR_MAX_LENGTH,
  });

  const keywords = parseCommaSeparatedList(values.keywords);
  errors.keywords =
    keywords.length === 0
      ? "Add at least one keyword so students can find this opportunity."
      : validateList(keywords, {
          singular: "keyword",
          plural: "keywords",
          maxItems: KEYWORDS_MAX,
          minLength: KEYWORD_MIN_LENGTH,
          maxLength: KEYWORD_MAX_LENGTH,
        });

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

type SaveResult = { opportunity: Opportunity; total: number };

export default function NewOpportunityPage() {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [showErrors, setShowErrors] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SaveResult | null>(null);
  const storage = useStorageSummary();

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

  function save(status: Opportunity["status"]) {
    const nextErrors = validate(values);
    setShowErrors(true);
    setStorageError(null);

    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field]);
    // The isSchool check also narrows the type for the object below.
    if (firstInvalid || !isSchool(values.school)) {
      focusField(firstInvalid ?? "school");
      return;
    }

    const opportunity: Opportunity = {
      schemaVersion: OPPORTUNITY_SCHEMA_VERSION,
      id: crypto.randomUUID(),
      title: values.title.trim(),
      description: values.description.trim(),
      school: values.school,
      department: values.department.trim(),
      preferredMajors: parseCommaSeparatedList(values.preferredMajors),
      keywords: parseCommaSeparatedList(values.keywords),
      durationSemesters: Number(values.duration) as DurationSemesters,
      eligibleClassYears: values.classYears,
      positionsAvailable: Number(values.positions),
      status,
      createdAt: new Date().toISOString(),
    };

    try {
      const total = appendStoredOpportunity(opportunity);
      setSaved({ opportunity, total });
    } catch (error) {
      setStorageError(
        error instanceof UnreadableStoredDataError
          ? "Opportunities already saved in this browser could not be read, so nothing was saved to avoid overwriting them. Your form entries are still here."
          : "This browser blocked local storage, so the opportunity could not be saved. Check your privacy settings and try again.",
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
      <div className="h-1.5 bg-[linear-gradient(90deg,#006747_0_72%,#418fde_72%_100%)]" aria-hidden="true" />
      <nav className="mx-auto flex max-w-[900px] flex-wrap items-center justify-between gap-4 border-b border-rb-border px-5 py-4 sm:px-8">
        <Link href="/" aria-label="Research Ambassadors home" className="flex items-center gap-3">
          <Image src={logo} alt="The Research Ambassadors" className="h-14 w-14 rounded-full object-contain" priority />
          <span className="hidden leading-none sm:block">
            <span className="block font-serif text-base font-black tracking-tight text-rb-brand">Research Ambassadors</span>
            <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-rb-muted">Professor portal</span>
          </span>
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
          {storage?.unreadable ? (
            <p className="mt-4 flex items-start gap-2 text-sm font-semibold text-[#8f2d1c]">
              <WarningIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Saved opportunity data in this browser could not be read. It has been left
                untouched, and new opportunities cannot be saved until it is repaired.
              </span>
            </p>
          ) : storage && storage.total > 0 ? (
            <p className="mt-4 text-sm text-rb-muted">
              {storage.total} {storage.total === 1 ? "opportunity" : "opportunities"} already
              saved in this browser.
              {storage.legacy > 0
                ? ` ${storage.legacy} ${storage.legacy === 1 ? "uses" : "use"} an older format without school, majors, or keywords and will need migration.`
                : null}
              {storage.invalid > 0
                ? ` ${storage.invalid} could not be recognized and ${storage.invalid === 1 ? "was" : "were"} left as-is.`
                : null}
            </p>
          ) : null}
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
              </dl>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg bg-rb-brand px-6 py-3.5 text-center font-bold text-white shadow-[0_10px_22px_rgba(0,103,71,0.2)] transition hover:-translate-y-0.5 hover:bg-rb-brand-hover active:bg-rb-brand-active"
                >
                  Create another opportunity
                </button>
                <Link
                  href="/"
                  className="rounded-lg border-2 border-rb-brand px-6 py-3.5 text-center font-bold text-rb-ink transition hover:bg-[rgba(0,103,71,0.08)] hover:text-rb-brand active:bg-[rgba(0,103,71,0.16)]"
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
            className="mt-8 rounded-[24px] border border-rb-border bg-rb-card p-6 shadow-[0_16px_34px_rgba(17,17,17,0.10)] sm:p-8"
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
                className="rounded-lg bg-rb-brand px-7 py-4 text-center font-bold text-white shadow-[0_10px_22px_rgba(0,103,71,0.2)] transition hover:-translate-y-0.5 hover:bg-rb-brand-hover active:bg-rb-brand-active sm:order-2"
              >
                Publish opportunity
              </button>
              <button
                type="button"
                onClick={() => save("draft")}
                className="rounded-lg border-2 border-rb-brand px-7 py-4 text-center font-bold text-rb-ink transition hover:bg-[rgba(0,103,71,0.08)] hover:text-rb-brand active:bg-[rgba(0,103,71,0.16)] sm:order-1"
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
