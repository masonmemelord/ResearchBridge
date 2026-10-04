/**
 * Admin dashboard data access. Every call is authorized in Postgres: RLS
 * policies for reads and security-definer functions (admin_list_users,
 * admin_set_user_role, admin_set_opportunity_status) that check the caller's
 * admin role. Hiding the dashboard from other roles is only a convenience.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeProfessorOpportunities,
  type ProfessorOpportunity,
  type Result,
} from "../applications/applications.ts";

export type AccountRole = "admin" | "professor" | "student";
/** Roles an admin may assign in the app. Admins are appointed in the database only. */
export type AssignableRole = "professor" | "student";

export type AdminUser = {
  id: string;
  email: string;
  fullName: string | null;
  /** null when the account has no profile yet (cannot use the app). */
  role: AccountRole | null;
  createdAt: string;
  lastSignInAt: string | null;
};

export type AdminOpportunity = ProfessorOpportunity & { professorName: string | null };

export const ADMIN_MESSAGES = {
  usersFailed: "Accounts could not be loaded. Check your connection and try again.",
  postingsFailed: "Postings could not be loaded. Check your connection and try again.",
  forbidden: "Your account does not have admin access. Sign out and back in, or contact another admin.",
  roleFailed: "The role could not be changed. Check your connection and try again.",
  ownRole: "You cannot change your own role.",
  adminRole: "Admin roles are managed in the Supabase SQL editor, not in the app.",
  notFound: "That record no longer exists. Refresh the list.",
  statusFailed: "The posting could not be updated. Check your connection and try again.",
} as const;

const OPPORTUNITY_COLUMNS =
  "id,title,status,created_at,positions_available,professor:profiles(full_name),applications(id,student_name,student_email,message,created_at)";

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRole(value: unknown): AccountRole | null {
  return value === "admin" || value === "professor" || value === "student" ? value : null;
}

export function normalizeAdminUsers(rows: readonly unknown[]): AdminUser[] {
  const users: AdminUser[] = [];
  for (const row of rows) {
    if (typeof row !== "object" || row === null) continue;
    const record = row as Record<string, unknown>;
    const id = asText(record.id);
    if (!id) continue;
    users.push({
      id,
      email: asText(record.email),
      fullName: asText(record.full_name) || null,
      role: asRole(record.role),
      createdAt: asText(record.created_at),
      lastSignInAt: asText(record.last_sign_in_at) || null,
    });
  }
  return users;
}

export function normalizeAdminOpportunities(rows: readonly unknown[]): AdminOpportunity[] {
  const names = new Map<string, string | null>();
  for (const row of rows) {
    if (typeof row !== "object" || row === null) continue;
    const record = row as Record<string, unknown>;
    const professor = record.professor;
    const name =
      typeof professor === "object" && professor !== null && !Array.isArray(professor)
        ? asText((professor as Record<string, unknown>).full_name)
        : "";
    names.set(asText(record.id), name || null);
  }
  return normalizeProfessorOpportunities(rows).map((opportunity) => ({
    ...opportunity,
    professorName: names.get(opportunity.id) ?? null,
  }));
}

/** Case-insensitive match on name or email, plus an optional role filter. */
export function filterUsers(
  users: readonly AdminUser[],
  query: string,
  role: AccountRole | "none" | "all",
): AdminUser[] {
  const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return users.filter((user) => {
    if (role === "none" && user.role !== null) return false;
    if (role !== "all" && role !== "none" && user.role !== role) return false;
    const haystack = `${user.fullName ?? ""}\n${user.email}`.toLocaleLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function filterAdminOpportunities(
  opportunities: readonly AdminOpportunity[],
  query: string,
  status: string,
): AdminOpportunity[] {
  const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return opportunities.filter((opportunity) => {
    if (status !== "all" && opportunity.status !== status) return false;
    const haystack = `${opportunity.title}\n${opportunity.professorName ?? ""}`.toLocaleLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

function adminErrorMessage(error: { code?: string; message?: string } | null, fallback: string): string {
  if (!error) return fallback;
  if (error.code === "P0002") return ADMIN_MESSAGES.notFound;
  if (error.code === "22023") return ADMIN_MESSAGES.adminRole;
  if (error.code === "42501") {
    if (error.message?.includes("their own role")) return ADMIN_MESSAGES.ownRole;
    if (error.message?.includes("admin roles")) return ADMIN_MESSAGES.adminRole;
    return ADMIN_MESSAGES.forbidden;
  }
  return fallback;
}

export async function loadAdminUsers(client: SupabaseClient): Promise<Result<AdminUser[]>> {
  try {
    const { data, error } = await client.rpc("admin_list_users");
    if (error) {
      console.error("admin_list_users failed", error);
      return { ok: false, message: adminErrorMessage(error, ADMIN_MESSAGES.usersFailed) };
    }
    return { ok: true, value: normalizeAdminUsers(Array.isArray(data) ? data : []) };
  } catch (error) {
    console.error("admin_list_users failed", error);
    return { ok: false, message: ADMIN_MESSAGES.usersFailed };
  }
}

export async function setUserRole(
  client: SupabaseClient,
  userId: string,
  role: AssignableRole,
): Promise<Result<AssignableRole>> {
  try {
    const { error } = await client.rpc("admin_set_user_role", {
      target_user_id: userId,
      new_role: role,
    });
    if (error) {
      console.error("admin_set_user_role failed", error);
      return { ok: false, message: adminErrorMessage(error, ADMIN_MESSAGES.roleFailed) };
    }
    return { ok: true, value: role };
  } catch (error) {
    console.error("admin_set_user_role failed", error);
    return { ok: false, message: ADMIN_MESSAGES.roleFailed };
  }
}

export async function loadAllOpportunities(
  client: SupabaseClient,
): Promise<Result<AdminOpportunity[]>> {
  try {
    const { data, error } = await client
      .from("opportunities")
      .select(OPPORTUNITY_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Admin opportunity query failed", error);
      return { ok: false, message: ADMIN_MESSAGES.postingsFailed };
    }
    return { ok: true, value: normalizeAdminOpportunities(data ?? []) };
  } catch (error) {
    console.error("Admin opportunity query failed", error);
    return { ok: false, message: ADMIN_MESSAGES.postingsFailed };
  }
}

export async function setOpportunityStatus(
  client: SupabaseClient,
  opportunityId: string,
  status: "published" | "closed",
): Promise<Result<"published" | "closed">> {
  try {
    const { error } = await client.rpc("admin_set_opportunity_status", {
      target_opportunity_id: opportunityId,
      new_status: status,
    });
    if (error) {
      console.error("admin_set_opportunity_status failed", error);
      return { ok: false, message: adminErrorMessage(error, ADMIN_MESSAGES.statusFailed) };
    }
    return { ok: true, value: status };
  } catch (error) {
    console.error("admin_set_opportunity_status failed", error);
    return { ok: false, message: ADMIN_MESSAGES.statusFailed };
  }
}
