-- Enforce professor authorization at the database boundary before the browser
-- client begins writing directly through the Supabase Data API.

create function public.is_professor(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'professor'
  );
$$;

revoke all on function public.is_professor(uuid) from public;
grant execute on function public.is_professor(uuid) to authenticated;

drop policy "Professors can insert their own opportunities"
  on public.opportunities;
drop policy "Professors can update their own opportunities"
  on public.opportunities;
drop policy "Professors can delete their own opportunities"
  on public.opportunities;

create policy "Professors can insert their own opportunities"
  on public.opportunities
  for insert
  to authenticated
  with check (
    auth.uid() = professor_id
    and public.is_professor(auth.uid())
  );

create policy "Professors can update their own opportunities"
  on public.opportunities
  for update
  to authenticated
  using (
    auth.uid() = professor_id
    and public.is_professor(auth.uid())
  )
  with check (
    auth.uid() = professor_id
    and public.is_professor(auth.uid())
  );

create policy "Professors can delete their own opportunities"
  on public.opportunities
  for delete
  to authenticated
  using (
    auth.uid() = professor_id
    and public.is_professor(auth.uid())
  );

-- A user may create their own professor or student profile during onboarding,
-- but can never self-assign the admin role.
drop policy "Users can insert their own profile" on public.profiles;

create policy "Users can insert their own non-admin profile"
  on public.profiles
  for insert
  to authenticated
  with check (
    auth.uid() = id
    and role in ('professor', 'student')
  );

-- Preserve the existing role when users edit their profile. Trusted direct
-- database sessions and service-role operations can still administer roles.
create function public.prevent_profile_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
    and auth.role() = 'authenticated'
  then
    raise exception using
      errcode = '42501',
      message = 'profile roles cannot be changed by authenticated users';
  end if;

  return new;
end;
$$;

create trigger profiles_prevent_role_change
  before update of role on public.profiles
  for each row
  execute function public.prevent_profile_role_change();
