begin;

select plan(25);

select has_table('public', 'applications', 'applications table exists');

-- Fixtures: two professors, two students, and three opportunities.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
values
  ('a1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prof-a@apps.test', '', '{}', '{}'),
  ('a2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prof-b@apps.test', '', '{}', '{}'),
  ('a3333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-s@apps.test', '', '{}', '{}'),
  ('a4444444-4444-4444-8444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-t@apps.test', '', '{}', '{}');

insert into public.profiles (id, full_name, role)
values
  ('a1111111-1111-4111-8111-111111111111', 'Professor A', 'professor'),
  ('a2222222-2222-4222-8222-222222222222', 'Professor B', 'professor'),
  ('a3333333-3333-4333-8333-333333333333', 'Student S', 'student'),
  ('a4444444-4444-4444-8444-444444444444', 'Student T', 'student');

insert into public.opportunities (
  id, professor_id, school, department, keywords, title, description,
  duration_semesters, eligible_class_years, positions_available, status
)
values
  ('b1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'public_health', 'Epidemiology', array['survey'], 'Published A', 'A published opportunity with a long enough description.', 1, array['junior']::public.student_class_year[], 2, 'published'),
  ('b2222222-2222-4222-8222-222222222222', 'a1111111-1111-4111-8111-111111111111', 'public_health', 'Epidemiology', array['survey'], 'Draft A', 'A draft opportunity with a long enough description here.', 1, array['junior']::public.student_class_year[], 2, 'draft'),
  ('b3333333-3333-4333-8333-333333333333', 'a2222222-2222-4222-8222-222222222222', 'liberal_arts', 'History', array['archives'], 'Published B', 'Another published opportunity with a long description.', 2, array['senior']::public.student_class_year[], 1, 'published');

-- Student S applies.
set local "request.jwt.claims" = '{"sub":"a3333333-3333-4333-8333-333333333333","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$ insert into public.applications (opportunity_id, student_id, message)
     values ('b1111111-1111-4111-8111-111111111111', 'a3333333-3333-4333-8333-333333333333', '  I have survey experience.  ') $$,
  'a student can apply to a published opportunity'
);

select is(
  (select student_email from public.applications where opportunity_id = 'b1111111-1111-4111-8111-111111111111'),
  'student-s@apps.test',
  'the applicant email is copied from the account'
);

select is(
  (select student_name from public.applications where opportunity_id = 'b1111111-1111-4111-8111-111111111111'),
  'Student S',
  'the applicant name is copied from the profile'
);

select is(
  (select message from public.applications where opportunity_id = 'b1111111-1111-4111-8111-111111111111'),
  'I have survey experience.',
  'the message is trimmed'
);

select throws_ok(
  $$ insert into public.applications (opportunity_id, student_id, student_email)
     values ('b3333333-3333-4333-8333-333333333333', 'a3333333-3333-4333-8333-333333333333', 'fake@apps.test') $$,
  '42501',
  null,
  'a student cannot supply the applicant email'
);

select throws_ok(
  $$ insert into public.applications (opportunity_id, student_id)
     values ('b1111111-1111-4111-8111-111111111111', 'a3333333-3333-4333-8333-333333333333') $$,
  '23505',
  null,
  'a student cannot apply twice to the same opportunity'
);

select throws_ok(
  $$ insert into public.applications (opportunity_id, student_id)
     values ('b2222222-2222-4222-8222-222222222222', 'a3333333-3333-4333-8333-333333333333') $$,
  '42501',
  null,
  'a student cannot apply to a draft'
);

select throws_ok(
  $$ insert into public.applications (opportunity_id, student_id)
     values ('b3333333-3333-4333-8333-333333333333', 'a4444444-4444-4444-8444-444444444444') $$,
  '42501',
  null,
  'a student cannot apply as another student'
);

select throws_ok(
  format(
    $$ insert into public.applications (opportunity_id, student_id, message)
       values ('b3333333-3333-4333-8333-333333333333', 'a3333333-3333-4333-8333-333333333333', %L) $$,
    repeat('x', 1001)
  ),
  '23514',
  null,
  'a message longer than 1000 characters is rejected'
);

select lives_ok(
  $$ insert into public.applications (opportunity_id, student_id, message)
     values ('b3333333-3333-4333-8333-333333333333', 'a3333333-3333-4333-8333-333333333333', '   ') $$,
  'a student can apply with a blank message'
);

select is(
  (select message from public.applications where opportunity_id = 'b3333333-3333-4333-8333-333333333333'),
  null,
  'a blank message is stored as null'
);

select is(
  (select count(*) from public.applications),
  2::bigint,
  'a student sees their own applications'
);

select throws_ok(
  $$ update public.applications set message = 'Edited' $$,
  '42501',
  null,
  'a student cannot edit an application'
);

select is(
  (select count(*) from public.profiles),
  1::bigint,
  'a student can read only their own profile'
);

-- Student T cannot see or withdraw Student S's applications.
reset role;
set local "request.jwt.claims" = '{"sub":"a4444444-4444-4444-8444-444444444444","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*) from public.applications),
  0::bigint,
  'a student cannot see another student''s applications'
);

delete from public.applications;

reset role;
select is(
  (select count(*) from public.applications),
  2::bigint,
  'a student cannot withdraw another student''s application'
);

-- Professor A sees applications to their own opportunity only.
set local "request.jwt.claims" = '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}';
set local role authenticated;

select results_eq(
  $$ select opportunity_id, student_name, student_email from public.applications $$,
  $$ values ('b1111111-1111-4111-8111-111111111111'::uuid, 'Student S'::text, 'student-s@apps.test'::text) $$,
  'a professor sees applicants to their own opportunity only'
);

select throws_ok(
  $$ insert into public.applications (opportunity_id, student_id)
     values ('b3333333-3333-4333-8333-333333333333', 'a1111111-1111-4111-8111-111111111111') $$,
  '42501',
  null,
  'a professor cannot apply'
);

delete from public.applications;

select is(
  (select count(*) from public.applications),
  1::bigint,
  'a professor cannot delete applications'
);

select is(
  (select count(*) from public.profiles),
  1::bigint,
  'a professor can read only their own profile'
);

-- Professor B sees only the application to their opportunity.
reset role;
set local "request.jwt.claims" = '{"sub":"a2222222-2222-4222-8222-222222222222","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*) from public.applications),
  1::bigint,
  'another professor sees only applications to their own opportunities'
);

-- Signed-out visitors see nothing.
reset role;
set local "request.jwt.claims" = '{"role":"anon"}';
set local role anon;

select throws_ok(
  $$ select count(*) from public.applications $$,
  '42501',
  null,
  'signed-out visitors cannot read applications'
);

-- Student S withdraws an application.
reset role;
set local "request.jwt.claims" = '{"sub":"a3333333-3333-4333-8333-333333333333","role":"authenticated"}';
set local role authenticated;

delete from public.applications where opportunity_id = 'b3333333-3333-4333-8333-333333333333';

select is(
  (select count(*) from public.applications),
  1::bigint,
  'a student can withdraw their own application'
);

-- Deleting an opportunity removes its applications.
reset role;
delete from public.opportunities where id = 'b1111111-1111-4111-8111-111111111111';

select is(
  (select count(*) from public.applications),
  0::bigint,
  'deleting an opportunity removes its applications'
);

select * from finish();

rollback;
