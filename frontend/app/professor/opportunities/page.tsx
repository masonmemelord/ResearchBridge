"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ProfessorPageShell } from "../../../components/professor/ProfessorPageShell";
import { ApplicantList } from "../../../components/applications/ApplicantList";
import { StatusBadge } from "../../../components/opportunities/StatusBadge";
import {
  formatDate,
  loadProfessorOpportunities,
  type ProfessorOpportunity,
} from "../../../lib/applications/applications";
import { useAuth } from "../../../lib/auth/auth-context";
import { PROFESSOR_ROUTES } from "../../../lib/auth/profile";
import { getSupabaseBrowserClient } from "../../../lib/supabase/client";

type LoadResult =
  | { key: string; status: "ready"; opportunities: ProfessorOpportunity[] }
  | { key: string; status: "error"; message: string };

const panelClass =
  "rounded-[22px] border border-rb-border bg-rb-card p-6 shadow-[0_14px_30px_rgba(17,17,17,0.08)] sm:p-7";
const primaryButtonClass =
  "inline-flex justify-center rounded-lg bg-rb-brand px-5 py-3 font-bold text-white transition hover:bg-rb-brand-hover active:bg-rb-brand-active";
const secondaryButtonClass =
  "inline-flex justify-center rounded-lg border-2 border-rb-brand px-5 py-2.5 font-bold text-rb-ink transition hover:bg-[rgba(0,103,71,0.08)] hover:text-rb-brand disabled:cursor-wait disabled:opacity-60";

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export default function MyOpportunitiesPage() {
  return (
    <ProfessorPageShell>
      <MyOpportunities />
    </ProfessorPageShell>
  );
}

function MyOpportunities() {
  const { state } = useAuth();
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<LoadResult | null>(null);

  // ProfessorGate only renders this for a confirmed professor.
  const professorId = state.status === "signed-in" ? state.userId : null;
  const requestKey = professorId ? `${professorId}:${reloadCount}` : null;

  useEffect(() => {
    if (!requestKey || !professorId) return;
    let cancelled = false;

    async function load(key: string, id: string) {
      let next: LoadResult;
      try {
        const loaded = await loadProfessorOpportunities(getSupabaseBrowserClient(), id);
        next = loaded.ok
          ? { key, status: "ready", opportunities: loaded.value }
          : { key, status: "error", message: loaded.message };
      } catch (error) {
        console.error("Supabase is not configured", error);
        next = { key, status: "error", message: "Supabase is not configured for this frontend." };
      }
      if (!cancelled) setResult(next);
    }

    void load(requestKey, professorId);
    return () => {
      cancelled = true;
    };
  }, [requestKey, professorId]);

  const current = requestKey && result?.key === requestKey ? result : null;
  // Keep showing the last list while a refresh is in flight.
  const shown = current ?? (result?.status === "ready" ? result : null);
  const isRefreshing = !current && result !== null;

  let content: ReactNode;
  if (!shown) {
    content = (
      <p role="status" className={`${panelClass} text-rb-muted`}>
        Loading your opportunities…
      </p>
    );
  } else if (shown.status === "error") {
    content = (
      <div
        role="alert"
        className="rounded-2xl border border-[#e0b3a7] bg-[#fdf1ed] p-6 font-semibold text-[#8f2d1c] sm:p-7"
      >
        <p>{shown.message}</p>
        <button
          type="button"
          onClick={() => setReloadCount((count) => count + 1)}
          className={`mt-5 ${primaryButtonClass}`}
        >
          Try again
        </button>
      </div>
    );
  } else if (shown.opportunities.length === 0) {
    content = (
      <section className={panelClass}>
        <h2 className="font-serif text-2xl font-bold text-rb-ink">No opportunities yet</h2>
        <p className="mt-2 text-rb-muted">
          Post your first research opportunity. Students can apply once it is published, and
          their applications will appear here.
        </p>
        <Link href={PROFESSOR_ROUTES.newOpportunity} className={`mt-5 ${primaryButtonClass}`}>
          Post an opportunity
        </Link>
      </section>
    );
  } else {
    content = (
      <ul className="space-y-6" aria-label="Your opportunities">
        {shown.opportunities.map((opportunity) => (
          <li key={opportunity.id}>
            <OpportunityWithApplicants opportunity={opportunity} />
          </li>
        ))}
      </ul>
    );
  }

  const totals =
    shown?.status === "ready"
      ? {
          listings: shown.opportunities.length,
          applicants: shown.opportunities.reduce(
            (sum, opportunity) => sum + opportunity.applicants.length,
            0,
          ),
        }
      : null;

  return (
    <>
      <header className="border-b border-rb-border pb-8 pt-4">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-rb-brand">
          Professor workspace
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-serif text-4xl font-black leading-[1.05] tracking-[-0.03em] text-rb-ink sm:text-5xl">
            My opportunities
          </h1>
          <Link href={PROFESSOR_ROUTES.newOpportunity} className={primaryButtonClass}>
            Post an opportunity
          </Link>
        </div>
        <p className="mt-5 max-w-2xl text-base leading-7 text-rb-muted">
          Each listing shows the students who applied, with their account email and message.
          Contact applicants directly to arrange next steps.
        </p>
      </header>

      <div className="mt-8 flex min-h-11 flex-wrap items-center justify-between gap-3">
        <p role="status" aria-atomic="true" className="text-sm font-semibold text-rb-ink">
          {isRefreshing
            ? "Refreshing…"
            : totals
              ? `${plural(totals.listings, "listing", "listings")} · ${plural(totals.applicants, "applicant", "applicants")}`
              : ""}
        </p>
        {shown?.status === "ready" ? (
          <button
            type="button"
            onClick={() => setReloadCount((count) => count + 1)}
            disabled={isRefreshing}
            className={secondaryButtonClass}
          >
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
        ) : null}
      </div>

      <div className="mt-4">{content}</div>
    </>
  );
}

function OpportunityWithApplicants({ opportunity }: { opportunity: ProfessorOpportunity }) {
  const { title, status, createdAt, positionsAvailable, applicants } = opportunity;
  const postedOn = formatDate(createdAt);
  const headingId = `opportunity-${opportunity.id}`;

  return (
    <article aria-labelledby={headingId} className={panelClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id={headingId} className="break-words font-serif text-2xl font-bold text-rb-ink">
          {title || "Untitled opportunity"}
        </h2>
        <StatusBadge status={status} />
      </div>
      <p className="mt-2 text-sm text-rb-muted">
        {[
          postedOn ? `Posted ${postedOn}` : null,
          positionsAvailable ? plural(positionsAvailable, "position", "positions") : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {status === "draft" ? (
        <p className="mt-2 text-sm text-rb-muted">
          Drafts are private. Students cannot see or apply to this listing.
        </p>
      ) : null}

      <section className="mt-5 border-t border-rb-border pt-5" aria-label={`Applicants for ${title || "this opportunity"}`}>
        <h3 className="text-sm font-bold text-rb-ink">
          {applicants.length === 0 ? "Applicants" : `Applicants (${applicants.length})`}
        </h3>
        <ApplicantList applicants={applicants} opportunityTitle={title} />
      </section>
    </article>
  );
}
