import { getSupabaseBrowserClient } from "../supabase/client";

export async function resumeRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const { data, error } = await getSupabaseBrowserClient().auth.getSession();
  if (error || !data.session) throw new Error("Your session expired. Sign in again.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(typeof result?.error === "string" ? result.error : "The résumé request failed. Try again.");
  }
  return response;
}
