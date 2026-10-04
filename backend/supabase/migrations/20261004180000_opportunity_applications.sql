-- Student applications to published opportunities.
--
-- * A student applies once to a published opportunity, with an optional short
--   message, and can withdraw (delete) their own application.
-- * The professor who owns the opportunity can read its applications,
--   including the applicant's name and account email for follow-up.
-- * Nobody can edit an application after it is sent.
--
-- The applicant's name and email are copied from profiles/auth.users by a
-- trigger at insert time. The browser cannot supply them, so a student cannot
-- impersonate someone else, and professors never need read access to other
-- users' profiles. That lets this migration also narrow profile reads to the
-- signed-in user's own row.

-- Also defined by the held résumé migration; `create or replace` keeps the two
-- compatible whichever is applied first.
create or replace function public.is_student(user_id uuid)
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
      and role = 'student'
  );
$$;

revoke all on function public.is_student(uuid) from public;
grant execute on function public.is_student(uuid) to authenticated;

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  student_name text,
  student_email text not null,
  message text,
  created_at timestamptz not null default now(),

  constraint applications_one_per_student unique (opportunity_id, student_id),
  constraint applications_message_length
    check (message is null or char_length(message) between 1 and 1000)
);

-- opportunity_id lookups use the unique constraint's index (leading column).
create index applications_student_id_idx on public.applications (student_id);

comment on table public.applications is
  'A student''s application to a published opportunity; readable by the student and the owning professor.';
comment on column public.applications.student_email is
  'Copied from auth.users at insert time so the owning professor can contact the applicant.';

-- Fill contact details from trusted tables, never from the request body.
create function public.set_application_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Reject impersonation before reading another user's details. RLS would
  -- also reject the row, but only after this trigger has run.
  if auth.role() = 'authenticated' and new.student_id is distinct from auth.uid() then
    raise exception using
      errcode = '42501',
      message = 'students can only apply as themselves';
  end if;

  new.student_email := (select u.email from auth.users as u where u.id = new.student_id);
  new.student_name := (select p.full_name from public.profiles as p where p.id = new.student_id);
  new.message := nullif(btrim(new.message), '');
  new.created_at := now();

  if new.student_email is null then
    raise exception using
      errcode = '23502',
      message = 'the applicant account has no email address';
  end if;

  return new;
end;
$$;

revoke all on function public.set_application_contact() from public, anon, authenticated;

create trigger applications_set_contact
  before insert on public.applications
  for each row
  execute function public.set_application_contact();

alter table public.applications enable row level security;

-- Clients may only choose the opportunity, themselves, and a message.
revoke all on public.applications from anon, authenticated;
grant select, delete on public.applications to authenticated;
grant insert (opportunity_id, student_id, message) on public.applications to authenticated;

create policy "Students apply to published opportunities"
  on public.applications
  for insert
  to authenticated
  with check (
    student_id = (select auth.uid())
    and public.is_student((select auth.uid()))
    and exists (
      select 1
      from public.opportunities as o
      where o.id = applications.opportunity_id
        and o.status = 'published'
    )
  );

create policy "Students read their own applications"
  on public.applications
  for select
  to authenticated
  using ( student_id = (select auth.uid()) );

create policy "Professors read applications to their opportunities"
  on public.applications
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.opportunities as o
      where o.id = applications.opportunity_id
        and o.professor_id = (select auth.uid())
    )
  );

create policy "Students withdraw their own applications"
  on public.applications
  for delete
  to authenticated
  using ( student_id = (select auth.uid()) );

-- Profiles: previously every signed-in user could read every profile. The app
-- only reads the signed-in user's own row, and applicant details now travel
-- through applications, so narrow reads to the owner.
drop policy "Profiles are viewable by authenticated users" on public.profiles;

create policy "Users can view their own profile"
  on public.profiles
  for select
  to authenticated
  using ( id = (select auth.uid()) );
