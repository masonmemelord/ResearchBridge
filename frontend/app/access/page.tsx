import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, authStyles } from "../../components/auth/AuthShell";
import { PILOT_CONTACT_EMAIL, pilotEmailHref } from "../../lib/release";

export const metadata: Metadata = { title: "Request pilot access | ResearchBridge" };

export default function PilotAccessPage() {
  return (
    <AuthShell caption="Invite-only pilot" footer={<Link href="/sign-in" className={authStyles.textLink}>Already have an account? Sign in</Link>}>
      <h1 className="font-serif text-3xl font-black tracking-tight text-rb-ink">Join the research pilot.</h1>
      <p className="mt-4 text-sm leading-6 text-rb-muted">Faculty post opportunities and invited students discover them. The Research Ambassadors team sets up student and professor accounts; public registration is not open yet.</p>
      <a href={pilotEmailHref()} className={`mt-7 block text-center ${authStyles.primaryButton}`}>Email to request an invitation</a>
      <p className="mt-5 break-all text-sm font-semibold text-rb-brand">{PILOT_CONTACT_EMAIL}</p>
      <p className="mt-3 text-sm leading-6 text-rb-muted">The button opens your email app. If it does not open, email the address above. Please do not send passwords or résumés. Sending a request does not create an account or guarantee access.</p>
    </AuthShell>
  );
}
