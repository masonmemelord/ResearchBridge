import type { SupabaseClient } from "@supabase/supabase-js";

/** Roles that have a ResearchBridge workspace in the frontend. */
export type SupportedRole = "admin" | "professor" | "student";

export type ProfileLookup =
  | { kind: "role"; role: SupportedRole }
  /** The profile exists but its role has no frontend workspace. */
  | { kind: "unsupported-role"; role: string }
  | { kind: "missing" }
  | { kind: "error"; error: unknown };

export const PROFESSOR_ROUTES = {
  /** The professor's listings and their applicants. */
  opportunities: "/professor/opportunities",
  newOpportunity: "/professor/opportunities/new",
} as const;

export const ADMIN_HOME = "/admin";

export const ROLE_HOME: Record<SupportedRole, string> = {
  admin: ADMIN_HOME,
  professor: PROFESSOR_ROUTES.opportunities,
  student: "/opportunities",
};

function isSupportedRole(value: unknown): value is SupportedRole {
  return value === "admin" || value === "professor" || value === "student";
}

/**
 * Reads the role from the signed-in user's own `public.profiles` row. The role
 * is never taken from client input; RLS on `profiles` and `opportunities`
 * remains the real authorization boundary.
 */
export async function fetchProfileRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileLookup> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (error) return { kind: "error", error };
    if (!data) return { kind: "missing" };

    const role: unknown = data.role;
    if (isSupportedRole(role)) return { kind: "role", role };
    return { kind: "unsupported-role", role: typeof role === "string" ? role : "unknown" };
  } catch (error) {
    return { kind: "error", error };
  }
}

export const AUTH_MESSAGES = {
  missingProfile:
    "Your sign-in worked, but this account has no ResearchBridge profile yet. Ask the ResearchBridge team to finish setting up your account, then sign in again.",
  unsupportedRole: (role: string) =>
    `This account's role (“${role}”) does not have a ResearchBridge workspace yet. Contact the ResearchBridge team if you expected professor or student access.`,
  profileUnavailable:
    "We could not load your account profile. Check your internet connection and try again. If this keeps happening, contact the ResearchBridge team.",
  notConfigured:
    "Supabase is not configured for this frontend. Check the public URL and anon-key environment variables.",
} as const;
