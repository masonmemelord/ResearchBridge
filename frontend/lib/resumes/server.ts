import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resumeDemoEnabled } from "../release";

export class ResumeError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export const RESUME_COLUMNS = "id,original_name,byte_size,page_count,extracted_text,scan_result,model,created_at";

export async function studentClient(request: Request): Promise<{ client: SupabaseClient; userId: string }> {
  if (!resumeDemoEnabled()) throw new ResumeError("This feature is not part of the pilot release.", 404);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (process.env.LOCAL_RESUME_DEMO !== "true" || !url || !key ||
    !["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname)) {
    throw new ResumeError("This feature is a local demo. Start the app with npm run dev:local.", 503);
  }
  const token = request.headers.get("authorization")?.match(/^Bearer ([\w.-]+)$/)?.[1];
  if (!token || token.length > 4096) throw new ResumeError("Sign in with a student account.", 401);
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new ResumeError("Your session expired. Sign in again.", 401);
  const { data: profile, error: profileError } = await client.from("profiles")
    .select("role").eq("id", data.user.id).maybeSingle();
  if (profileError) throw new ResumeError("We could not check your profile. Try again.", 503);
  if (profile?.role !== "student") throw new ResumeError("Only student accounts can upload a résumé.", 403);
  return { client, userId: data.user.id };
}

export function privateJson(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export function resumeFailure(error: unknown): Response {
  if (error instanceof ResumeError) return privateJson({ error: error.message }, error.status);
  // Do not log database responses or private document/model content.
  return privateJson({ error: "The résumé request failed. Check your connection and try again." }, 503);
}

export async function readLimitedPdf(request: Request, limit: number): Promise<Uint8Array> {
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > limit)) {
    throw new ResumeError("Choose a PDF no larger than 3 MB.", 413);
  }
  if (!request.body) throw new ResumeError("Choose a non-empty PDF.", 400);
  const reader = request.body.getReader();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => {}); }, 15000);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (timedOut) throw new ResumeError("The upload timed out. Try again.", 408);
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new ResumeError("Choose a PDF no larger than 3 MB.", 413);
      chunks.push(value);
    }
  } finally { clearTimeout(timer); await reader.cancel().catch(() => {}); }
  const bytes = Buffer.concat(chunks);
  if (bytes.length < 5 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new ResumeError("The file is not a PDF. Export your résumé as PDF and try again.", 400);
  }
  return bytes;
}
