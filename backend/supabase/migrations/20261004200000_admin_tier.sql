-- Admin tier: the ResearchBridge team (role 'admin') oversees the board.
--
-- Admins can:
-- * read every profile, opportunity (any status), and application;
-- * list every Auth account with its email, including accounts that have no
--   profile yet (for example, users added through the dashboard);
-- * make a non-admin account a student or professor, creating the profile if
--   it is missing;
-- * publish or close any opportunity.
--
-- Admins cannot grant or remove the admin role, or change their own role, from
-- the app. Admins are appointed only by a trusted database session (Supabase
-- SQL editor), so a compromised admin session cannot mint more admins.
-- Privileged writes go through security-definer functions that check the
-- caller is an admin; no broad UPDATE policies are added for admins.

create function public.is_admin(user_id uuid)
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
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- Read access for admins. SELECT policies are permissive, so these add to the
-- existing owner/published rules rather than replacing them.
create policy "Admins can view all profiles"
  on public.profiles
  for select
  to authenticated
  using ( public.is_admin((select auth.uid())) );

create policy "Admins can view all opportunities"
  on public.opportunities
  for select
  to authenticated
  using ( public.is_admin((select auth.uid())) );

create policy "Admins can view all applications"
  on public.applications
  for select
  to authenticated
  using ( public.is_admin((select auth.uid())) );

-- Role changes by authenticated users stay blocked, except an admin changing
-- someone else's role. Admins have no UPDATE policy on other users' profiles,
-- so in practice that path is only reachable through admin_set_user_role().
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
    and auth.role() = 'authenticated'
    and not (public.is_admin(auth.uid()) and new.id is distinct from auth.uid())
  then
    raise exception using
      errcode = '42501',
      message = 'profile roles cannot be changed by authenticated users';
  end if;

  return new;
end;
$$;

create function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  role public.user_role,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception using errcode = '42501', message = 'admin access required';
  end if;

  return query
    select
      u.id,
      u.email::text,
      coalesce(p.full_name, nullif(btrim(u.raw_user_meta_data ->> 'full_name'), '')),
      p.role,
      u.created_at,
      u.last_sign_in_at
    from auth.users as u
    left join public.profiles as p on p.id = u.id
    order by u.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

create function public.admin_set_user_role(target_user_id uuid, new_role public.user_role)
returns public.user_role
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_role public.user_role;
  account_name text;
begin
  if not public.is_admin(auth.uid()) then
    raise exception using errcode = '42501', message = 'admin access required';
  end if;
  if target_user_id = auth.uid() then
    raise exception using errcode = '42501', message = 'admins cannot change their own role';
  end if;
  if new_role not in ('student', 'professor') then
    raise exception using errcode = '22023', message = 'admins can assign only the student or professor role';
  end if;

  select nullif(btrim(u.raw_user_meta_data ->> 'full_name'), '')
    into account_name
    from auth.users as u
    where u.id = target_user_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'account not found';
  end if;

  select p.role into existing_role from public.profiles as p where p.id = target_user_id;
  if existing_role = 'admin' then
    raise exception using errcode = '42501', message = 'admin roles are managed in the database only';
  end if;

  insert into public.profiles (id, full_name, role)
  values (target_user_id, left(account_name, 120), new_role)
  on conflict (id) do update set role = excluded.role;

  return new_role;
end;
$$;

revoke all on function public.admin_set_user_role(uuid, public.user_role) from public, anon;
grant execute on function public.admin_set_user_role(uuid, public.user_role) to authenticated;

create function public.admin_set_opportunity_status(
  target_opportunity_id uuid,
  new_status public.opportunity_status
)
returns public.opportunity_status
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception using errcode = '42501', message = 'admin access required';
  end if;
  if new_status not in ('published', 'closed') then
    raise exception using errcode = '22023', message = 'admins can only publish or close opportunities';
  end if;

  update public.opportunities
    set status = new_status
    where id = target_opportunity_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'opportunity not found';
  end if;

  return new_status;
end;
$$;

revoke all on function public.admin_set_opportunity_status(uuid, public.opportunity_status) from public, anon;
grant execute on function public.admin_set_opportunity_status(uuid, public.opportunity_status) to authenticated;
