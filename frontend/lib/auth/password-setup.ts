import type { SupabaseClient } from "@supabase/supabase-js";
import { AUTH_MESSAGES, fetchProfileRole, type SupportedRole } from "./profile.ts";
import { NAME_MAX_LENGTH, normalizeFullName, passwordError } from "./signup.ts";

export type PasswordSetupResult = { ok: true; role: SupportedRole } | { ok: false; message: string };

/** Credentials stay in memory. Every retry checks the server-verified identity. */
export async function finishPasswordSetup(
  client: SupabaseClient,
  userId: string,
  password: string,
  fullName?: string,
): Promise<PasswordSetupResult> {
  const validation = passwordError(password, password);
  if (validation) return { ok: false, message: validation };
  const name = fullName === undefined ? undefined : normalizeFullName(fullName);
  if (name !== undefined && (!name || name.length > NAME_MAX_LENGTH)) {
    return { ok: false, message: `Enter your name using 1–${NAME_MAX_LENGTH} characters.` };
  }
  try {
    const current = await client.auth.getUser();
    if (current.error || !current.data.user || current.data.user.id !== userId || !current.data.user.email_confirmed_at) {
      return { ok: false, message: "Your verification session ended or changed. Use Forgot password to finish securely." };
    }
    const updated = await client.auth.updateUser({ password });
    // Retries can repeat a completed password write after a network response
    // was lost. Only the documented same_password code is safe to accept.
    if (updated.error && updated.error.code !== "same_password") {
      return { ok: false, message: updated.error.code === "weak_password"
        ? "Choose a stronger password and try again."
        : "We could not set your password. Retry here, or use Forgot password if your session has ended." };
    }
    if (name !== undefined) {
      const profile = await client.from("profiles").update({ full_name: name }).eq("id", userId).select("id").single();
      if (profile.error || !profile.data) {
        return { ok: false, message: "Your password is set, but your name could not be saved. Retry to finish setup." };
      }
    }
    const profile = await fetchProfileRole(client, userId);
    if (profile.kind !== "role") return { ok: false, message: profile.kind === "missing" ? AUTH_MESSAGES.missingProfile : AUTH_MESSAGES.profileUnavailable };
    return { ok: true, role: profile.role };
  } catch {
    return { ok: false, message: "Setup could not finish. Check your connection and retry, or use Forgot password." };
  }
}
