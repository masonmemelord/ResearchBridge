import type { Metadata } from "next";
import Link from "next/link";
import { AuthNav } from "../../components/auth/AuthNav";
import { PILOT_CONTACT_EMAIL } from "../../lib/release";

export const metadata: Metadata = {
  title: "About us | ResearchBridge",
  description: "Meet the Research Ambassadors, the Tulane team behind ResearchBridge.",
};

const roster = [
  {
    id: "executive-board",
    title: "Executive Board",
    members: [
      { role: "President", name: "Trishita Paul" },
      { role: "Secretary/Treasurer", name: "Hayden Le" },
    ],
  },
  {
    id: "research-directors",
    title: "Research Directors",
    members: [
      { role: "School of Science and Engineering (SSE)", name: "Pritika (Tika) Ghosh" },
      { role: "School of Liberal Arts (SLA)", name: "Eleanor Brinen" },
      { role: "School of Public Health (WSPH)", name: "Trishita Paul" },
      { role: "School of Medicine (SoM)", name: "Lily Hanzel" },
      { role: "School of Business (SoB)", name: "Constantine Wagner" },
      { role: "School of Architecture", name: null },
    ],
  },
  {
    id: "operations-team",
    title: "Operations Team",
    members: [
      { role: "Director of Technology", name: "Mason Mitchell" },
      { role: "Director of Professional Development", name: "Auto Breaux" },
      { role: "Director of Marketing and Communications", name: "Jackie Silberman" },
    ],
  },
];

export default function AboutPage() {
  return (
    <main className="paper-texture flex-1 pb-16 sm:pb-24">
      <div className="h-1.5 bg-[linear-gradient(90deg,#006747_0_72%,#418fde_72%_100%)]" aria-hidden="true" />
      <nav aria-label="Main" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 border-b border-rb-border px-5 py-4 sm:px-8">
        <Link href="/" className="rounded-sm font-serif text-lg font-black text-rb-brand">ResearchBridge</Link>
        <AuthNav />
      </nav>

      <div className="mx-auto max-w-4xl px-5 pt-10 sm:px-8 sm:pt-14">
        <header className="rounded-2xl border border-rb-border bg-rb-surface p-6 sm:p-10">
          <h1 className="font-serif text-5xl font-black tracking-tight text-rb-ink sm:text-6xl">About us</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-rb-muted sm:text-lg">
            ResearchBridge connects Tulane students with faculty research opportunities. We’re the Research Ambassadors, the team behind the site.
          </p>
        </header>

        {roster.map(({ id, title, members }) => (
          <section key={id} aria-labelledby={id} className="mt-6 rounded-2xl border border-rb-border bg-rb-card p-6 sm:p-8">
            <h2 id={id} className="font-serif text-3xl font-bold text-rb-brand">{title}</h2>
            <dl className="mt-4 divide-y divide-rb-border border-y border-rb-border">
              {members.map(({ role, name }) => (
                <div key={role} className="grid gap-1 py-3 sm:grid-cols-[3fr_2fr] sm:gap-6">
                  <dt className="text-sm font-semibold leading-6 text-rb-ink">{role}</dt>
                  <dd className="text-sm leading-6 text-rb-muted">{name ?? <em>N/a</em>}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        <section aria-labelledby="contact-heading" className="mt-6 rounded-2xl border border-rb-border bg-rb-card p-6 sm:p-8">
          <h2 id="contact-heading" className="font-serif text-2xl font-bold text-rb-brand">Contact the team</h2>
          <a href={`mailto:${PILOT_CONTACT_EMAIL}`} className="mt-4 inline-block rounded-sm text-sm font-semibold text-rb-brand underline underline-offset-4 hover:text-rb-brand-hover">
            Email the Research Ambassadors
          </a>
        </section>
      </div>
    </main>
  );
}
