"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

type OpportunityRow = {
  id: string;
  title: string;
  description: string;
  school: "architecture" | "liberal_arts" | "public_health" | "science_and_engineering";
  department: string;
  preferred_majors: string[];
  keywords: string[];
  duration_semesters: number;
  eligible_class_years: string[];
  positions_available: number;
  created_at: string;
};

const SCHOOL_LABELS: Record<OpportunityRow["school"], string> = {
  architecture: "Architecture",
  liberal_arts: "Liberal Arts",
  public_health: "Public Health",
  science_and_engineering: "Science and Engineering",
};

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<OpportunityRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "signed-out" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;

    async function loadOpportunities() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: authData } = await supabase.auth.getUser();

        if (!authData.user) {
          if (!cancelled) setStatus("signed-out");
          return;
        }

        const { data, error } = await supabase
          .from("opportunities")
          .select(
            "id,title,description,school,department,preferred_majors,keywords,duration_semesters,eligible_class_years,positions_available,created_at",
          )
          .eq("status", "published")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!cancelled) {
          setOpportunities((data ?? []) as OpportunityRow[]);
          setStatus("ready");
        }
      } catch (loadError) {
        console.error("Supabase opportunity query failed", loadError);
        if (!cancelled) setStatus("error");
      }
    }

    void loadOpportunities();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="paper-texture min-h-screen px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-rb-border pb-5">
          <Link href="/" className="font-serif text-xl font-black text-rb-brand">
            Research Ambassadors
          </Link>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/professor/opportunities/new" className="text-rb-muted hover:text-rb-brand">
              Post an opportunity
            </Link>
            <Link href="/sign-in" className="text-rb-brand hover:text-rb-brand-hover">
              Sign in
            </Link>
          </div>
        </nav>

        <header className="py-12">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-rb-brand">
            Published research
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl font-black tracking-tight text-rb-ink">
            Find an opportunity to contribute.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-rb-muted">
            Browse opportunities published by faculty across Tulane&apos;s academic schools.
          </p>
        </header>

        {status === "loading" ? (
          <p role="status" className="rounded-2xl border border-rb-border bg-rb-card p-6 text-rb-muted">
            Loading published opportunities…
          </p>
        ) : null}

        {status === "signed-out" ? (
          <section className="rounded-2xl border border-rb-border bg-rb-card p-7">
            <h2 className="font-serif text-2xl font-bold text-rb-ink">Sign in to browse</h2>
            <p className="mt-2 text-rb-muted">
              Published opportunities are currently available to authenticated ResearchBridge
              users.
            </p>
            <Link
              href="/sign-in"
              className="mt-5 inline-flex rounded-lg bg-rb-brand px-5 py-3 font-bold text-white hover:bg-rb-brand-hover"
            >
              Sign in
            </Link>
          </section>
        ) : null}

        {status === "error" ? (
          <p role="alert" className="rounded-2xl border border-[#e0b3a7] bg-[#fdf1ed] p-6 font-semibold text-[#8f2d1c]">
            Opportunities could not be loaded from Supabase. Check the connection and try again.
          </p>
        ) : null}

        {status === "ready" && opportunities.length === 0 ? (
          <p className="rounded-2xl border border-rb-border bg-rb-card p-6 text-rb-muted">
            No opportunities have been published yet.
          </p>
        ) : null}

        {status === "ready" && opportunities.length > 0 ? (
          <section aria-label="Published opportunities" className="grid gap-6 md:grid-cols-2">
            {opportunities.map((opportunity) => (
              <article
                key={opportunity.id}
                className="rounded-[22px] border border-rb-border bg-rb-card p-6 shadow-[0_14px_30px_rgba(17,17,17,0.08)]"
              >
                <div className="flex flex-wrap gap-2 text-xs font-bold text-rb-brand">
                  <span className="rounded-full bg-rb-surface px-3 py-1">
                    {SCHOOL_LABELS[opportunity.school]}
                  </span>
                  <span className="rounded-full bg-rb-tag-surface px-3 py-1">
                    {opportunity.department}
                  </span>
                </div>
                <h2 className="mt-5 font-serif text-2xl font-bold text-rb-ink">
                  {opportunity.title}
                </h2>
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-rb-muted">
                  {opportunity.description}
                </p>
                <dl className="mt-6 grid gap-4 border-t border-rb-border pt-5 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-bold text-rb-ink">Duration</dt>
                    <dd className="mt-1 text-rb-muted">
                      {opportunity.duration_semesters} {opportunity.duration_semesters === 1 ? "semester" : "semesters"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-rb-ink">Positions</dt>
                    <dd className="mt-1 text-rb-muted">{opportunity.positions_available}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-bold text-rb-ink">Eligible class years</dt>
                    <dd className="mt-1 text-rb-muted">
                      {opportunity.eligible_class_years.map(titleCase).join(", ")}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-bold text-rb-ink">Keywords</dt>
                    <dd className="mt-2 flex flex-wrap gap-2">
                      {opportunity.keywords.map((keyword) => (
                        <span key={keyword} className="rounded-md bg-rb-tag-surface px-2.5 py-1 text-xs font-semibold text-rb-brand">
                          {keyword}
                        </span>
                      ))}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}
