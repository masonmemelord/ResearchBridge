drop policy "Users can insert their own non-admin profile"
  on public.profiles;

create policy "Users can insert their own student profile"
  on public.profiles
  for insert
  to authenticated
  with check (
    auth.uid() = id
    and role = 'student'
  );

drop policy "Professors can view their own opportunities"
  on public.opportunities;

create policy "Professors can view their own opportunities"
  on public.opportunities
  for select
  to authenticated
  using (
    auth.uid() = professor_id
  );

drop policy "Published opportunities are viewable by authenticated users"
  on public.opportunities;

create policy "Published opportunities are viewable by authenticated users"
  on public.opportunities
  for select
  to authenticated
  using (
    status = 'published'
  );
