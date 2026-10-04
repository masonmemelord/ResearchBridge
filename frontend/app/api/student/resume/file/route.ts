import { RESUME_BUCKET } from "../../../../../lib/resumes/contract";
import { studentClient, resumeFailure, ResumeError } from "../../../../../lib/resumes/server";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const { client, userId } = await studentClient(request);
    const { data, error } = await client.from("student_resumes").select("storage_path,original_name")
      .eq("student_id", userId).maybeSingle();
    if (error) throw new ResumeError("The résumé could not be loaded. Try again.", 503);
    if (!data) throw new ResumeError("Upload a résumé first.", 404);
    const file = await client.storage.from(RESUME_BUCKET).download(data.storage_path);
    if (file.error || !file.data) throw new ResumeError("The PDF is unavailable. Refresh and try again.", 503);
    // Always download: do not execute embedded PDF content in an inline preview.
    const filename = data.original_name.replace(/[^a-zA-Z0-9._ -]/g, "_");
    return new Response(file.data, { headers: {
      "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox",
    } });
  } catch (error) { return resumeFailure(error); }
}
