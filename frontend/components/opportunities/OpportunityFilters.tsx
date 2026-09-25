import type { RefObject } from "react";
import {
  ALL,
  CLASS_YEAR_LABELS,
  DURATION_OPTIONS,
  durationLabel,
  type OpportunityFilters as Filters,
} from "../../lib/opportunities/published";

const controlClass =
  "mt-2 w-full rounded-xl border border-rb-soft-border bg-white/75 px-4 py-3 text-[15px] leading-6 text-rb-ink transition placeholder:text-[rgba(17,17,17,0.6)] focus:border-rb-brand focus:ring-4 focus:ring-[rgba(0,103,71,0.22)]";
const labelClass = "text-sm font-bold tracking-tight text-rb-ink";

type OpportunityFiltersProps = {
  filters: Filters;
  schoolOptions: readonly { value: string; label: string }[];
  onChange: (next: Filters) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
};

export function OpportunityFilters({
  filters,
  schoolOptions,
  onChange,
  searchInputRef,
}: OpportunityFiltersProps) {
  function update<K extends keyof Filters>(field: K, value: Filters[K]) {
    onChange({ ...filters, [field]: value });
  }

  return (
    <form
      role="search"
      aria-label="Filter opportunities"
      onSubmit={(event) => event.preventDefault()}
      className="grid gap-5 rounded-[22px] border border-rb-border bg-rb-card p-5 shadow-[0_14px_30px_rgba(17,17,17,0.06)] sm:grid-cols-2 sm:p-6 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]"
    >
      <div className="sm:col-span-2 lg:col-span-1">
        <label htmlFor="opportunity-search" className={labelClass}>
          Search
        </label>
        <input
          ref={searchInputRef}
          id="opportunity-search"
          type="search"
          autoComplete="off"
          value={filters.query}
          onChange={(event) => update("query", event.target.value)}
          aria-describedby="opportunity-search-hint"
          placeholder="e.g. microscopy, neuroscience"
          className={controlClass}
        />
        <p id="opportunity-search-hint" className="mt-2 text-[13px] leading-5 text-rb-muted">
          Matches titles, departments, descriptions, majors, and keywords.
        </p>
      </div>

      <div>
        <label htmlFor="filter-school" className={labelClass}>
          School
        </label>
        <select
          id="filter-school"
          value={filters.school}
          onChange={(event) => update("school", event.target.value)}
          className={controlClass}
        >
          <option value={ALL}>All schools</option>
          {schoolOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-duration" className={labelClass}>
          Duration
        </label>
        <select
          id="filter-duration"
          value={filters.duration}
          onChange={(event) => update("duration", event.target.value)}
          className={controlClass}
        >
          <option value={ALL}>All durations</option>
          {DURATION_OPTIONS.map((semesters) => (
            <option key={semesters} value={String(semesters)}>
              {durationLabel(semesters)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filter-class-year" className={labelClass}>
          Eligible class year
        </label>
        <select
          id="filter-class-year"
          value={filters.classYear}
          onChange={(event) => update("classYear", event.target.value)}
          className={controlClass}
        >
          <option value={ALL}>All class years</option>
          {Object.entries(CLASS_YEAR_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
