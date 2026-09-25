import {
  classYearLabel,
  durationLabel,
  schoolLabel,
  type PublishedOpportunity,
} from "../../lib/opportunities/published";

function TagList({ items, label }: { items: readonly string[]; label: string }) {
  return (
    <ul aria-label={label} className="mt-2 flex flex-wrap gap-2">
      {items.map((item, index) => (
        <li
          key={`${index}-${item}`}
          className="rounded-md bg-rb-tag-surface px-2.5 py-1 text-xs font-semibold text-rb-brand"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function Fallback({ children }: { children: string }) {
  return <p className="mt-1 text-rb-muted">{children}</p>;
}

export function OpportunityCard({ opportunity }: { opportunity: PublishedOpportunity }) {
  const {
    title,
    description,
    school,
    department,
    preferredMajors,
    keywords,
    durationSemesters,
    eligibleClassYears,
    positionsAvailable,
  } = opportunity;

  return (
    <article className="flex flex-col rounded-[22px] border border-rb-border bg-rb-card p-6 shadow-[0_14px_30px_rgba(17,17,17,0.08)]">
      <div className="flex flex-wrap gap-2 text-xs font-bold text-rb-brand">
        <span className="rounded-full bg-rb-surface px-3 py-1">{schoolLabel(school)}</span>
        {department ? (
          <span className="rounded-full bg-rb-tag-surface px-3 py-1">{department}</span>
        ) : null}
      </div>
      <h2 className="mt-5 break-words font-serif text-2xl font-bold text-rb-ink">
        {title || "Untitled opportunity"}
      </h2>
      {description ? (
        <p className="mt-3 line-clamp-4 break-words text-sm leading-6 text-rb-muted">
          {description}
        </p>
      ) : (
        <p className="mt-3 text-sm italic leading-6 text-rb-muted">
          The professor has not added a description yet.
        </p>
      )}
      <dl className="mt-6 grid gap-4 border-t border-rb-border pt-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-bold text-rb-ink">Duration</dt>
          <dd className="mt-1 text-rb-muted">{durationLabel(durationSemesters)}</dd>
        </div>
        <div>
          <dt className="font-bold text-rb-ink">Positions</dt>
          <dd className="mt-1 text-rb-muted">{positionsAvailable ?? "Not listed"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-bold text-rb-ink">Eligible class years</dt>
          <dd className="mt-1 text-rb-muted">
            {eligibleClassYears.length > 0
              ? eligibleClassYears.map(classYearLabel).join(", ")
              : "Not listed"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-bold text-rb-ink">Preferred majors</dt>
          <dd>
            {preferredMajors.length > 0 ? (
              <TagList items={preferredMajors} label="Preferred majors" />
            ) : (
              <Fallback>Open to all majors</Fallback>
            )}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-bold text-rb-ink">Keywords</dt>
          <dd>
            {keywords.length > 0 ? (
              <TagList items={keywords} label="Keywords" />
            ) : (
              <Fallback>No keywords listed</Fallback>
            )}
          </dd>
        </div>
      </dl>
    </article>
  );
}
