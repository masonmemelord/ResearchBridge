import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CLASS_YEARS, CLASS_YEAR_TO_DATABASE, SCHOOL_TO_DATABASE,
  opportunityFields, type FormValues, type Opportunity, type OpportunityInput, type School,
} from "./form.ts";
import type { Result } from "../applications/applications.ts";

export type EditableOpportunity = {
  id: string;
  professorId: string;
  updatedAt: string;
  status: Opportunity["status"];
  values: FormValues;
};

const EDIT_COLUMNS = "id,professor_id,updated_at,status,title,description,school,department,preferred_majors,keywords,duration_semesters,eligible_class_years,positions_available,learning_outcomes,duties_and_skills,weekly_hours_min,weekly_hours_max,is_paid,pay_amount,pay_period";
export const EDIT_MESSAGES = {
  unavailable: "This opportunity is unavailable or does not belong to your professor account.",
  loadFailed: "We could not load this opportunity. Check your connection and try again.",
  conflict: "This listing changed since you opened it, or you no longer have permission to edit it. Your entries are still here. Reload the latest version before saving again.",
  saveFailed: "Your changes could not be saved. Your entries are still here; check your connection and try again.",
} as const;

const text = (value: unknown) => typeof value === "string" ? value : "";
const numberInput = (value: unknown) => typeof value === "number" || typeof value === "string" ? String(value) : "";
const list = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

export function normalizeEditableOpportunity(row: unknown): EditableOpportunity | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = text(r.id), professorId = text(r.professor_id), updatedAt = text(r.updated_at);
  if (!id || !professorId || !updatedAt || !["draft", "published", "closed"].includes(text(r.status))) return null;
  const school = (Object.keys(SCHOOL_TO_DATABASE) as School[]).find((key) => SCHOOL_TO_DATABASE[key] === r.school) ?? "";
  return {
    id, professorId, updatedAt, status: r.status as Opportunity["status"],
    values: {
      title: text(r.title), description: text(r.description), school, department: text(r.department),
      preferredMajors: list(r.preferred_majors).join(", "), keywords: list(r.keywords).join(", "),
      duration: numberInput(r.duration_semesters), positions: numberInput(r.positions_available),
      classYears: CLASS_YEARS.filter((year) => list(r.eligible_class_years).includes(CLASS_YEAR_TO_DATABASE[year])),
      learningOutcomes: text(r.learning_outcomes), dutiesAndSkills: text(r.duties_and_skills),
      hoursFrom: numberInput(r.weekly_hours_min), hoursTo: numberInput(r.weekly_hours_max),
      isPaid: r.is_paid === true ? "yes" : r.is_paid === false ? "no" : "",
      payAmount: r.is_paid === true ? numberInput(r.pay_amount) : "",
      payPeriod: r.is_paid === true ? text(r.pay_period) : "",
    },
  };
}

/** Owner filter narrows the read; Postgres RLS authorizes every request. */
export async function loadOpportunityForEditing(
  client: SupabaseClient, id: string, professorId: string,
): Promise<Result<EditableOpportunity>> {
  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)) {
    return { ok: false, message: EDIT_MESSAGES.unavailable };
  }
  try {
    const { data, error } = await client.from("opportunities").select(EDIT_COLUMNS)
      .eq("id", id).eq("professor_id", professorId).maybeSingle();
    if (error) return { ok: false, message: EDIT_MESSAGES.loadFailed };
    const record = normalizeEditableOpportunity(data);
    if (!record || record.professorId !== professorId) return { ok: false, message: EDIT_MESSAGES.unavailable };
    return { ok: true, value: record };
  } catch {
    return { ok: false, message: EDIT_MESSAGES.loadFailed };
  }
}

/** Atomic compare-and-update avoids overwriting another tab or an admin's status change. */
export async function updateOpportunity(
  client: SupabaseClient, existing: EditableOpportunity, input: OpportunityInput,
): Promise<Result<{ id: string; createdAt: string }>> {
  try {
    const { data, error } = await client.from("opportunities").update(opportunityFields(input))
      .eq("id", existing.id).eq("professor_id", existing.professorId)
      .eq("updated_at", existing.updatedAt).select("id,created_at").maybeSingle();
    if (error) return { ok: false, message: error.code === "42501" ? EDIT_MESSAGES.unavailable : EDIT_MESSAGES.saveFailed };
    if (!data) return { ok: false, message: EDIT_MESSAGES.conflict };
    return { ok: true, value: { id: data.id, createdAt: data.created_at } };
  } catch {
    return { ok: false, message: EDIT_MESSAGES.saveFailed };
  }
}
