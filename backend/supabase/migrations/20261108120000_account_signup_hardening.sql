-- Coordinate this migration with the password-setup/recovery frontend.
-- Keep hosted registration closed until the hosted integration suite passes.
begin;

create or replace function public.handle_student_self_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(left(btrim(regexp_replace(
      regexp_replace(coalesce(new.raw_user_meta_data ->> 'full_name', ''), '[[:cntrl:]]', '', 'g'),
      '\s+', ' ', 'g')), 120), ''),
    'student'
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop policy "Users can insert their own student profile" on public.profiles;

create function public.has_profile(user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = user_id); $$;
revoke all on function public.has_profile(uuid) from public, anon;
grant execute on function public.has_profile(uuid) to authenticated;

alter policy "Published opportunities are viewable by authenticated users"
on public.opportunities using (
  status = 'published' and public.has_profile((select auth.uid()))
);

-- Auth internals: re-run real Auth HTTP tests on every GoTrue upgrade.
-- Discard credentials chosen before inbox ownership was proved, in the same
-- transaction as confirmation. Metadata must never control this protection.
-- Dashboard auto-confirm has no pending confirmation; invitations use their
-- own flow. Both are covered by integration controls.
create function public.discard_unverified_signup_password()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null
     and (coalesce(old.confirmation_token, '') <> '' or old.confirmation_sent_at is not null) then
    new.encrypted_password := '';
  end if;
  return new;
end;
$$;
revoke all on function public.discard_unverified_signup_password() from public, anon, authenticated;
create trigger discard_unverified_signup_password
  before update of email_confirmed_at on auth.users
  for each row execute function public.discard_unverified_signup_password();

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.role_changes (
  id bigint generated always as identity primary key,
  changed_at timestamptz not null default now(),
  changed_by uuid not null,
  target_user_id uuid not null,
  previous_role public.user_role,
  new_role public.user_role not null
);
alter table private.role_changes enable row level security;
revoke all on private.role_changes from public, anon, authenticated;

create or replace function public.admin_set_user_role(target_user_id uuid, new_role public.user_role)
returns public.user_role language plpgsql security definer set search_path = ''
as $$
declare
  existing_role public.user_role;
  account_name text;
  account_confirmed boolean;
begin
  if not public.is_admin(auth.uid()) then
    raise exception using errcode = '42501', message = 'admin access required';
  end if;
  if target_user_id = auth.uid() then
    raise exception using errcode = '42501', message = 'admins cannot change their own role';
  end if;
  if new_role is null or new_role not in ('student', 'professor') then
    raise exception using errcode = '22023', message = 'admins can assign only the student or professor role';
  end if;
  -- Lock the Auth row so concurrent role changes are serialized, including
  -- activation of an older account whose profile is missing.
  select nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
         (u.email_confirmed_at is not null or u.invited_at is not null)
  into account_name, account_confirmed
  from auth.users u where u.id = target_user_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'account not found';
  end if;
  select role into existing_role from public.profiles where id = target_user_id;
  if existing_role = 'admin' then
    raise exception using errcode = '42501', message = 'admin roles are managed in the database only';
  end if;
  if new_role = 'professor' and not account_confirmed then
    raise exception using errcode = '42501', message = 'confirm the email or invite the account before making it a professor';
  end if;
  insert into public.profiles (id, full_name, role)
  values (target_user_id, left(account_name, 120), new_role)
  on conflict (id) do update set role = excluded.role;
  if existing_role is distinct from new_role then
    insert into private.role_changes (changed_by, target_user_id, previous_role, new_role)
    values (auth.uid(), target_user_id, existing_role, new_role);
  end if;
  return new_role;
end;
$$;

-- The RPC remains admin-only; expose trusted confirmation/invitation state.
drop function public.admin_list_users();
create function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  role public.user_role,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  invited_at timestamptz
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
      u.last_sign_in_at,
      u.email_confirmed_at,
      u.invited_at
    from auth.users as u
    left join public.profiles as p on p.id = u.id
    order by u.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;


commit;
