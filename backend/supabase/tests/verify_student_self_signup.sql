-- Verifies the student self-signup trigger from
-- 20261004120000_student_self_signup_profiles.sql. Synthetic users only.
begin;
select plan(11);

select has_trigger(
  'auth', 'users', 'on_auth_user_created_student_profile',
  'auth.users has the student self-signup trigger'
);

-- 1. A normal self-signup gets a student profile with a cleaned name.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
values ('cccccccc-1111-4444-8888-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'signup-a@example.com', '', '{}', jsonb_build_object('self_signup', true, 'full_name', E'  Ada \t  Lovelace\n '));

select is(
  (select role::text from public.profiles where id = 'cccccccc-1111-4444-8888-111111111111'),
  'student',
  'self-signup creates a student profile'
);
select is(
  (select full_name from public.profiles where id = 'cccccccc-1111-4444-8888-111111111111'),
  'Ada Lovelace',
  'full name is trimmed, control characters removed, whitespace collapsed'
);

-- 2. Metadata cannot choose the role.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
values ('cccccccc-2222-4444-8888-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'signup-b@example.com', '', '{}', '{"self_signup": true, "full_name": "Mallory", "role": "professor"}');

select is(
  (select role::text from public.profiles where id = 'cccccccc-2222-4444-8888-222222222222'),
  'student',
  'a role in signup metadata is ignored; the profile is still student'
);

-- 3. Blank and oversized names.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
values
  ('cccccccc-3333-4444-8888-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'signup-c@example.com', '', '{}', '{"self_signup": true, "full_name": "   "}'),
  ('cccccccc-4444-4444-8888-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'signup-d@example.com', '', '{}', jsonb_build_object('self_signup', true, 'full_name', repeat('x', 500)));

select is(
  (select full_name from public.profiles where id = 'cccccccc-3333-4444-8888-333333333333'),
  null,
  'a blank name is stored as NULL'
);
select is(
  (select char_length(full_name) from public.profiles where id = 'cccccccc-4444-4444-8888-444444444444'),
  120,
  'names are capped at 120 characters'
);

-- 4. Users without the marker (dashboard "Add user") get no automatic profile,
--    so team provisioning of professors keeps working.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
values
  ('cccccccc-5555-4444-8888-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'dashboard-user@example.com', '', '{}', '{}'),
  ('cccccccc-6666-4444-8888-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'string-marker@example.com', '', '{}', '{"self_signup": "yes"}');

select is(
  (select count(*)::integer from public.profiles where id = 'cccccccc-5555-4444-8888-555555555555'),
  0,
  'users created without the self-signup marker get no automatic profile'
);
select is(
  (select count(*)::integer from public.profiles where id = 'cccccccc-6666-4444-8888-666666666666'),
  0,
  'only the exact self_signup=true marker creates a profile'
);
select lives_ok(
  $$ insert into public.profiles (id, full_name, role)
     values ('cccccccc-5555-4444-8888-555555555555', 'Dashboard Professor', 'professor') $$,
  'the team can still provision a professor profile for a dashboard-created user'
);

-- 5. Self-signed-up students still cannot promote themselves.
set local "request.jwt.claims" = '{"sub":"cccccccc-1111-4444-8888-111111111111","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$ update public.profiles set role = 'professor' where id = 'cccccccc-1111-4444-8888-111111111111' $$,
  '42501',
  'profile roles cannot be changed by authenticated users',
  'a self-signed-up student cannot change their role'
);

-- 6. Signed-in users cannot call the trigger function directly.
select throws_ok(
  $$ select public.handle_student_self_signup() $$,
  '42501',
  null,
  'authenticated users cannot execute the trigger function'
);

reset role;
select * from finish();
rollback;
