import { randomUUID } from "node:crypto";
import { RESUME_BUCKET, RESUME_LIMIT_BYTES } from "../../../../lib/resumes/contract";
import { extractResume } from "../../../../lib/resumes/pdf";
import { scanResume, ScannerError } from "../../../../lib/resumes/ollama";
import { studentClient, privateJson, resumeFailure, ResumeError, RESUME_COLUMNS, readLimitedPdf } from "../../../../lib/resumes/server";

export const runtime = "nodejs";
export const maxDuration = 180;
let activeScans = 0;

export async function GET(request: Request) {
  try {
    const { client, userId } = await studentClient(request);
    const { data, error } = await client.from("student_resumes").select(RESUME_COLUMNS)
      .eq("student_id", userId).maybeSingle();
    if (error) throw new ResumeError("We could not load your résumé. Apply the local migration and try again.", 503);
    return privateJson({ resume: data });
  } catch (error) { return resumeFailure(error); }
}

export async function POST(request: Request) {
  let acquired = false;
  try {
    const { client, userId } = await studentClient(request);
    if (request.headers.get("x-resume-consent") !== "true") throw new ResumeError("Confirm local AI processing before uploading.", 400);
    if (request.headers.get("content-type")?.split(";")[0] !== "application/pdf") {
      throw new ResumeError("Only PDF uploads are accepted.", 415);
    }
    let originalName: string;
    try { originalName = decodeURIComponent(request.headers.get("x-resume-name") || ""); }
    catch { throw new ResumeError("Choose a PDF with a valid filename.", 400); }
    if (!originalName.toLowerCase().endsWith(".pdf") || originalName.length > 500) throw new ResumeError("Choose a PDF résumé.", 400);
    originalName = originalName.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 116).replace(/\.pdf$/i, "") + ".pdf";
    const { data: existing, error: lookupError } = await client.from("student_resumes")
      .select("id").eq("student_id", userId).maybeSingle();
    if (lookupError) throw new ResumeError("Apply the local résumé migration before uploading.", 503);
    if (existing) throw new ResumeError("You already have a résumé. Delete it before uploading a replacement.", 409);
    // Local-demo backpressure, not a distributed production rate limiter.
    if (activeScans >= 1) throw new ResumeError("Another scan is running. Wait for it to finish and try again.", 429);
    activeScans += 1;
    acquired = true;
    const bytes = await readLimitedPdf(request, RESUME_LIMIT_BYTES);
    let extracted;
    try { extracted = await extractResume(bytes); }
    catch (error) { throw new ResumeError(error instanceof Error ? error.message : "The PDF could not be read.", 422); }
    const { scan, model } = await scanResume(extracted.text, request.signal);
    if (request.signal.aborted) throw new ResumeError("The upload was cancelled. Nothing was saved.", 400);
    const id = randomUUID();
    const storagePath = `${userId}/${id}.pdf`;
    const { data: saved, error: insertError } = await client.from("student_resumes").insert({
      id, student_id: userId, storage_path: storagePath, original_name: originalName,
      byte_size: bytes.byteLength, page_count: extracted.pages, extracted_text: extracted.text,
      scan_result: scan, model,
    }).select(RESUME_COLUMNS).single();
    if (insertError) throw new ResumeError(insertError.code === "23505"
      ? "A résumé was saved in another tab. Refresh before uploading again."
      : "We could not save the scan. Nothing was uploaded; try again.", insertError.code === "23505" ? 409 : 503);
    const { error: uploadError } = await client.storage.from(RESUME_BUCKET)
      .upload(storagePath, bytes, { contentType: "application/pdf", upsert: false });
    if (uploadError) {
      // A failed response might still have stored the object: remove it first.
      const cleanup = await client.storage.from(RESUME_BUCKET).remove([storagePath]);
      if (!cleanup.error) await client.from("student_resumes").delete().eq("id", id);
      throw new ResumeError("The file upload did not finish. Refresh to check for a saved entry; delete it before retrying.", 503);
    }
    return privateJson({ resume: saved }, 201);
  } catch (error) {
    return error instanceof ScannerError ? privateJson({ error: error.message }, error.status) : resumeFailure(error);
  } finally { if (acquired) activeScans -= 1; }
}

export async function DELETE(request: Request) {
  try {
    const { client, userId } = await studentClient(request);
    const id = request.headers.get("x-resume-id");
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw new ResumeError("Refresh before deleting your résumé.", 400);
    const { data, error } = await client.from("student_resumes").select("id,storage_path")
      .eq("student_id", userId).eq("id", id).maybeSingle();
    if (error) throw new ResumeError("We could not load the résumé to delete. Try again.", 503);
    if (!data) throw new ResumeError("This résumé is no longer available. Refresh the page.", 404);
    const removed = await client.storage.from(RESUME_BUCKET).remove([data.storage_path]);
    if (removed.error) throw new ResumeError("The PDF could not be deleted. Nothing else was removed; try again.", 503);
    const deleted = await client.from("student_resumes").delete().eq("id", data.id).select("id");
    if (deleted.error || !deleted.data?.length) throw new ResumeError("The PDF was removed, but scan cleanup did not finish. Try deleting again.", 503);
    return privateJson({ deleted: true });
  } catch (error) { return resumeFailure(error); }
}
