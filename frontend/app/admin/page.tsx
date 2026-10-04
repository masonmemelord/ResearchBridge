"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { ApplicantList } from "../../components/applications/ApplicantList";
import { WorkspaceShell } from "../../components/layout/WorkspaceShell";
import { StatusBadge } from "../../components/opportunities/StatusBadge";
import {
  filterAdminOpportunities,
  filterUsers,
  loadAdminUsers,
  loadAllOpportunities,
  setOpportunityStatus,
  setUserRole,
  type AccountRole,
  type AdminOpportunity,
  type AdminUser,
  type AssignableRole,
} from "../../lib/admin/admin";
import { formatDate, type Result } from "../../lib/applications/applications";
import { useAuth } from "../../lib/auth/auth-context";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";

type View = "people" | "postings";
type Load<T> = { key: number; result: Result<T> } | null;

const panelClass =
  "rounded-[22px] border border-rb-border bg-rb-card p-5 shadow-[0_14px_30px_rgba(17,17,17,0.08)] sm:p-6";
const primaryButtonClass =
  "inline-flex justify-center rounded-lg bg-rb-brand px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rb-brand-hover active:bg-rb-brand-active disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex justify-center rounded-lg border-2 border-rb-brand px-4 py-2 text-sm font-bold text-rb-ink transition hover:bg-[rgba(0,103,71,0.08)] hover:text-rb-brand disabled:cursor-wait disabled:opacity-60";
const inputClass =
  "w-full rounded-lg border border-rb-border bg-white px-3 py-2.5 text-sm text-rb-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rb-brand";
const errorTextClass = "text-[13px] font-semibold leading-5 text-[#8f2d1c]";

const ROLE_LABELS: Record<AccountRole, string> = {
  admin: "Admin",
  professor: "Professor",
  student: "Student",
};

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Loads with a retry counter; keeps the last good value while reloading. */
function useLoad<T>(loader: () => Promise<Result<T>>, enabled: boolean) {
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<Load<T>>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    async function run(key: number) {
      let result: Result<T>;
      try {
        result = await loader();
      } catch (error) {
        console.error("Admin load failed", error);
        result = { ok: false, message: "Supabase is not configured for this frontend." };
      }
      if (!cancelled) setState({ key, result });
    }
    void run(reload);
    return () => {
      cancelled = true;
    };
    // The loader is stable for the page's lifetime; reload drives refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, enabled]);

  const loading = enabled && state?.key !== reload;
  return {
    state,
    loading,
    refresh: () => setReload((count) => count + 1),
    update: (fn: (value: T) => T) =>
      setState((previous) =>
        previous && previous.result.ok
          ? { ...previous, result: { ok: true, value: fn(previous.result.value) } }
          : previous,
      ),
  };
}

export default function AdminPage() {
  return (
    <WorkspaceShell role="admin" portalLabel="Admin" wide>
      <AdminDashboard />
    </WorkspaceShell>
  );
}

function AdminDashboard() {
  const { state: auth } = useAuth();
  const adminId = auth.status === "signed-in" ? auth.userId : null;
  const [view, setView] = useState<View>("people");

  const users = useLoad(() => loadAdminUsers(getSupabaseBrowserClient()), adminId !== null);
  const postings = useLoad(() => loadAllOpportunities(getSupabaseBrowserClient()), adminId !== null);

  const userCounts = users.state?.result.ok
    ? {
        total: users.state.result.value.length,
        professors: users.state.result.value.filter((user) => user.role === "professor").length,
        students: users.state.result.value.filter((user) => user.role === "student").length,
        pending: users.state.result.value.filter((user) => user.role === null).length,
      }
    : null;
  const postingCounts = postings.state?.result.ok
    ? {
        total: postings.state.result.value.length,
        published: postings.state.result.value.filter((p) => p.status === "published").length,
        applicants: postings.state.result.value.reduce((sum, p) => sum + p.applicants.length, 0),
      }
    : null;

  return (
    <>
      <header className="border-b border-rb-border pb-8 pt-4">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-rb-brand">ResearchBridge team</p>
        <h1 className="mt-4 font-serif text-4xl font-black leading-[1.05] tracking-[-0.03em] text-rb-ink sm:text-5xl">
          Admin dashboard
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-rb-muted">
          Give accounts the student or professor role, and oversee every posting and its
          applicants. New admins are added in the Supabase SQL editor.
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Professors" value={userCounts?.professors} />
          <Stat label="Students" value={userCounts?.students} />
          <Stat label="Need a role" value={userCounts?.pending} />
          <Stat label="Applications" value={postingCounts?.applicants} />
        </dl>
      </header>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Dashboard section">
        {(["people", "postings"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => setView(option)}
            className={
              "rounded-full border-2 px-5 py-2 text-sm font-bold transition " +
              (view === option
                ? "border-rb-brand bg-rb-brand text-white"
                : "border-rb-border bg-rb-card text-rb-ink hover:border-rb-brand hover:text-rb-brand")
            }
          >
            {option === "people"
              ? `People${userCounts ? ` (${userCounts.total})` : ""}`
              : `Postings${postingCounts ? ` (${postingCounts.total})` : ""}`}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {view === "people" ? (
          <PeopleSection
            load={users}
            adminId={adminId}
            onRoleChanged={(userId, role) =>
              users.update((list) => list.map((user) => (user.id === userId ? { ...user, role } : user)))
            }
          />
        ) : (
          <PostingsSection
            load={postings}
            onStatusChanged={(id, status) =>
              postings.update((list) => list.map((p) => (p.id === id ? { ...p, status } : p)))
            }
          />
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-xl border border-rb-border bg-rb-card px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-rb-muted">{label}</dt>
      <dd className="mt-1 font-serif text-2xl font-black text-rb-ink">{value ?? "–"}</dd>
    </div>
  );
}

function LoadFrame<T>({
  load,
  loadingText,
  children,
}: {
  load: ReturnType<typeof useLoad<T>>;
  loadingText: string;
  children: (value: T) => ReactNode;
}) {
  const { state, loading, refresh } = load;
  if (!state) {
    return (
      <p role="status" className={`${panelClass} text-rb-muted`}>
        {loadingText}
      </p>
    );
  }
  if (!state.result.ok) {
    return (
      <div role="alert" className="rounded-2xl border border-[#e0b3a7] bg-[#fdf1ed] p-6 font-semibold text-[#8f2d1c]">
        <p>{state.result.message}</p>
        <button type="button" onClick={refresh} disabled={loading} className={`mt-4 ${primaryButtonClass}`}>
          {loading ? "Trying again…" : "Try again"}
        </button>
      </div>
    );
  }
  return <>{children(state.result.value)}</>;
}

function Toolbar({
  summary,
  loading,
  onRefresh,
  children,
}: {
  summary: string;
  loading: boolean;
  onRefresh: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mb-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">{children}</div>
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
        <p role="status" aria-atomic="true" className="text-sm font-semibold text-rb-ink">
          {loading ? "Refreshing…" : summary}
        </p>
        <button type="button" onClick={onRefresh} disabled={loading} className={secondaryButtonClass}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* People                                                                     */
/* -------------------------------------------------------------------------- */

function PeopleSection({
  load,
  adminId,
  onRoleChanged,
}: {
  load: ReturnType<typeof useLoad<AdminUser[]>>;
  adminId: string | null;
  onRoleChanged: (userId: string, role: AssignableRole) => void;
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<AccountRole | "none" | "all">("all");
  const ids = useId();

  return (
    <LoadFrame load={load} loadingText="Loading accounts…">
      {(users) => {
        const shown = filterUsers(users, query, role);
        return (
          <section aria-labelledby={`${ids}-heading`}>
            <h2 id={`${ids}-heading`} className="sr-only">
              People
            </h2>
            <Toolbar
              summary={`Showing ${shown.length} of ${plural(users.length, "account", "accounts")}`}
              loading={load.loading}
              onRefresh={load.refresh}
            >
              <div>
                <label htmlFor={`${ids}-search`} className="text-sm font-bold text-rb-ink">
                  Search people
                </label>
                <input
                  id={`${ids}-search`}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Name or email"
                  className={`mt-1 ${inputClass}`}
                />
              </div>
              <div>
                <label htmlFor={`${ids}-role`} className="text-sm font-bold text-rb-ink">
                  Role
                </label>
                <select
                  id={`${ids}-role`}
                  value={role}
                  onChange={(event) => setRole(event.target.value as typeof role)}
                  className={`mt-1 ${inputClass} sm:w-48`}
                >
                  <option value="all">All roles</option>
                  <option value="none">Needs a role</option>
                  <option value="student">Students</option>
                  <option value="professor">Professors</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
            </Toolbar>

            {users.length === 0 ? (
              <p className={`${panelClass} text-rb-muted`}>No accounts exist yet. Add users in Supabase Authentication.</p>
            ) : shown.length === 0 ? (
              <p className={`${panelClass} text-rb-muted`}>No accounts match this search. Clear the search or choose “All roles”.</p>
            ) : (
              <ul className="space-y-3" aria-label="Accounts">
                {shown.map((user) => (
                  <li key={`${user.id}:${user.role ?? "none"}`}>
                    <UserRow user={user} isSelf={user.id === adminId} onRoleChanged={onRoleChanged} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      }}
    </LoadFrame>
  );
}

function UserRow({
  user,
  isSelf,
  onRoleChanged,
}: {
  user: AdminUser;
  isSelf: boolean;
  onRoleChanged: (userId: string, role: AssignableRole) => void;
}) {
  const [choice, setChoice] = useState<AssignableRole | "">(
    user.role === "student" || user.role === "professor" ? user.role : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const selectId = useId();

  const joined = formatDate(user.createdAt);
  const lastSignIn = user.lastSignInAt ? formatDate(user.lastSignInAt) : "";
  const changed = choice !== "" && choice !== user.role;
  const name = user.fullName ?? "Name not provided";

  async function save() {
    if (choice === "" || !changed) return;
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const result = await setUserRole(getSupabaseBrowserClient(), user.id, choice);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSaved(`Saved. ${name} is now a ${ROLE_LABELS[result.value].toLowerCase()}.`);
      onRoleChanged(user.id, result.value);
    } catch {
      setError("Supabase is not configured for this frontend.");
    } finally {
      setSaving(false);
    }
  }

  let control: ReactNode;
  if (user.role === "admin") {
    control = <p className="text-sm text-rb-muted">{isSelf ? "This is you." : "Admins are managed in Supabase."}</p>;
  } else {
    control = (
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div>
          <label htmlFor={selectId} className="text-xs font-bold text-rb-ink">
            Role for {name}
          </label>
          <select
            id={selectId}
            value={choice}
            onChange={(event) => {
              setChoice(event.target.value as AssignableRole | "");
              setSaved(null);
              setError(null);
            }}
            className={`mt-1 ${inputClass} sm:w-40`}
          >
            {user.role === null ? <option value="">Choose a role</option> : null}
            <option value="student">Student</option>
            <option value="professor">Professor</option>
          </select>
        </div>
        <button type="submit" disabled={!changed || saving} className={primaryButtonClass}>
          {saving ? "Saving…" : user.role === null ? "Activate" : "Save role"}
        </button>
      </form>
    );
  }

  return (
    <article className={panelClass}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-rb-ink">{name}</h3>
            {user.role ? (
              <span className="rounded-full bg-rb-tag-surface px-2.5 py-0.5 text-xs font-bold text-rb-brand">
                {ROLE_LABELS[user.role]}
              </span>
            ) : (
              <span className="rounded-full border border-[#e0b3a7] bg-[#fdf1ed] px-2.5 py-0.5 text-xs font-bold text-[#8f2d1c]">
                Needs a role
              </span>
            )}
          </div>
          <p className="mt-1 break-all text-sm text-rb-muted">{user.email || "No email"}</p>
          <p className="mt-1 text-xs text-rb-muted">
            {[joined ? `Joined ${joined}` : null, lastSignIn ? `Last sign-in ${lastSignIn}` : "Never signed in"]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="shrink-0">{control}</div>
      </div>
      {error ? (
        <p role="alert" className={`mt-3 ${errorTextClass}`}>
          {error}
        </p>
      ) : null}
      <p role="status" className="mt-2 text-[13px] font-semibold text-[#006747] empty:hidden">
        {saved}
      </p>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Postings                                                                   */
/* -------------------------------------------------------------------------- */

function PostingsSection({
  load,
  onStatusChanged,
}: {
  load: ReturnType<typeof useLoad<AdminOpportunity[]>>;
  onStatusChanged: (id: string, status: "published" | "closed") => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const ids = useId();

  return (
    <LoadFrame load={load} loadingText="Loading postings…">
      {(postings) => {
        const shown = filterAdminOpportunities(postings, query, status);
        return (
          <section aria-labelledby={`${ids}-heading`}>
            <h2 id={`${ids}-heading`} className="sr-only">
              Postings
            </h2>
            <Toolbar
              summary={`Showing ${shown.length} of ${plural(postings.length, "posting", "postings")}`}
              loading={load.loading}
              onRefresh={load.refresh}
            >
              <div>
                <label htmlFor={`${ids}-search`} className="text-sm font-bold text-rb-ink">
                  Search postings
                </label>
                <input
                  id={`${ids}-search`}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Title or professor"
                  className={`mt-1 ${inputClass}`}
                />
              </div>
              <div>
                <label htmlFor={`${ids}-status`} className="text-sm font-bold text-rb-ink">
                  Status
                </label>
                <select
                  id={`${ids}-status`}
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className={`mt-1 ${inputClass} sm:w-48`}
                >
                  <option value="all">All statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </Toolbar>

            {postings.length === 0 ? (
              <p className={`${panelClass} text-rb-muted`}>No professor has posted an opportunity yet.</p>
            ) : shown.length === 0 ? (
              <p className={`${panelClass} text-rb-muted`}>No postings match this search. Clear the search or choose “All statuses”.</p>
            ) : (
              <ul className="space-y-4" aria-label="Postings">
                {shown.map((posting) => (
                  <li key={posting.id}>
                    <PostingRow posting={posting} onStatusChanged={onStatusChanged} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      }}
    </LoadFrame>
  );
}

function PostingRow({
  posting,
  onStatusChanged,
}: {
  posting: AdminOpportunity;
  onStatusChanged: (id: string, status: "published" | "closed") => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const title = posting.title || "Untitled opportunity";
  const posted = formatDate(posting.createdAt);
  const next = posting.status === "published" ? "closed" : posting.status === "closed" ? "published" : null;
  const applicantCount = posting.applicants.length;

  const summary = useMemo(
    () =>
      [
        posting.professorName ? `By ${posting.professorName}` : "Professor name not set",
        posted ? `Posted ${posted}` : null,
        plural(applicantCount, "applicant", "applicants"),
      ]
        .filter(Boolean)
        .join(" · "),
    [posting.professorName, posted, applicantCount],
  );

  async function changeStatus() {
    if (!next) return;
    setBusy(true);
    setError(null);
    try {
      const result = await setOpportunityStatus(getSupabaseBrowserClient(), posting.id, next);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setAnnouncement(`${title} is now ${result.value === "closed" ? "closed" : "published"}.`);
      onStatusChanged(posting.id, result.value);
    } catch {
      setError("Supabase is not configured for this frontend.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={panelClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words font-serif text-xl font-bold text-rb-ink">{title}</h3>
            <StatusBadge status={posting.status} />
          </div>
          <p className="mt-1 text-sm text-rb-muted">{summary}</p>
          {posting.status === "closed" ? (
            <p className="mt-1 text-sm text-rb-muted">Closed postings are hidden from students.</p>
          ) : posting.status === "draft" ? (
            <p className="mt-1 text-sm text-rb-muted">Drafts are private. Only the professor can publish them.</p>
          ) : null}
        </div>
        {next ? (
          <button type="button" onClick={() => void changeStatus()} disabled={busy} className={`${secondaryButtonClass} shrink-0`}>
            {busy ? "Saving…" : next === "closed" ? "Close posting" : "Reopen posting"}
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className={`mt-3 ${errorTextClass}`}>
          {error}
        </p>
      ) : null}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <details className="mt-4 border-t border-rb-border pt-4">
        <summary className="cursor-pointer rounded text-sm font-bold text-rb-brand hover:text-rb-brand-hover">
          {applicantCount === 0 ? "No applicants yet" : `View ${plural(applicantCount, "applicant", "applicants")}`}
        </summary>
        <ApplicantList applicants={posting.applicants} opportunityTitle={title} />
      </details>
    </article>
  );
}
