/**
 * Read model for the student opportunity browser. Rows from Supabase are
 * treated as untrusted shapes and normalized so older or partial rows render
 * with fallbacks instead of crashing the page.
 */

export const PUBLISHED_OPPORTUNITY_COLUMNS =
  "id,title,description,school,department,preferred_majors,keywords,duration_semesters,eligible_class_years,positions_available,created_at";

export const SCHOOL_LABELS: Readonly<Record<string, string>> = {
  architecture: "Architecture",
  liberal_arts: "Liberal Arts",
  public_health: "Public Health",
  science_and_engineering: "Science and Engineering",
};

export const CLASS_YEAR_LABELS: Readonly<Record<string, string>> = {
  freshman: "Freshman",
  sophomore: "Sophomore",
  junior: "Junior",
  senior: "Senior",
};

export const DURATION_OPTIONS: readonly number[] = [1, 2, 3, 4];

export type PublishedOpportunity = {
  id: string;
  title: string;
  description: string;
  /** Raw database value; may be null or a value this frontend does not know. */
  school: string | null;
  department: string;
  preferredMajors: string[];
  keywords: string[];
  durationSemesters: number | null;
  /** Lowercase database values, e.g. "junior". */
  eligibleClassYears: string[];
  positionsAvailable: number | null;
  /** Lowercased title, department, description, majors, and keywords. */
  searchText: string;
};

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asPositiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

/** Returns null only for rows that cannot be identified (no id). */
export function normalizeOpportunity(row: unknown): PublishedOpportunity | null {
  if (typeof row !== "object" || row === null) return null;
  const record = row as Record<string, unknown>;
  const id = asText(record.id);
  if (!id) return null;

  const title = asText(record.title);
  const description = asText(record.description);
  const department = asText(record.department);
  const preferredMajors = asTextList(record.preferred_majors);
  const keywords = asTextList(record.keywords);

  return {
    id,
    title,
    description,
    school: asText(record.school) || null,
    department,
    preferredMajors,
    keywords,
    durationSemesters: asPositiveInteger(record.duration_semesters),
    eligibleClassYears: asTextList(record.eligible_class_years).map((year) =>
      year.toLocaleLowerCase(),
    ),
    positionsAvailable: asPositiveInteger(record.positions_available),
    searchText: [title, department, description, ...preferredMajors, ...keywords]
      .join("\n")
      .toLocaleLowerCase(),
  };
}

export function normalizeOpportunities(rows: readonly unknown[]): PublishedOpportunity[] {
  const result: PublishedOpportunity[] = [];
  for (const row of rows) {
    const opportunity = normalizeOpportunity(row);
    if (opportunity) result.push(opportunity);
    else console.warn("Skipped a published opportunity row without an id", row);
  }
  return result;
}

/** "school_of_medicine" → "School Of Medicine"; used for values this build does not know. */
function humanize(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function schoolLabel(school: string | null): string {
  if (!school) return "School not listed";
  return SCHOOL_LABELS[school] ?? humanize(school);
}

export function classYearLabel(year: string): string {
  return CLASS_YEAR_LABELS[year] ?? humanize(year);
}

export function durationLabel(semesters: number | null): string {
  if (semesters === null) return "Duration not listed";
  return `${semesters} ${semesters === 1 ? "semester" : "semesters"}`;
}

/* -------------------------------------------------------------------------- */
/* Filters                                                                    */
/* -------------------------------------------------------------------------- */

export const ALL = "all";

export type OpportunityFilters = {
  /** A school database value, or ALL. */
  school: string;
  /** A semester count as a string, or ALL. */
  duration: string;
  /** A lowercase class-year database value, or ALL. */
  classYear: string;
  query: string;
};

export const EMPTY_FILTERS: OpportunityFilters = {
  school: ALL,
  duration: ALL,
  classYear: ALL,
  query: "",
};

export function hasActiveFilters(filters: OpportunityFilters): boolean {
  return (
    filters.school !== ALL ||
    filters.duration !== ALL ||
    filters.classYear !== ALL ||
    filters.query.trim() !== ""
  );
}

/** Known schools first, then any other school values present in the data. */
export function schoolOptions(
  opportunities: readonly PublishedOpportunity[],
): { value: string; label: string }[] {
  const known = Object.keys(SCHOOL_LABELS);
  const extra = [
    ...new Set(
      opportunities
        .map((opportunity) => opportunity.school)
        .filter((school): school is string => school !== null && !known.includes(school)),
    ),
  ].sort();
  return [...known, ...extra].map((value) => ({ value, label: schoolLabel(value) }));
}

/**
 * All active filters must match (AND). The search query is split on
 * whitespace and every word must appear, case-insensitively, somewhere in the
 * title, department, description, preferred majors, or keywords.
 */
export function filterOpportunities(
  opportunities: readonly PublishedOpportunity[],
  filters: OpportunityFilters,
): PublishedOpportunity[] {
  const terms = filters.query.toLocaleLowerCase().split(/\s+/).filter(Boolean);

  return opportunities.filter(
    (opportunity) =>
      (filters.school === ALL || opportunity.school === filters.school) &&
      (filters.duration === ALL || String(opportunity.durationSemesters) === filters.duration) &&
      (filters.classYear === ALL || opportunity.eligibleClassYears.includes(filters.classYear)) &&
      terms.every((term) => opportunity.searchText.includes(term)),
  );
}
