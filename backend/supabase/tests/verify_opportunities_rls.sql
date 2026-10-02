

begin;

select plan(35);

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
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student@test.edu', '', '{}', '{}'),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'new-user@test.edu', '', '{}', '{}');

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
      array['security'],
      '   ',
      'This opportunity intentionally has a title made only of whitespace.',
      2,
      array['freshman']::student_class_year[],
      1
    )
  $$,
  '23514',
  null,
  'an empty title is rejected'
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
      array['security'],
      'Short description',
      'Too short to be useful.',
      2,
      array['freshman']::student_class_year[],
      1
    )
  $$,
  '23514',
  null,
  'a description shorter than 30 characters is rejected'
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
      array['security'],
      'No eligible class years',
      'This opportunity intentionally lists no eligible class years at all.',
      2,
      '{}'::student_class_year[],
      1
    )
  $$,
  '23514',
  null,
  'an empty eligible class year list is rejected'
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
      array[
        'algorithms',
        'compilers',
        'databases',
        'graphics',
        'networking',
        'robotics',
        'security',
        'systems',
        'theory'
      ],
      'Too many keywords',
      'This opportunity intentionally includes more than eight keywords.',
      2,
      array['freshman']::student_class_year[],
      1
    )
  $$,
  '23514',
  null,
  'no more than eight keywords are accepted'
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
      'engineering',
      'Computer Science',
      array['Computer Science'],
      array['security'],
      'Invalid school',
      'This opportunity intentionally uses a school that does not exist.',
      2,
      array['freshman']::student_class_year[],
      1
    )
  $$,
  '22P02',
  null,
  'an invalid academic school value is rejected'
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

select throws_ok(
  $$
    update public.profiles
    set role = 'admin'
    where id = '33333333-3333-3333-3333-333333333333'
  $$,
  '42501',
  null,
  'a student cannot promote their own profile to admin'
);

reset role;
set local "request.jwt.claims" =
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$
    insert into public.profiles (id, full_name, role)
    values ('44444444-4444-4444-4444-444444444444', 'New User', 'professor')
  $$,
  '42501',
  null,
  'a new user cannot create their own professor profile'
);

select throws_ok(
  $$
    insert into public.profiles (id, full_name, role)
    values ('44444444-4444-4444-4444-444444444444', 'New User', 'admin')
  $$,
  '42501',
  null,
  'a new user cannot create their own admin profile'
);

select lives_ok(
  $$
    insert into public.profiles (id, full_name, role)
    values ('44444444-4444-4444-4444-444444444444', 'New User', 'student')
  $$,
  'a new user can create their own student profile'
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
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'science_and_engineering',
    'Neuroscience',
    '{}'::text[],
    array['neuroscience'],
    'Closed Study',
    'This study has finished recruiting and is no longer accepting students.',
    1,
    array['junior']::student_class_year[],
    1,
    'closed'
  );

select is(
  (select count(*) from public.opportunities where professor_id = auth.uid()),
  3::bigint,
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

select is(
  (select count(*) from public.opportunities where title = 'Genomics RA'),
  1::bigint,
  'another professor can see a published opportunity'
);

select is(
  (select count(*) from public.opportunities where title = 'Unfinished Draft'),
  0::bigint,
  'another professor cannot see a draft opportunity'
);

select is(
  (select count(*) from public.opportunities where title = 'Closed Study'),
  0::bigint,
  'another professor cannot see a closed opportunity'
);

delete from public.opportunities
where title = 'Genomics RA';

select is(
  (select count(*) from public.opportunities where title = 'Genomics RA'),
  1::bigint,
  'another professor cannot delete an opportunity they do not own'
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

select is(
  (select count(*) from public.opportunities where title = 'Closed Study'),
  0::bigint,
  'a student cannot see a closed opportunity'
);

update public.opportunities
set title = 'Student Edit'
where title = 'Genomics RA';

select is(
  (select count(*) from public.opportunities where title = 'Student Edit'),
  0::bigint,
  'a student cannot update an opportunity'
);

delete from public.opportunities
where title = 'Genomics RA';

select is(
  (select count(*) from public.opportunities where title = 'Genomics RA'),
  1::bigint,
  'a student cannot delete an opportunity'
);

reset role;
set local "request.jwt.claims" = '{"role":"anon"}';
set local role anon;

select is(
  (select count(*) from public.opportunities),
  0::bigint,
  'an anonymous user cannot see any opportunity'
);

reset role;
set local "request.jwt.claims" =
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

update public.opportunities
set title = 'Revised Draft'
where title = 'Unfinished Draft';

select is(
  (select count(*) from public.opportunities where title = 'Revised Draft'),
  1::bigint,
  'a professor can update their own opportunity'
);

delete from public.opportunities
where title = 'Closed Study';

select is(
  (select count(*) from public.opportunities where title = 'Closed Study'),
  0::bigint,
  'a professor can delete their own opportunity'
);

reset role;

select * from finish();

rollback;
