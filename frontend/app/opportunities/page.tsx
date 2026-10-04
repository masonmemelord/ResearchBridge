"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AuthNav } from "../../components/auth/AuthNav";
import { ApplyPanel } from "../../components/opportunities/ApplyPanel";
import { OpportunityCard } from "../../components/opportunities/OpportunityCard";
import { OpportunityFilters } from "../../components/opportunities/OpportunityFilters";
import {
  loadMyApplications,
  type MyApplication,
} from "../../lib/applications/applications";
import { hasSession, useAuth } from "../../lib/auth/auth-context";
import { ADMIN_HOME, PROFESSOR_ROUTES } from "../../lib/auth/profile";
import {
  EMPTY_FILTERS,
  PUBLISHED_OPPORTUNITY_COLUMNS,
  filterOpportunities,
  hasActiveFilters,
  normalizeOpportunities,
  schoolOptions,
  type OpportunityFilters as Filters,
  type PublishedOpportunity,
} from "../../lib/opportunities/published";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import { publicSignupEnabled } from "../../lib/release";

type LoadResult =
  | { key: string; status: "ready"; opportunities: PublishedOpportunity[] }
  | { key: string; status: "error" };

type ApplicationsResult =
  | { key: string; status: "ready"; byOpportunity: ReadonlyMap<string, MyApplication> }
  | { key: string; status: "error"; message: string };

const panelClass = "rounded-2xl border border-rb-border bg-rb-card p-6 sm:p-7";
const alertClass =
  "rounded-2xl border border-[#e0b3a7] bg-[#fdf1ed] p-6 font-semibold text-[#8f2d1c] sm:p-7";
const primaryButtonClass =
  "inline-flex rounded-lg bg-rb-brand px-5 py-3 font-bold text-white transition hover:bg-rb-brand-hover active:bg-rb-brand-active";
const secondaryButtonClass =
  "inline-flex rounded-lg border-2 border-rb-brand px-5 py-2.5 font-bold text-rb-ink transition hover:bg-[rgba(0,103,71,0.08)] hover:text-rb-brand active:bg-[rgba(0,103,71,0.16)]";

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className={alertClass}>
      <p>{message}</p>
      <button type="button" onClick={onRetry} className={`mt-5 ${primaryButtonClass}`}>
        Try again
      </button>
    </div>
  );
}

export default function OpportunitiesPage() {
  const { state: auth, retry: retryAuth } = useAuth();
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<LoadResult | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [applicationsReload, setApplicationsReload] = useState(0);
  const [applications, setApplications] = useState<ApplicationsResult | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const userId = "userId" in auth ? auth.userId : null;
  const isStudent = auth.status === "signed-in" && auth.role === "student";
  const isProfessor = auth.status === "signed-in" && auth.role === "professor";
  const isAdmin = auth.status === "signed-in" && auth.role === "admin";
  // Keyed by user so a different sign-in (or a retry) triggers a fresh query.
  const requestKey = userId ? `${userId}:${reloadCount}` : null;
  const applicationsKey =
    isStudent && userId ? `${userId}:${reloadCount}:${applicationsReload}` : null;

  useEffect(() => {
    if (!requestKey) return;
    let cancelled = false;

    async function loadOpportunities(key: string) {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("opportunities")
          .select(PUBLISHED_OPPORTUNITY_COLUMNS)
          .eq("status", "published")
          .order("created_at", { ascending: false });

        if (error) throw error;
        const rows: readonly unknown[] = data ?? [];
        if (!cancelled) {
          setResult({ key, status: "ready", opportunities: normalizeOpportunities(rows) });
        }
      } catch (loadError) {
        console.error("Supabase opportunity query failed", loadError);
        if (!cancelled) setResult({ key, status: "error" });
      }
    }

    void loadOpportunities(requestKey);
    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  // Students also need their own applications to show Apply or Applied.
  useEffect(() => {
    if (!applicationsKey || !userId) return;
    let cancelled = false;

    async function load(key: string, studentId: string) {
      let next: ApplicationsResult;
      try {
        const loaded = await loadMyApplications(getSupabaseBrowserClient(), studentId);
        next = loaded.ok
          ? { key, status: "ready", byOpportunity: loaded.value }
          : { key, status: "error", message: loaded.message };
      } catch (loadError) {
        console.error("Supabase is not configured", loadError);
        next = { key, status: "error", message: "Supabase is not configured for this frontend." };
      }
      if (!cancelled) setApplications(next);
    }

    void load(applicationsKey, userId);
    return () => {
      cancelled = true;
    };
  }, [applicationsKey, userId]);

  const currentApplications =
    applicationsKey && applications?.key === applicationsKey ? applications : null;

  function updateApplications(update: (draft: Map<string, MyApplication>) => void) {
    setApplications((previous) => {
      if (!previous || previous.status !== "ready") return previous;
      const next = new Map(previous.byOpportunity);
      update(next);
      return { ...previous, byOpportunity: next };
    });
  }

  function cardActions(opportunity: PublishedOpportunity): ReactNode {
    if (isStudent && userId) {
      if (currentApplications?.status === "error") {
        return (
          <p className="text-sm text-rb-muted">
            Applying is unavailable until your applications load. Use “Try again” above.
          </p>
        );
      }
      return (
        <ApplyPanel
          opportunityId={opportunity.id}
          opportunityTitle={opportunity.title || "Untitled opportunity"}
          studentId={userId}
          application={
            currentApplications ? (currentApplications.byOpportunity.get(opportunity.id) ?? null) : undefined
          }
          onApplied={(application) =>
            updateApplications((draft) => draft.set(application.opportunityId, application))
          }
          onWithdrawn={(opportunityId) => updateApplications((draft) => draft.delete(opportunityId))}
        />
      );
    }
    if (isProfessor) {
      return (
        <p className="text-sm leading-6 text-rb-muted">
          Students apply from this card. Applicants to your own listings appear in{" "}
          <Link
            href={PROFESSOR_ROUTES.opportunities}
            className="font-semibold text-rb-brand underline underline-offset-2 hover:text-rb-brand-hover"
          >
            My opportunities
          </Link>
          .
        </p>
      );
    }
    if (isAdmin) {
      return (
        <p className="text-sm leading-6 text-rb-muted">
          Review applicants or close this listing from the{" "}
          <Link
            href={ADMIN_HOME}
            className="font-semibold text-rb-brand underline underline-offset-2 hover:text-rb-brand-hover"
          >
            admin dashboard
          </Link>
          .
        </p>
      );
    }
    return null;
  }

  const current = requestKey && result?.key === requestKey ? result : null;
  const opportunities = useMemo(
    () => (current?.status === "ready" ? current.opportunities : []),
    [current],
  );
  const filtered = useMemo(
    () => filterOpportunities(opportunities, filters),
    [opportunities, filters],
  );
  const schools = useMemo(() => schoolOptions(opportunities), [opportunities]);
  const filtersActive = hasActiveFilters(filters);

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    searchInputRef.current?.focus();
  }

  let content: ReactNode;
  if (auth.status === "loading") {
    content = (
      <p role="status" className={`${panelClass} text-rb-muted`}>
        Checking your sign-in status…
      </p>
    );
  } else if (!hasSession(auth)) {
    content =
      auth.status === "error" ? (
        <ErrorPanel message={auth.message} onRetry={retryAuth} />
      ) : (
        <section className={panelClass}>
          <h2 className="font-serif text-2xl font-bold text-rb-ink">Sign in to browse</h2>
          <p className="mt-2 text-rb-muted">
            Published opportunities are currently available to signed-in ResearchBridge
            users. Sign in with your invited student or professor account.
            {publicSignupEnabled() ? " You can also create a student account." : " Need access? Request an invitation from the team."}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-in" className={`justify-center ${primaryButtonClass}`}>
              Sign in
            </Link>
            <Link href={publicSignupEnabled() ? "/sign-up" : "/access"} className={`justify-center ${secondaryButtonClass}`}>
              {publicSignupEnabled() ? "Create a student account" : "Request an invitation"}
            </Link>
          </div>
        </section>
      );
  } else if (auth.status === "error") {
    content = <ErrorPanel message={auth.message} onRetry={retryAuth} />;
  } else if (!current) {
    content = (
      <p role="status" className={`${panelClass} text-rb-muted`}>
        Loading published opportunities…
      </p>
    );
  } else if (current.status === "error") {
    content = (
      <ErrorPanel
        message="Opportunities could not be loaded from Supabase. Check your internet connection and try again. If this keeps happening, contact the ResearchBridge team."
        onRetry={() => setReloadCount((count) => count + 1)}
      />
    );
  } else if (opportunities.length === 0) {
    content = (
      <p role="status" className={`${panelClass} text-rb-muted`}>
        No opportunities have been published yet. Check back soon.
      </p>
    );
  } else {
    content = (
      <div className="space-y-6">
        <OpportunityFilters
          filters={filters}
          schoolOptions={schools}
          onChange={setFilters}
          searchInputRef={searchInputRef}
        />

        {currentApplications?.status === "error" ? (
          <ErrorPanel
            message={currentApplications.message}
            onRetry={() => setApplicationsReload((count) => count + 1)}
          />
        ) : null}

        <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
          <p role="status" aria-atomic="true" className="text-sm font-semibold text-rb-ink">
            {filtersActive
              ? `Showing ${filtered.length} of ${opportunities.length} published ${
                  opportunities.length === 1 ? "opportunity" : "opportunities"
                }`
              : `${opportunities.length} published ${
                  opportunities.length === 1 ? "opportunity" : "opportunities"
                }`}
          </p>
          {filtersActive ? (
            <button type="button" onClick={clearFilters} className={secondaryButtonClass}>
              Clear filters
            </button>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <section className={panelClass}>
            <h2 className="font-serif text-2xl font-bold text-rb-ink">
              No opportunities match these filters
            </h2>
            <p className="mt-2 text-rb-muted">
              Try a different search term, choose “All” for one of the filters, or clear
              every filter to see all published opportunities.
            </p>
          </section>
        ) : (
          <section aria-label="Matching opportunities" className="grid gap-6 md:grid-cols-2">
            {filtered.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                actions={cardActions(opportunity)}
              />
            ))}
          </section>
        )}
      </div>
    );
  }

  return (
    <main className="paper-texture min-h-screen px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <nav
          aria-label="Main"
          className="flex flex-wrap items-center justify-between gap-4 border-b border-rb-border pb-5"
        >
          <Link href="/" className="rounded-lg font-serif text-xl font-black text-rb-brand">
            Research Ambassadors
          </Link>
          <AuthNav />
        </nav>

        <header className="py-12">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-rb-brand">
            Published research
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-black tracking-tight text-rb-ink sm:text-5xl">
            Find an opportunity to contribute.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-rb-muted">
            Browse opportunities published by faculty across Tulane&apos;s academic schools.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-rb-muted">
            Students can apply directly from a listing. The professor sees the applicant&apos;s
            name, account email, and optional message.
          </p>
        </header>

        {content}
      </div>
    </main>
  );
}
