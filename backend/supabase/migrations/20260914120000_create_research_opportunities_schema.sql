-- Replaces the separate professors/students tables with a single profiles
-- table keyed by role, and adds departments + opportunities for the
-- Sept 20 milestone (professors publish opportunities, students browse them).

drop table if exists students;
drop table if exists professors;

-- 1. Enums
create type user_role as enum ('professor', 'student', 'admin');
create type opportunity_status as enum ('draft', 'published', 'closed');
create type student_class_year as enum ('freshman', 'sophomore', 'junior', 'senior');

-- 2. profiles: one row per auth.users row, holding shared identity + role.
create table profiles (
  id uuid primary key references auth.users(id),
  full_name text,
  role user_role not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on profiles
  for select
  using ( auth.role() = 'authenticated' );

create policy "Users can insert their own profile"
  on profiles
  for insert
  with check ( auth.uid() = id );

create policy "Users can update their own profile"
  on profiles
  for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

-- 3. departments
create table departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  abbreviation text unique
);

alter table departments enable row level security;

create policy "Departments are viewable by authenticated users"
  on departments
  for select
  using ( auth.role() = 'authenticated' );

-- 4. opportunities
create table opportunities (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references profiles(id),
  department_id uuid not null references departments(id),
  title text not null,
  description text not null,
  duration_semesters smallint not null,
  eligible_class_years student_class_year[] not null,
  positions_available smallint not null,
  status opportunity_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint opportunities_duration_semesters_range
    check ( duration_semesters between 1 and 4),
  constraint opportunities_positions_available_positive
    check ( positions_available > 0 ),
  constraint opportunities_title_not_empty
    check ( length(trim(title)) > 0 ),
  constraint opportunities_description_not_empty
    check ( length(trim(description)) > 0 ),
  constraint opportunities_eligible_class_years_not_empty
    check ( cardinality(eligible_class_years) > 0 )
);

create index opportunities_status_idx on opportunities (status);
create index opportunities_department_id_idx on opportunities (department_id);
create index opportunities_professor_id_idx on opportunities (professor_id);
-- Supports future "opportunities eligible for class year X" filtering.
create index opportunities_eligible_class_years_gin_idx
  on opportunities using gin (eligible_class_years);

-- Keep updated_at current on every row change.
create function set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger opportunities_set_updated_at
  before update on opportunities
  for each row
  execute function set_updated_at();

alter table opportunities enable row level security;

-- Professors can create only their own opportunities.
create policy "Professors can insert their own opportunities"
  on opportunities
  for insert
  with check ( auth.uid() = professor_id );

-- Professors see their own opportunities in every status (draft/published/closed);
-- everyone authenticated can additionally see published ones (this policy is
-- combined with the one below via OR, since RLS SELECT policies are permissive).
create policy "Professors can view their own opportunities"
  on opportunities
  for select
  using ( auth.uid() = professor_id );

create policy "Published opportunities are viewable by authenticated users"
  on opportunities
  for select
  using ( status = 'published' );

create policy "Professors can update their own opportunities"
  on opportunities
  for update
  using ( auth.uid() = professor_id )
  with check ( auth.uid() = professor_id );

create policy "Professors can delete their own opportunities"
  on opportunities
  for delete
  using ( auth.uid() = professor_id );
