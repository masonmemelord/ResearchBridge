/** Shared create/edit values and validation. Database constraints and RLS remain authoritative. */
import {
  detailTextError,
  isPayPeriod,
  parsePayAmount,
  parseWeeklyHours,
  type PayPeriod,
  type WeeklyHours,
} from "./details.ts";

export type Opportunity = {
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
  /** What students will learn or gain. */
  learningOutcomes: string;
  /** Day-to-day duties and the skills students bring or will use. */
  dutiesAndSkills: string;
  weeklyHours: WeeklyHours;
  isPaid: boolean;
  /** Dollars per payPeriod; null when unpaid. */
  payAmount: number | null;
  payPeriod: PayPeriod | null;
  status: "draft" | "published" | "closed";
  createdAt: string;
};

export type School = Opportunity["school"];
export type ClassYear = Opportunity["eligibleClassYears"][number];
export type DurationSemesters = Opportunity["durationSemesters"];
export type DatabaseSchool =
  | "architecture"
  | "liberal_arts"
  | "public_health"
  | "science_and_engineering";
export type DatabaseClassYear = "freshman" | "sophomore" | "junior" | "senior";

export const SCHOOLS: readonly School[] = [
  "Architecture",
  "Liberal Arts",
  "Public Health",
  "Science and Engineering",
];

export const CLASS_YEARS: readonly ClassYear[] = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
];

export const DURATIONS: readonly { value: DurationSemesters; label: string }[] = [
  { value: 1, label: "1 semester" },
  { value: 2, label: "2 semesters" },
  { value: 3, label: "3 semesters" },
  { value: 4, label: "4 semesters" },
];

export const TITLE_MAX = 120;
export const DESCRIPTION_MIN = 30;
export const DEPARTMENT_MIN = 2;
export const DEPARTMENT_MAX = 100;
export const PREFERRED_MAJORS_MAX = 8;
export const PREFERRED_MAJOR_MIN_LENGTH = 2;
export const PREFERRED_MAJOR_MAX_LENGTH = 60;
/** Room for the maximum number of full-length majors joined by ", ". */
export const PREFERRED_MAJORS_INPUT_MAX =
  PREFERRED_MAJORS_MAX * PREFERRED_MAJOR_MAX_LENGTH + (PREFERRED_MAJORS_MAX - 1) * 2;
export const KEYWORDS_MAX = 8;
export const KEYWORD_MIN_LENGTH = 2;
export const KEYWORD_MAX_LENGTH = 30;
export const POSITIONS_MIN = 1;
export const POSITIONS_MAX = 20;

export const SCHOOL_TO_DATABASE: Record<School, DatabaseSchool> = {
  Architecture: "architecture",
  "Liberal Arts": "liberal_arts",
  "Public Health": "public_health",
  "Science and Engineering": "science_and_engineering",
};

export const CLASS_YEAR_TO_DATABASE: Record<ClassYear, DatabaseClassYear> = {
  Freshman: "freshman",
  Sophomore: "sophomore",
  Junior: "junior",
  Senior: "senior",
};

export function isSchool(value: string): value is School {
  return (SCHOOLS as readonly string[]).includes(value);
}

/**
 * Splits comma-separated input into trimmed, non-empty values. Duplicates are
 * compared case-insensitively; the first spelling the user typed is kept.
 */
export function parseCommaSeparatedList(value: string): string[] {
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
/* Form state and validation                                                  */
/* -------------------------------------------------------------------------- */

/** Raw input values; list fields stay as typed text until they are saved. */
export type FormValues = {
  title: string;
  description: string;
  school: string;
  department: string;
  preferredMajors: string;
  keywords: string;
  duration: string;
  classYears: ClassYear[];
  positions: string;
  learningOutcomes: string;
  dutiesAndSkills: string;
  hoursFrom: string;
  /** Optional upper end of a weekly hours range. */
  hoursTo: string;
  /** Unanswered until the professor picks Yes or No. */
  isPaid: "" | "yes" | "no";
  payAmount: string;
  payPeriod: string;
};

export type FieldName = keyof FormValues;
export type FormErrors = Partial<Record<FieldName, string>>;

export const EMPTY_FORM: FormValues = {
  title: "",
  description: "",
  school: "",
  department: "",
  preferredMajors: "",
  keywords: "",
  duration: "",
  classYears: [],
  positions: "1",
  learningOutcomes: "",
  dutiesAndSkills: "",
  hoursFrom: "",
  hoursTo: "",
  isPaid: "",
  payAmount: "",
  payPeriod: "",
};

/** Order used for the error summary and for focusing the first invalid field. */
export const FIELD_ORDER: FieldName[] = [
  "title",
  "description",
  "learningOutcomes",
  "dutiesAndSkills",
  "school",
  "department",
  "preferredMajors",
  "keywords",
  "duration",
  "hoursFrom",
  "hoursTo",
  "classYears",
  "positions",
  "isPaid",
  "payAmount",
  "payPeriod",
];

export const FIELD_LABELS: Record<FieldName, string> = {
  title: "Opportunity title",
  description: "Research description",
  school: "School",
  department: "Hosting department or discipline",
  preferredMajors: "Preferred majors",
  keywords: "Keywords",
  duration: "Research duration",
  classYears: "Eligible student class years",
  positions: "Positions available",
  learningOutcomes: "Learning outcomes",
  dutiesAndSkills: "Expected duties and skills",
  hoursFrom: "Time commitment",
  hoursTo: "Time commitment (upper hours)",
  isPaid: "Compensation",
  payAmount: "Pay amount",
  payPeriod: "Pay period",
};

/** Element that receives focus when a field is invalid. */
export const FIELD_FOCUS_IDS: Record<FieldName, string> = {
  title: "title",
  description: "description",
  school: "school",
  department: "department",
  preferredMajors: "preferred-majors",
  keywords: "keywords",
  duration: "duration",
  classYears: "class-year-freshman",
  positions: "positions",
  learningOutcomes: "learning-outcomes",
  dutiesAndSkills: "duties-and-skills",
  hoursFrom: "hours-from",
  hoursTo: "hours-to",
  isPaid: "is-paid-yes",
  payAmount: "pay-amount",
  payPeriod: "pay-period",
};

export type ListLimits = {
  singular: string;
  plural: string;
  maxItems: number;
  minLength: number;
  maxLength: number;
};

/** Checks count and per-item length of an already parsed list. Emptiness is the caller's call. */
export function validateList(items: readonly string[], limits: ListLimits): string | undefined {
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

export function validate(values: FormValues): FormErrors {
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

  if (!["1", "2", "3", "4"].includes(values.duration)) {
    errors.duration = "Choose how long students would work on this project.";
  }

  if (values.classYears.length === 0 || values.classYears.some((year) => !CLASS_YEARS.includes(year))) {
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

  errors.learningOutcomes = detailTextError(values.learningOutcomes, "what students will learn or gain");
  errors.dutiesAndSkills = detailTextError(values.dutiesAndSkills, "the expected duties and skills");

  const hours = parseWeeklyHours(values.hoursFrom, values.hoursTo);
  if (!hours.ok) errors[hours.field === "from" ? "hoursFrom" : "hoursTo"] = hours.message;

  if (!values.isPaid) {
    errors.isPaid = "Choose whether this position is paid.";
  } else if (values.isPaid === "yes") {
    const amount = parsePayAmount(values.payAmount);
    if (!amount.ok) errors.payAmount = amount.message;
    if (!isPayPeriod(values.payPeriod)) errors.payPeriod = "Choose what the amount covers.";
  }

  return errors;
}

export type OpportunityInput = Omit<Opportunity, "id" | "createdAt">;

export function parseOpportunity(
  values: FormValues,
  status: Opportunity["status"],
):
  | { ok: true; value: OpportunityInput }
  | { ok: false; errors: FormErrors } {
  const errors = validate(values);
  const hours = parseWeeklyHours(values.hoursFrom, values.hoursTo);
  const amount = values.isPaid === "yes" ? parsePayAmount(values.payAmount) : null;
  if (
    FIELD_ORDER.some((field) => errors[field]) ||
    !isSchool(values.school) || !hours.ok || (amount && !amount.ok)
  ) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      title: values.title.trim(),
      description: values.description.trim(),
      school: values.school,
      department: values.department.trim(),
      preferredMajors: parseCommaSeparatedList(values.preferredMajors),
      keywords: parseCommaSeparatedList(values.keywords),
      durationSemesters: Number(values.duration) as DurationSemesters,
      eligibleClassYears: values.classYears,
      positionsAvailable: Number(values.positions),
      learningOutcomes: values.learningOutcomes.trim(),
      dutiesAndSkills: values.dutiesAndSkills.trim(),
      weeklyHours: hours.value,
      isPaid: values.isPaid === "yes",
      payAmount: amount?.ok ? amount.value : null,
      payPeriod: values.isPaid === "yes" && isPayPeriod(values.payPeriod) ? values.payPeriod : null,
      status,
    },
  };
}

/** Explicit allowlist: editing must never write ownership, status, IDs, or timestamps. */
export function opportunityFields(input: OpportunityInput) {
  return {
    school: SCHOOL_TO_DATABASE[input.school],
    department: input.department,
    preferred_majors: input.preferredMajors,
    keywords: input.keywords,
    duration_semesters: input.durationSemesters,
    eligible_class_years: input.eligibleClassYears.map((year) => CLASS_YEAR_TO_DATABASE[year]),
    positions_available: input.positionsAvailable,
    learning_outcomes: input.learningOutcomes,
    duties_and_skills: input.dutiesAndSkills,
    weekly_hours_min: input.weeklyHours.min,
    weekly_hours_max: input.weeklyHours.max,
    is_paid: input.isPaid,
    pay_amount: input.payAmount,
    pay_period: input.payPeriod,
    title: input.title,
    description: input.description,
  };
}
