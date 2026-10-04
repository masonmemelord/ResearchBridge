-- Student self-service signup.
--
-- When the frontend's sign-up page creates an Auth user, it sets
-- raw_user_meta_data.self_signup = true and a full_name. This trigger creates
-- the matching public.profiles row in the same transaction, so the profile
-- exists even when email confirmation means the browser has no session yet.
--
-- Security notes:
-- * The role is always 'student'. User metadata is attacker-controlled and is
--   never read for the role. Professor and admin profiles are still created
--   only by the team (dashboard/SQL editor), exactly as before.
-- * Users created without the marker (for example through the dashboard's
--   "Add user") get no automatic profile, so the existing provisioning steps
--   in README.md keep working unchanged.
-- * The marker grants nothing new: any signed-in user could already insert
--   their own student profile under the existing RLS insert policy.

create function public.handle_student_self_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_name text;
begin
  if coalesce(new.raw_user_meta_data ->> 'self_signup', '') <> 'true' then
    return new;
  end if;

  -- Strip control characters, collapse whitespace, cap the length, and store
  -- NULL rather than an empty name.
  clean_name := nullif(
    left(
      btrim(
        regexp_replace(
          regexp_replace(coalesce(new.raw_user_meta_data ->> 'full_name', ''), '[[:cntrl:]]', '', 'g'),
          '\s+', ' ', 'g'
        )
      ),
      120
    ),
    ''
  );

  insert into public.profiles (id, full_name, role)
  values (new.id, clean_name, 'student')
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_student_self_signup() from public, anon, authenticated;

create trigger on_auth_user_created_student_profile
  after insert on auth.users
  for each row
  execute function public.handle_student_self_signup();
