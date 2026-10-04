/**
 * Student applications: contracts, validation, normalization, and the
 * Supabase calls the pages make. Postgres RLS on `applications` is the
 * authorization boundary; these helpers only shape requests and responses.
 *
 * The applicant's name and email are copied by a database trigger at insert
 * time. Never send them from the browser.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const APPLICATION_MESSAGE_MAX = 1000;

/** A signed-in student's own application, keyed by opportunity on the browse page. */
export type MyApplication = {
  id: string;
  opportunityId: string;
  createdAt: string;
};

export type Applicant = {
  id: string;
  name: string | null;
  email: string;
  message: string | null;
  createdAt: string;
};

export type ProfessorOpportunity = {
  id: string;
  title: string;
  /** "draft" | "published" | "closed", or an unknown future value. */
  status: string;
  createdAt: string;
  positionsAvailable: number | null;
  /** Newest first. */
  applicants: Applicant[];
};

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

const MY_APPLICATION_COLUMNS = "id,opportunity_id,created_at";
const PROFESSOR_OPPORTUNITY_COLUMNS =
  "id,title,status,created_at,positions_available,applications(id,student_name,student_email,message,created_at)";

export const APPLICATION_MESSAGES = {
  loadFailed:
    "Your applications could not be loaded. Check your internet connection and try again.",
  network: "We could not reach ResearchBridge. Check your internet connection and try again.",
  duplicate: "You have already applied to this opportunity.",
  notAllowed:
    "This opportunity is not accepting applications from this account. It may have been unpublished, or your account may not be a student account.",
  withdrawFailed:
    "Your application could not be withdrawn. Check your internet connection and try again.",
  professorLoadFailed:
    "Your opportunities could not be loaded. Check your internet connection and try again. If this keeps happening, contact the ResearchBridge team.",
} as const;

/* -------------------------------------------------------------------------- */
/* Pure helpers                                                               */
/* -------------------------------------------------------------------------- */

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Returns an error message, or undefined when the optional message is valid. */
export function applicationMessageError(message: string): string | undefined {
  if (message.trim().length > APPLICATION_MESSAGE_MAX) {
    return `Keep your message to ${APPLICATION_MESSAGE_MAX} characters or fewer.`;
  }
  return undefined;
}

/** Maps a Supabase/PostgREST error to a message a student can act on. */
export function applyErrorMessage(error: { code?: string } | null | undefined): string {
  if (error?.code === "23505") return APPLICATION_MESSAGES.duplicate;
  if (error?.code === "42501") return APPLICATION_MESSAGES.notAllowed;
  return APPLICATION_MESSAGES.network;
}

export function normalizeMyApplication(row: unknown): MyApplication | null {
  if (typeof row !== "object" || row === null) return null;
  const record = row as Record<string, unknown>;
  const id = asText(record.id);
  const opportunityId = asText(record.opportunity_id);
  if (!id || !opportunityId) return null;
  return { id, opportunityId, createdAt: asText(record.created_at) };
}

/** Keyed by opportunity id. Rows without ids are skipped. */
export function normalizeMyApplications(rows: readonly unknown[]): Map<string, MyApplication> {
  const byOpportunity = new Map<string, MyApplication>();
  for (const row of rows) {
    const application = normalizeMyApplication(row);
    if (application) byOpportunity.set(application.opportunityId, application);
  }
  return byOpportunity;
}

function normalizeApplicant(row: unknown): Applicant | null {
  if (typeof row !== "object" || row === null) return null;
  const record = row as Record<string, unknown>;
  const id = asText(record.id);
  const email = asText(record.student_email);
  if (!id || !email) return null;
  return {
    id,
    name: asText(record.student_name) || null,
    email,
    message: asText(record.message) || null,
    createdAt: asText(record.created_at),
  };
}

function byNewest(a: { createdAt: string }, b: { createdAt: string }): number {
  return b.createdAt.localeCompare(a.createdAt);
}

export function normalizeProfessorOpportunities(rows: readonly unknown[]): ProfessorOpportunity[] {
  const result: ProfessorOpportunity[] = [];
  for (const row of rows) {
    if (typeof row !== "object" || row === null) continue;
    const record = row as Record<string, unknown>;
    const id = asText(record.id);
    if (!id) continue;
    const applicantRows = Array.isArray(record.applications) ? record.applications : [];
    const positions = record.positions_available;
    result.push({
      id,
      title: asText(record.title),
      status: asText(record.status) || "unknown",
      createdAt: asText(record.created_at),
      positionsAvailable:
        typeof positions === "number" && Number.isInteger(positions) && positions > 0
          ? positions
          : null,
      applicants: applicantRows
        .map(normalizeApplicant)
        .filter((applicant): applicant is Applicant => applicant !== null)
        .sort(byNewest),
    });
  }
  return result.sort(byNewest);
}

/** "Oct 4, 2026"; falls back to an empty string for unparseable values. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function statusLabel(status: string): string {
  switch (status) {
    case "published":
      return "Published";
    case "draft":
      return "Draft";
    case "closed":
      return "Closed";
    default:
      return "Unknown status";
  }
}

/** Mailto link for an applicant; the address comes from Supabase Auth, not free text. */
export function applicantEmailHref(email: string, opportunityTitle: string): string {
  const safeTitle = opportunityTitle.replace(/[\x00-\x1f\x7f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  const subject = `Your ResearchBridge application: ${safeTitle || "Research opportunity"}`;
  return `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}?subject=${encodeURIComponent(subject)}`;
}

/* -------------------------------------------------------------------------- */
/* Supabase calls                                                             */
/* -------------------------------------------------------------------------- */

export async function loadMyApplications(
  client: SupabaseClient,
  studentId: string,
): Promise<Result<Map<string, MyApplication>>> {
  try {
    const { data, error } = await client
      .from("applications")
      .select(MY_APPLICATION_COLUMNS)
      .eq("student_id", studentId);
    if (error) {
      console.error("Supabase application query failed", error);
      return { ok: false, message: APPLICATION_MESSAGES.loadFailed };
    }
    return { ok: true, value: normalizeMyApplications(data ?? []) };
  } catch (error) {
    console.error("Supabase application query failed", error);
    return { ok: false, message: APPLICATION_MESSAGES.loadFailed };
  }
}

export async function submitApplication(
  client: SupabaseClient,
  input: { opportunityId: string; studentId: string; message: string },
): Promise<Result<MyApplication>> {
  const message = input.message.trim();
  const invalid = applicationMessageError(message);
  if (invalid) return { ok: false, message: invalid };

  try {
    const { data, error } = await client
      .from("applications")
      .insert({
        opportunity_id: input.opportunityId,
        student_id: input.studentId,
        message: message || null,
      })
      .select(MY_APPLICATION_COLUMNS)
      .single();
    if (error) {
      console.error("Supabase application insert failed", error);
      return { ok: false, message: applyErrorMessage(error) };
    }
    const application = normalizeMyApplication(data);
    if (!application) return { ok: false, message: APPLICATION_MESSAGES.network };
    return { ok: true, value: application };
  } catch (error) {
    console.error("Supabase application insert failed", error);
    return { ok: false, message: APPLICATION_MESSAGES.network };
  }
}

export async function withdrawApplication(
  client: SupabaseClient,
  applicationId: string,
): Promise<Result<null>> {
  try {
    const { error } = await client.from("applications").delete().eq("id", applicationId);
    if (error) {
      console.error("Supabase application delete failed", error);
      return { ok: false, message: APPLICATION_MESSAGES.withdrawFailed };
    }
    // A delete that matches no row also succeeds: the application is already
    // gone (for example, its listing was deleted), which is the desired state.
    return { ok: true, value: null };
  } catch (error) {
    console.error("Supabase application delete failed", error);
    return { ok: false, message: APPLICATION_MESSAGES.withdrawFailed };
  }
}

export async function loadProfessorOpportunities(
  client: SupabaseClient,
  professorId: string,
): Promise<Result<ProfessorOpportunity[]>> {
  try {
    const { data, error } = await client
      .from("opportunities")
      .select(PROFESSOR_OPPORTUNITY_COLUMNS)
      .eq("professor_id", professorId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Supabase professor opportunity query failed", error);
      return { ok: false, message: APPLICATION_MESSAGES.professorLoadFailed };
    }
    return { ok: true, value: normalizeProfessorOpportunities(data ?? []) };
  } catch (error) {
    console.error("Supabase professor opportunity query failed", error);
    return { ok: false, message: APPLICATION_MESSAGES.professorLoadFailed };
  }
}
