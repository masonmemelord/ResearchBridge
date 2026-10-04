import {
  applicantEmailHref,
  formatDate,
  type Applicant,
} from "../../lib/applications/applications";

/** Applicants for one opportunity: name, email link, date, and message. */
export function ApplicantList({
  applicants,
  opportunityTitle,
}: {
  applicants: readonly Applicant[];
  opportunityTitle: string;
}) {
  if (applicants.length === 0) {
    return <p className="mt-2 text-sm text-rb-muted">No applications yet.</p>;
  }
  return (
    <ul className="mt-3 divide-y divide-rb-border">
      {applicants.map((applicant) => {
        const appliedOn = formatDate(applicant.createdAt);
        return (
          <li key={applicant.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="font-semibold text-rb-ink">{applicant.name ?? "Name not provided"}</p>
              {appliedOn ? <p className="text-xs text-rb-muted">Applied {appliedOn}</p> : null}
            </div>
            <a
              href={applicantEmailHref(applicant.email, opportunityTitle)}
              className="mt-1 inline-block break-all text-sm font-semibold text-rb-brand underline underline-offset-2 hover:text-rb-brand-hover"
            >
              {applicant.email}
            </a>
            {applicant.message ? (
              <p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-rb-surface p-3 text-sm leading-6 text-rb-ink">
                {applicant.message}
              </p>
            ) : (
              <p className="mt-2 text-sm italic text-rb-muted">No message included.</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
