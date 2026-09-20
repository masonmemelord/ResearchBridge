-- Align the opportunities table with the version-2 professor form.
--
-- The form treats school as a controlled value, but department as free text.
-- Preferred majors are optional discovery hints; keywords are required.

create type public.academic_school as enum (
  'architecture',
  'liberal_arts',
  'public_health',
  'science_and_engineering'
);

alter table public.opportunities
  add column school public.academic_school,
  add column department text,
  add column preferred_majors text[] not null default '{}'::text[],
  add column keywords text[] not null default '{}'::text[];

-- Preserve any opportunities created before this migration. The departments
-- in the current seed all belong to Science and Engineering. Deriving one
-- initial keyword from the former department keeps legacy rows searchable.
update public.opportunities as opportunity
set
  school = 'science_and_engineering',
  department = department_record.name,
  keywords = array[lower(department_record.name)]
from public.departments as department_record
where department_record.id = opportunity.department_id;

alter table public.opportunities
  alter column school set not null,
  alter column department set not null,
  alter column keywords drop default,
  drop column department_id;

-- Validate the comma-separated lists after the frontend converts them into
-- arrays. Besides matching the UI limits, this rejects whitespace-only,
-- untrimmed, null, and case-insensitive duplicate values.
create function public.valid_opportunity_text_list(
  items text[],
  minimum_item_length integer,
  maximum_item_length integer
)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select
    coalesce(
      bool_and(
        item is not null
        and item = btrim(item)
        and char_length(item) between minimum_item_length and maximum_item_length
      ),
      true
    )
    and count(*) = count(distinct lower(item))
  from unnest(items) as list_item(item);
$$;

alter table public.opportunities
  drop constraint opportunities_title_not_empty,
  drop constraint opportunities_description_not_empty,
  drop constraint opportunities_positions_available_positive,

  add constraint opportunities_title_length
    check (char_length(trim(title)) between 1 and 120),

  add constraint opportunities_description_length
    check (char_length(trim(description)) >= 30),

  add constraint opportunities_department_length
    check (char_length(trim(department)) between 2 and 100),

  add constraint opportunities_positions_range
    check (positions_available between 1 and 20),

  add constraint opportunities_preferred_majors_count
    check (cardinality(preferred_majors) between 0 and 8),

  add constraint opportunities_preferred_majors_items
    check (public.valid_opportunity_text_list(preferred_majors, 2, 60)),

  add constraint opportunities_keywords_count
    check (cardinality(keywords) between 1 and 8),

  add constraint opportunities_keywords_items
    check (public.valid_opportunity_text_list(keywords, 2, 30));

create index opportunities_school_idx
  on public.opportunities (school);

create index opportunities_department_lower_idx
  on public.opportunities (lower(department));

create index opportunities_preferred_majors_gin_idx
  on public.opportunities using gin (preferred_majors);

create index opportunities_keywords_gin_idx
  on public.opportunities using gin (keywords);

comment on column public.opportunities.school is
  'Broader academic school containing the research opportunity.';

comment on column public.opportunities.department is
  'Free-form department or discipline hosting the research.';

comment on column public.opportunities.preferred_majors is
  'Suggested academic backgrounds; an empty array means open to all majors.';

comment on column public.opportunities.keywords is
  'Required search terms used to discover the opportunity.';
