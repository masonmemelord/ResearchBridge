/** Release gates. These UI gates do not replace Supabase Auth/RLS. */
export const PILOT_CONTACT_EMAIL = "TheResearchAmbassadors@wave.tulane.edu";

export function publicSignupEnabled(
  flag = process.env.NEXT_PUBLIC_ENABLE_SELF_SIGNUP,
  mode = process.env.NODE_ENV,
): boolean {
  return mode !== "production" && flag === "true";
}

export function resumeDemoEnabled(
  flag = process.env.NEXT_PUBLIC_ENABLE_RESUME_DEMO,
  mode = process.env.NODE_ENV,
): boolean {
  return mode !== "production" && flag === "true";
}

export function draftSavingEnabled(
  flag = process.env.NEXT_PUBLIC_ENABLE_DRAFTS,
  mode = process.env.NODE_ENV,
): boolean {
  return mode !== "production" && flag === "true";
}

/** Encoded subjects/bodies; never turn uploaded text into executable URLs. */
export function pilotEmailHref(title: string): string {
  // Keep user-authored titles on one line even after an email client decodes them.
  const safeTitle = title.replace(/[\x00-\x1f\x7f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "Untitled opportunity";
  const subject = `ResearchBridge opportunity: ${safeTitle}`;
  const body = `Hello Research Ambassadors,\n\nI'm interested in the opportunity "${safeTitle}". Could you share the faculty-approved next steps?\n\nThank you.`;
  return `mailto:${PILOT_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
