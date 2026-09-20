-- Run against a freshly reset local database (never against production):
--   supabase db reset --local
--   supabase test db
--
-- Supabase CLI installs pgTAP before executing this file. The whole suite runs
-- in one transaction and rolls back, so no fixture data is retained.

begin;

select plan(16);

-- The schema-alignment migration exposes the four fields introduced by the
-- version-2 professor form.
select has_column(
  'public',
  'opportunities',
  'school',
  'opportunities includes the academic school field'
);

select has_column(
  'public',
  'opportunities',
  'department',
  'opportunities includes the free-form department field'
);

select has_column(
  'public',
  'opportunities',
  'preferred_majors',
  'opportunities includes preferred majors'
);

select has_column(
  'public',
  'opportunities',
  'keywords',
  'opportunities includes discovery keywords'
);

-- Fixtures: two professors and one student, wired up the same way Supabase
-- Auth would on signup (auth.users row + matching profiles row).
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  raw_app_meta_data,
  raw_user_meta_data
)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prof-a@test.edu', '', '{}', '{}'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prof-b@test.edu', '', '{}', '{}'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student@test.edu', '', '{}', '{}');

insert into public.profiles (id, full_name, role)
values
  ('11111111-1111-1111-1111-111111111111', 'Professor A', 'professor'),
  ('22222222-2222-2222-2222-222222222222', 'Professor B', 'professor'),
  ('33333333-3333-3333-3333-333333333333', 'Student S', 'student');

-- Constraint checks run as the table owner. This bypasses RLS but not the
-- database constraints under test.
select throws_ok(
  $$
    insert into public.opportunities (
      professor_id,
      school,
      department,
      preferred_majors,
      keywords,
      title,
      description,
      duration_semesters,
      eligible_class_years,
      positions_available
    )
    values (
      '11111111-1111-1111-1111-111111111111',
      'science_and_engineering',
      'Cell and Molecular Biology',
      array['Biology'],
      array['genomics'],
      'Bad duration',
      'Invalid duration must be rejected by the database constraint.',
      5,
      array['freshman']::student_class_year[],
      1
    )
  $$,
  '23514',
  null,
  'duration_semesters outside 1-4 is rejected'
);

select throws_ok(
  $$
    insert into public.opportunities (
      professor_id,
      school,
      department,
      preferred_majors,
      keywords,
      title,
      description,
      duration_semesters,
      eligible_class_years,
      positions_available
    )
    values (
      '11111111-1111-1111-1111-111111111111',
      'science_and_engineering',
      'Cell and Molecular Biology',
      array['Biology'],
      array['genomics'],
      'Bad positions',
      'Invalid positions must be rejected by the database constraint.',
      2,
      array['freshman']::student_class_year[],
      0
    )
  $$,
  '23514',
  null,
  'positions_available less than 1 is rejected'
);

select throws_ok(
  $$
    insert into public.opportunities (
      professor_id,
      school,
      department,
      preferred_majors,
      keywords,
      title,
      description,
      duration_semesters,
      eligible_class_years,
      positions_available
    )
    values (
      '11111111-1111-1111-1111-111111111111',
      'science_and_engineering',
      'Computer Science',
      array['Computer Science'],
      array['machine learning'],
      'Too many positions',
      'This otherwise valid opportunity requests too many student positions.',
      2,
      array['freshman']::student_class_year[],
      21
    )
  $$,
  '23514',
  null,
  'positions_available greater than 20 is rejected'
);

select throws_ok(
  $$
    insert into public.opportunities (
      professor_id,
      school,
      department,
      preferred_majors,
      keywords,
      title,
      description,
      duration_semesters,
      eligible_class_years,
      positions_available
    )
    values (
      '11111111-1111-1111-1111-111111111111',
      'science_and_engineering',
      'Computer Science',
      array['Computer Science'],
      '{}'::text[],
      'Missing keywords',
      'This opportunity intentionally omits its required discovery keywords.',
      2,
      array['freshman']::student_class_year[],
      1
    )
  $$,
  '23514',
  null,
  'at least one keyword is required'
);

select throws_ok(
  $$
    insert into public.opportunities (
      professor_id,
      school,
      department,
      preferred_majors,
      keywords,
      title,
      description,
      duration_semesters,
      eligible_class_years,
      positions_available
    )
    values (
      '11111111-1111-1111-1111-111111111111',
      'liberal_arts',
      'Interdisciplinary Studies',
      array[
        'Anthropology',
        'Economics',
        'English',
        'History',
        'Philosophy',
        'Political Science',
        'Sociology',
        'Spanish',
        'Theatre'
      ],
      array['interdisciplinary'],
      'Too many preferred majors',
      'This opportunity intentionally includes too many preferred majors.',
      2,
      array['sophomore']::student_class_year[],
      1
    )
  $$,
  '23514',
  null,
  'no more than eight preferred majors are accepted'
);

-- A student cannot claim ownership of an opportunity through the browser API.
set local "request.jwt.claims" =
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$
    insert into public.opportunities (
      professor_id,
      school,
      department,
      preferred_majors,
      keywords,
      title,
      description,
      duration_semesters,
      eligible_class_years,
      positions_available
    )
    values (
      '33333333-3333-3333-3333-333333333333',
      'science_and_engineering',
      'Computer Science',
      array['Computer Science'],
      array['security'],
      'Student-owned opportunity',
      'A student must not be able to create a professor opportunity.',
      1,
      array['freshman']::student_class_year[],
      1
    )
  $$,
  '42501',
  null,
  'a student cannot create an opportunity'
);

select throws_ok(
  $$
    update public.profiles
    set role = 'professor'
    where id = '33333333-3333-3333-3333-333333333333'
  $$,
  '42501',
  null,
  'a student cannot promote their own profile to professor'
);

-- Professor A: authenticated requests carry the user ID in the JWT claims.
reset role;
set local "request.jwt.claims" =
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$
    insert into public.opportunities (
      professor_id,
      school,
      department,
      preferred_majors,
      keywords,
      title,
      description,
      duration_semesters,
      eligible_class_years,
      positions_available
    )
    values (
      '22222222-2222-2222-2222-222222222222',
      'science_and_engineering',
      'Computer Science',
      array['Computer Science'],
      array['security'],
      'Spoofed professor ownership',
      'A professor must not create an opportunity for another professor.',
      1,
      array['freshman']::student_class_year[],
      1
    )
  $$,
  '42501',
  null,
  'a professor cannot create an opportunity owned by someone else'
);

insert into public.opportunities (
  professor_id,
  school,
  department,
  preferred_majors,
  keywords,
  title,
  description,
  duration_semesters,
  eligible_class_years,
  positions_available,
  status
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'science_and_engineering',
    'Cell and Molecular Biology',
    array['Biology', 'Biomedical Engineering'],
    array['genomics', 'sequencing', 'wet lab'],
    'Genomics RA',
    'Assist with sequencing pipeline and laboratory data analysis.',
    2,
    array['junior', 'senior']::student_class_year[],
    2,
    'published'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'science_and_engineering',
    'Computer Science',
    '{}'::text[],
    array['data science'],
    'Unfinished Draft',
    'This draft opportunity is still being prepared by the professor.',
    1,
    array['senior']::student_class_year[],
    1,
    'draft'
  );

select is(
  (select count(*) from public.opportunities where professor_id = auth.uid()),
  2::bigint,
  'a professor can create and view their own opportunities'
);

-- Professor B cannot update Professor A's published opportunity.
reset role;
set local "request.jwt.claims" =
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

update public.opportunities
set title = 'Hijacked'
where title = 'Genomics RA';

select is(
  (select count(*) from public.opportunities where title = 'Hijacked'),
  0::bigint,
  'another professor cannot modify an opportunity they do not own'
);

-- A student can browse the published opportunity but cannot see the draft.
reset role;
set local "request.jwt.claims" =
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*) from public.opportunities where title = 'Genomics RA'),
  1::bigint,
  'a student can browse a published opportunity'
);

select is(
  (select count(*) from public.opportunities where title = 'Unfinished Draft'),
  0::bigint,
  'a student cannot see a draft opportunity'
);

reset role;

select * from finish();

rollback;
