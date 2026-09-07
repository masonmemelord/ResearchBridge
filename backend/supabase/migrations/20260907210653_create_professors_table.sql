-- 1. Create the table.
--    Primary key should link this row to the matching auth.users row.
create table professors (

  id uuid primary key references auth.users(id),
  name text not null,
  email text unique not null,
  department text not null,
  university text default 'Tulane University',

  created_at timestamptz not null default now()
);

-- 2. Turn on Row Level Security. Until you add policies below,
--    NO ONE can read or write this table (not even the owner) once this runs.
alter table professors enable row level security;

-- 3. Add policies. Each one names an action and a condition.
--    Think about: who should be able to SELECT rows? INSERT their own row?
--    UPDATE their own row? Should anyone else be able to view professor
--    profiles (e.g. students browsing), or only the professor themselves?

create policy "Professors are viewable by authenticated users"
  on professors
  for select
  using ( auth.role() = 'authenticated' );

create policy "Professors can insert their own row"
  on professors
  for insert
  with check ( auth.uid() = id );

create policy "Professors can update their own row"
  on professors
  for update
  using ( auth.uid() = id );
