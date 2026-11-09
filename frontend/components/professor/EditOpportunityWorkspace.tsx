"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/auth-context";
import { PROFESSOR_ROUTES } from "../../lib/auth/profile";
import { EDIT_MESSAGES, loadOpportunityForEditing, type EditableOpportunity } from "../../lib/opportunities/editing";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import { OpportunityEditor } from "./OpportunityEditor";

type LoadState = { key: string } & (
  | { ok: true; value: EditableOpportunity }
  | { ok: false; message: string }
);

export function EditOpportunityWorkspace({ opportunityId }: { opportunityId: string }) {
  const { state } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<LoadState | null>(null);
  const professorId = state.status === "signed-in" && state.role === "professor" ? state.userId : null;
  const key = `${professorId}:${opportunityId}:${attempt}`;

  useEffect(() => {
    if (!professorId) return;
    let cancelled = false;
    async function load(ownerId: string) {
      try {
        const result = await loadOpportunityForEditing(getSupabaseBrowserClient(), opportunityId, ownerId);
        if (!cancelled) setLoaded({ key, ...result });
      } catch {
        if (!cancelled) setLoaded({ key, ok: false, message: EDIT_MESSAGES.loadFailed });
      }
    }
    void load(professorId);
    return () => { cancelled = true; };
  }, [professorId, opportunityId, key]);

  if (loaded?.key !== key) return <p role="status" className="py-12 text-rb-muted">Loading opportunity…</p>;
  if (!loaded.ok) return (
    <section className="py-10">
      <h1 className="font-serif text-3xl font-bold text-rb-ink">Unable to edit this opportunity</h1>
      <p role="alert" className="mt-4 text-rb-muted">{loaded.message}</p>
      <div className="mt-6 flex flex-wrap gap-4">
        <button type="button" onClick={() => setAttempt((value) => value + 1)} className="rounded-lg bg-rb-brand px-5 py-3 font-bold text-white">Try again</button>
        <Link href={PROFESSOR_ROUTES.opportunities} className="rounded-lg border-2 border-rb-brand px-5 py-2.5 font-bold text-rb-ink">Back to my opportunities</Link>
      </div>
    </section>
  );
  return <OpportunityEditor key={`${key}:${loaded.value.updatedAt}`} existing={loaded.value} onReload={() => setAttempt((value) => value + 1)} />;
}
