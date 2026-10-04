"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../../lib/auth/auth-context";
import { resumeRequest } from "../../lib/resumes/client";
import { parseResume, validateResumeFile, type StudentResume } from "../../lib/resumes/contract";
import { resumeDemoEnabled } from "../../lib/release";

const panel = "rounded-2xl border border-rb-border bg-rb-card p-6 sm:p-8";
const primary = "rounded-lg bg-rb-brand px-5 py-3 font-bold text-white transition hover:bg-rb-brand-hover disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "rounded-lg border border-rb-border px-5 py-3 font-semibold text-rb-ink transition hover:border-rb-brand disabled:cursor-not-allowed disabled:opacity-50";

function ScanList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="min-w-0 rounded-xl border border-rb-border p-5">
      <h3 className="font-serif text-xl font-bold">{title}</h3>
      {items.length ? <ul className="mt-3 list-disc space-y-2 break-words pl-5 text-sm leading-6 text-rb-muted">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
        : <p className="mt-3 text-sm text-rb-muted">Not found in this résumé.</p>}
    </section>
  );
}

function Workspace() {
  const [resume, setResume] = useState<StudentResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<"scan" | "download" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; abortRef.current?.abort(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await resumeRequest("/api/student/resume", { signal: controller.signal });
        const result = await response.json();
        if (!controller.signal.aborted) { setResume(parseResume(result.resume)); setError(null); setLoadFailed(false); }
      } catch (failure) {
        if (!controller.signal.aborted) { setError(failure instanceof Error ? failure.message : "Your résumé could not be loaded."); setLoadFailed(true); }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [reload]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null); setNotice(null);
    if (!file) { setError("Choose a PDF résumé first."); fileRef.current?.focus(); return; }
    const invalid = validateResumeFile(file);
    if (invalid) { setError(invalid); fileRef.current?.focus(); return; }
    if (!consent) { setError("Confirm local AI processing before uploading."); return; }
    setBusy("scan");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await resumeRequest("/api/student/resume", {
        method: "POST", body: file, signal: controller.signal,
        headers: { "Content-Type": "application/pdf", "X-Resume-Name": encodeURIComponent(file.name), "X-Resume-Consent": "true" },
      });
      const result = await response.json();
      if (!activeRef.current) return;
      setResume(parseResume(result.resume)); setFile(null); setConsent(false);
      setNotice("Your résumé was uploaded and scanned. Review the AI results below.");
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch (failure) {
      if (activeRef.current) setError(failure instanceof Error ? failure.message : "Upload failed. Try again.");
    } finally { if (activeRef.current) setBusy(null); }
  }

  async function download() {
    if (!resume) return;
    setBusy("download"); setError(null);
    try {
      const response = await resumeRequest("/api/student/resume/file");
      const blob = await response.blob();
      if (!activeRef.current) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = resume.original_name;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) { if (activeRef.current) setError(failure instanceof Error ? failure.message : "Download failed."); }
    finally { if (activeRef.current) setBusy(null); }
  }

  async function remove() {
    if (!resume) return;
    setBusy("delete"); setError(null); setNotice(null);
    try {
      await resumeRequest("/api/student/resume", { method: "DELETE", headers: { "X-Resume-Id": resume.id } });
      if (!activeRef.current) return;
      setResume(null); setConfirmDelete(false); setNotice("Your PDF and scan results were deleted.");
      requestAnimationFrame(() => fileRef.current?.focus());
    } catch (failure) { if (activeRef.current) setError(failure instanceof Error ? failure.message : "Delete failed. Try again."); }
    finally { if (activeRef.current) setBusy(null); }
  }

  return (
    <div className="mt-8 space-y-5 pb-10">
      <aside className="rounded-xl border border-rb-border bg-rb-surface p-5 text-sm leading-6 text-rb-muted">
        <strong className="text-rb-brand">Private by default.</strong> In local-demo mode, your PDF and results stay in local Supabase and only your student account can access them. Text is processed by Ollama on this machine—not a paid cloud AI service. This is not malware scanning or an eligibility assessment.
      </aside>
      {notice ? <p role="status" className="rounded-xl border border-rb-border p-5 font-semibold text-rb-brand">{notice}</p> : null}
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900"><p>{error}</p>
        <button type="button" disabled={!!busy} className="mt-3 rounded font-bold underline" onClick={() => { setLoading(true); setReload((n) => n + 1); }}>Refresh saved résumé</button></div> : null}
      {loading ? <p role="status" className={panel}>Loading your résumé…</p> : resume ? (
        <section className={panel} aria-labelledby="scan-heading">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-widest text-rb-brand">AI scan · Review required</p>
              <h2 id="scan-heading" ref={resultRef} tabIndex={-1} className="mt-2 break-words font-serif text-2xl font-bold">Review your résumé</h2>
              <p className="mt-2 break-all text-sm text-rb-muted">{resume.original_name} · {resume.page_count} {resume.page_count === 1 ? "page" : "pages"} · {(resume.byte_size / 1024).toFixed(0)} KB</p>
            </div>
            <button type="button" disabled={!!busy} onClick={() => void download()} className={secondary}>{busy === "download" ? "Downloading…" : "Download original PDF"}</button>
          </div>
          <p className="mt-5 text-sm leading-6 text-rb-muted">AI can miss or misread information. These results are not verified and are not used to rank or match you yet. If they are incorrect, update your résumé and upload a replacement.</p>
          <p className="mt-6 whitespace-pre-wrap break-words text-base leading-7">{resume.scan_result.summary || "No summary was extracted."}</p>
          <div className="mt-6 grid min-w-0 gap-4 sm:grid-cols-2">
            <ScanList title="Skills" items={resume.scan_result.skills} />
            <ScanList title="Education" items={resume.scan_result.education} />
            <ScanList title="Experience" items={resume.scan_result.experience} />
            <ScanList title="Research interests" items={resume.scan_result.researchInterests} />
          </div>
          {resume.scan_result.warnings.length ? <div className="mt-4"><ScanList title="Things to check" items={resume.scan_result.warnings} /></div> : null}
          <details className="mt-6 rounded-xl border border-rb-border p-5"><summary className="cursor-pointer font-semibold">View extracted PDF text</summary>
            <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-6 text-rb-muted">{resume.extracted_text}</pre></details>
          <p className="mt-4 text-xs text-rb-muted">Scanned locally with {resume.model}. Your results persist after reloading.</p>
          <div className="mt-7 border-t border-rb-border pt-5">
            {confirmDelete ? <div role="group" aria-label="Confirm résumé deletion"><p className="text-sm font-semibold">Delete the PDF and all scan results? This cannot be undone.</p>
              <div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={!!busy} onClick={() => void remove()} className="rounded-lg bg-red-700 px-5 py-3 font-bold text-white disabled:opacity-50">{busy === "delete" ? "Deleting…" : "Confirm delete"}</button>
                <button type="button" disabled={!!busy} onClick={() => setConfirmDelete(false)} className={secondary}>Keep résumé</button></div></div>
              : <button type="button" disabled={!!busy} onClick={() => setConfirmDelete(true)} className="rounded-lg px-2 py-2 font-semibold text-red-800 underline">Delete résumé</button>}
          </div>
        </section>
      ) : !loadFailed ? (
        <form onSubmit={(event) => void upload(event)} className={panel} aria-busy={busy === "scan"}>
          <h2 className="font-serif text-2xl font-bold">Add your résumé</h2>
          <label htmlFor="resume-pdf" className="mt-6 block text-sm font-bold">PDF résumé</label>
          <input id="resume-pdf" ref={fileRef} type="file" accept=".pdf,application/pdf" disabled={!!busy}
            aria-describedby="resume-help" className="mt-2 block w-full min-w-0 rounded-xl border border-rb-border p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-rb-brand file:px-3 file:py-2 file:font-semibold file:text-white"
            onChange={(event) => { const chosen = event.target.files?.[0] ?? null; setFile(chosen); setError(chosen ? validateResumeFile(chosen) : null); }} />
          <p id="resume-help" className="mt-3 text-sm leading-6 text-rb-muted">Text-based PDF only, up to 3 MB and five pages. Password-protected files and image-only scans are not supported yet. Use a synthetic résumé for team demos.</p>
          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-rb-border p-4 text-sm leading-6">
            <input type="checkbox" checked={consent} disabled={!!busy} onChange={(event) => setConsent(event.target.checked)} className="mt-1 size-4 shrink-0 accent-rb-brand" />
            <span>I agree to have this résumé processed by the local AI and stored privately in local Supabase. I understand the extracted information needs my review.</span>
          </label>
          <div className="mt-6 flex flex-wrap items-center gap-4"><button type="submit" disabled={!!busy} className={primary}>{busy === "scan" ? "Uploading and scanning…" : "Upload and scan résumé"}</button>
            <p role="status" className="text-sm text-rb-muted">{busy === "scan" ? "Scanning can take up to two minutes. Keep this page open." : "One résumé per student. You can delete and replace it."}</p></div>
        </form>
      ) : null}
    </div>
  );
}

export function ResumeUploader() {
  const { state, retry } = useAuth();
  if (!resumeDemoEnabled()) return <p className={`mt-8 ${panel}`}>The résumé demo is disabled here. Start the local stack with <code>npm run dev:local</code>.</p>;
  if (state.status === "loading") return <p role="status" className={`mt-8 ${panel}`}>Checking your student access…</p>;
  if (state.status === "signed-in" && state.role === "student") return <Workspace key={state.userId} />;
  if (state.status === "signed-out") return <section className={`mt-8 ${panel}`}><h2 className="font-serif text-2xl font-bold">Sign in to upload your résumé</h2><Link href="/sign-in" className={`mt-5 inline-flex ${primary}`}>Sign in</Link></section>;
  if (state.status === "signed-in") return <section className={`mt-8 ${panel}`}><h2 className="font-serif text-2xl font-bold">This workspace is for students</h2><p className="mt-3 text-rb-muted">Professor accounts cannot upload or access student résumés.</p></section>;
  return <section role="alert" className={`mt-8 ${panel}`}><p>We could not confirm your student profile. Check your connection or ask the team to set up your profile.</p><button type="button" onClick={retry} className={`mt-4 ${secondary}`}>Try again</button></section>;
}
