import type { Metadata } from "next";
import Link from "next/link";
import { AuthNav } from "../../../components/auth/AuthNav";
import { ResumeUploader } from "../../../components/resumes/ResumeUploader";
import { notFound } from "next/navigation";
import { resumeDemoEnabled } from "../../../lib/release";

export const metadata: Metadata = { title: "My résumé | ResearchBridge" };

export default function ResumePage() {
  if (!resumeDemoEnabled()) notFound();
  return (
    <main className="paper-texture min-h-screen bg-rb-surface text-rb-ink">
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-9">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-rb-border pb-5">
          <Link href="/" className="font-serif text-xl font-bold text-rb-brand">ResearchBridge</Link>
          <nav aria-label="Account navigation" className="flex flex-wrap items-center gap-3">
            <Link href="/opportunities" className="rounded-lg px-2 py-1 text-sm font-semibold text-rb-muted hover:text-rb-brand">Opportunities</Link>
            <AuthNav />
          </nav>
        </header>
        <div className="mt-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-rb-brand">Local AI demo · Student workspace</p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-5xl">Your experience, in focus.</h1>
          <p className="mt-4 text-base leading-7 text-rb-muted">Upload your résumé and review the skills, education, and experience our local AI finds. You stay in control of your information.</p>
        </div>
        <ResumeUploader />
      </div>
    </main>
  );
}
