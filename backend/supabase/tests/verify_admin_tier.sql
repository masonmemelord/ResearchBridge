begin;

select plan(24);

-- Fixtures: two admins, a professor, a student, and a dashboard-created
-- account with no profile yet.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
values
  ('d1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@admin.test', '', '{}', '{}'),
  ('d2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-b@admin.test', '', '{}', '{}'),
  ('d3333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prof@admin.test', '', '{}', '{}'),
  ('d4444444-4444-4444-8444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student@admin.test', '', '{}', '{}'),
  ('d5555555-5555-4555-8555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'new@admin.test', '', '{}', '{"full_name":"New Person"}');

insert into public.profiles (id, full_name, role)
values
  ('d1111111-1111-4111-8111-111111111111', 'Admin A', 'admin'),
  ('d2222222-2222-4222-8222-222222222222', 'Admin B', 'admin'),
  ('d3333333-3333-4333-8333-333333333333', 'Professor P', 'professor'),
  ('d4444444-4444-4444-8444-444444444444', 'Student S', 'student');

insert into public.opportunities (
  id, professor_id, school, department, keywords, title, description,
  duration_semesters, eligible_class_years, positions_available, status
)
values
  ('e1111111-1111-4111-8111-111111111111', 'd3333333-3333-4333-8333-333333333333', 'architecture', 'Urban Design', array['mapping'], 'Published P', 'A published opportunity with a long enough description.', 1, array['senior']::public.student_class_year[], 1, 'published'),
  ('e2222222-2222-4222-8222-222222222222', 'd3333333-3333-4333-8333-333333333333', 'architecture', 'Urban Design', array['mapping'], 'Draft P', 'A draft opportunity with a long enough description too.', 1, array['senior']::public.student_class_year[], 1, 'draft');

insert into public.applications (opportunity_id, student_id, student_email)
values ('e1111111-1111-4111-8111-111111111111', 'd4444444-4444-4444-8444-444444444444', 'ignored@admin.test');

-- Admin A reads everything.
set local "request.jwt.claims" = '{"sub":"d1111111-1111-4111-8111-111111111111","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*) from public.profiles where id in (
    'd1111111-1111-4111-8111-111111111111', 'd2222222-2222-4222-8222-222222222222',
    'd3333333-3333-4333-8333-333333333333', 'd4444444-4444-4444-8444-444444444444')),
  4::bigint,
  'an admin can read every profile'
);
select is((select count(*) from public.opportunities where id in ('e1111111-1111-4111-8111-111111111111', 'e2222222-2222-4222-8222-222222222222')), 2::bigint, 'an admin can read opportunities in every status');
select is((select count(*) from public.applications where opportunity_id = 'e1111111-1111-4111-8111-111111111111'), 1::bigint, 'an admin can read every application');

select is(
  (select count(*) from public.admin_list_users() where email like '%@admin.test'),
  5::bigint,
  'admin_list_users includes accounts without a profile'
);
select is(
  (select role::text from public.admin_list_users() where email = 'new@admin.test'),
  null,
  'an account without a profile has no role'
);
select is(
  (select full_name from public.admin_list_users() where email = 'new@admin.test'),
  'New Person',
  'the account name falls back to signup metadata'
);

-- Role management.
select is(
  public.admin_set_user_role('d5555555-5555-4555-8555-555555555555', 'professor')::text,
  'professor',
  'an admin can activate a profileless account as a professor'
);
select is(
  (select full_name from public.profiles where id = 'd5555555-5555-4555-8555-555555555555'),
  'New Person',
  'the created profile keeps the account name'
);
select is(
  public.admin_set_user_role('d4444444-4444-4444-8444-444444444444', 'professor')::text,
  'professor',
  'an admin can promote a student to professor'
);
select is(
  public.admin_set_user_role('d4444444-4444-4444-8444-444444444444', 'student')::text,
  'student',
  'an admin can change a professor back to student'
);
select throws_ok(
  $$ select public.admin_set_user_role('d4444444-4444-4444-8444-444444444444', 'admin') $$,
  '22023', null, 'an admin cannot grant the admin role from the app'
);
select throws_ok(
  $$ select public.admin_set_user_role('d2222222-2222-4222-8222-222222222222', 'student') $$,
  '42501', null, 'an admin cannot change another admin'
);
select throws_ok(
  $$ select public.admin_set_user_role('d1111111-1111-4111-8111-111111111111', 'professor') $$,
  '42501', null, 'an admin cannot change their own role'
);
select throws_ok(
  $$ select public.admin_set_user_role('d9999999-9999-4999-8999-999999999999', 'student') $$,
  'P0002', null, 'an unknown account is reported'
);

update public.profiles set role = 'student' where id = 'd3333333-3333-4333-8333-333333333333';
reset role;
select is(
  (select role::text from public.profiles where id = 'd3333333-3333-4333-8333-333333333333'),
  'professor',
  'an admin cannot change roles by updating profiles directly'
);

-- Opportunity moderation.
set local "request.jwt.claims" = '{"sub":"d1111111-1111-4111-8111-111111111111","role":"authenticated"}';
set local role authenticated;
select is(
  public.admin_set_opportunity_status('e1111111-1111-4111-8111-111111111111', 'closed')::text,
  'closed',
  'an admin can close an opportunity'
);
select is(
  public.admin_set_opportunity_status('e1111111-1111-4111-8111-111111111111', 'published')::text,
  'published',
  'an admin can reopen an opportunity'
);
select throws_ok(
  $$ select public.admin_set_opportunity_status('e1111111-1111-4111-8111-111111111111', 'draft') $$,
  '22023', null, 'an admin cannot move an opportunity back to draft'
);

-- Non-admins are refused.
reset role;
set local "request.jwt.claims" = '{"sub":"d3333333-3333-4333-8333-333333333333","role":"authenticated"}';
set local role authenticated;
select throws_ok($$ select * from public.admin_list_users() $$, '42501', null, 'a professor cannot list users');
select throws_ok(
  $$ select public.admin_set_opportunity_status('e1111111-1111-4111-8111-111111111111', 'closed') $$,
  '42501', null, 'a professor cannot use admin moderation'
);

reset role;
set local "request.jwt.claims" = '{"sub":"d4444444-4444-4444-8444-444444444444","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  $$ select public.admin_set_user_role('d4444444-4444-4444-8444-444444444444', 'professor') $$,
  '42501', null, 'a student cannot promote themselves'
);
select throws_ok(
  $$ update public.profiles set role = 'admin' where id = 'd4444444-4444-4444-8444-444444444444' $$,
  '42501', null, 'a student still cannot change their own role directly'
);
select is((select count(*) from public.profiles), 1::bigint, 'a student still reads only their own profile');

reset role;
set local "request.jwt.claims" = '{"role":"anon"}';
set local role anon;
select throws_ok($$ select * from public.admin_list_users() $$, '42501', null, 'signed-out visitors cannot list users');

reset role;

select * from finish();

rollback;
