-- 1. Create the table.
--    Primary key should link this row to the matching auth.users row.
create table students (

  id uuid primary key references auth.users(id),
  name text not null,
  email text unique not null,
  department text not null,
  major text not null, 
  university text default 'Tulane University'

  created_at timestamptz not null default now()

);

-- Enables Row Level Security
alter table students enable row level security;


-- Only authenticated users can view student profiles 
create policy "Students are viewable by authenticated users"
  on students
  for select
  using ( auth.role() = 'authenticated' );

-- Only authenticated users can create student profiles
create policy "Students can insert their own row"
  on students 
  for insert
  with check ( auth.uid() = id );

-- Only authenticated users can update their student profiles 
create policy "Students can update their own row"
  on students
  for update
  using ( auth.uid() = id );
  with check ( auth.uid() = id );

