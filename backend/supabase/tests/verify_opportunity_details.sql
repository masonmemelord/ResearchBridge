-- Opportunity details: learning outcomes, weekly hours, compensation, and
-- duties/skills. Runs in a transaction that is rolled back at the end.

begin;

select plan(21);

select has_column('public', 'opportunities', 'learning_outcomes', 'opportunities has learning outcomes');
select has_column('public', 'opportunities', 'weekly_hours_min', 'opportunities has minimum weekly hours');
select has_column('public', 'opportunities', 'weekly_hours_max', 'opportunities has maximum weekly hours');
select has_column('public', 'opportunities', 'is_paid', 'opportunities has a paid flag');
select has_column('public', 'opportunities', 'pay_amount', 'opportunities has a pay amount');
select has_column('public', 'opportunities', 'pay_period', 'opportunities has a pay period');
select has_column('public', 'opportunities', 'duties_and_skills', 'opportunities has duties and skills');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
values ('d1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'details-prof@test.edu', '', '{}', '{}');

insert into public.profiles (id, full_name, role)
values ('d1111111-1111-1111-1111-111111111111', 'Details Professor', 'professor');

-- Base row with every pre-existing required column; each test adds details.
create temporary table base_listing as
select
  'd1111111-1111-1111-1111-111111111111'::uuid as professor_id,
  'Imaging assistant'::text as title,
  'A research description that is comfortably longer than thirty characters.'::text as description,
  'science_and_engineering'::public.academic_school as school,
  'Cell and Molecular Biology'::text as department,
  array['microscopy']::text[] as keywords,
  2::smallint as duration_semesters,
  array['junior']::public.student_class_year[] as eligible_class_years,
  1::smallint as positions_available,
  'published'::public.opportunity_status as status;

-- Listings created before this migration (no details) stay valid.
select lives_ok(
  $$ insert into public.opportunities (professor_id, title, description, school, department, keywords, duration_semesters, eligible_class_years, positions_available, status)
     select * from base_listing $$,
  'a listing without the new details is still accepted'
);

select lives_ok(
  $$ insert into public.opportunities (professor_id, title, description, school, department, keywords, duration_semesters, eligible_class_years, positions_available, status,
       learning_outcomes, duties_and_skills, weekly_hours_min, weekly_hours_max, is_paid, pay_amount, pay_period)
     select *, 'Learn confocal microscopy and image analysis.', 'Prepare samples and keep a lab notebook.', 8, 10, true, 15.50, 'hour'
     from base_listing $$,
  'a complete paid listing with an hours range is accepted'
);

select lives_ok(
  $$ insert into public.opportunities (professor_id, title, description, school, department, keywords, duration_semesters, eligible_class_years, positions_available, status,
       learning_outcomes, duties_and_skills, weekly_hours_min, is_paid)
     select *, 'Learn confocal microscopy and image analysis.', 'Prepare samples and keep a lab notebook.', 6, false
     from base_listing $$,
  'an unpaid listing with a single weekly hours value is accepted'
);

-- Closing an older listing (as admins do) must not trip the new constraints.
select lives_ok(
  $$ update public.opportunities set status = 'closed'
     where professor_id = 'd1111111-1111-1111-1111-111111111111' and is_paid is null $$,
  'an older listing without details can still be updated'
);

-- Text bounds.
select throws_ok(
  $$ insert into public.opportunities (professor_id, title, description, school, department, keywords, duration_semesters, eligible_class_years, positions_available, status, learning_outcomes)
     select *, '   too short   ' from base_listing $$,
  '23514', null, 'learning outcomes shorter than 20 characters are rejected'
);

select throws_ok(
  $$ insert into public.opportunities (professor_id, title, description, school, department, keywords, duration_semesters, eligible_class_years, positions_available, status, duties_and_skills)
     select *, repeat('x', 1501) from base_listing $$,
  '23514', null, 'duties and skills longer than 1500 characters are rejected'
);

-- Weekly hours.
select throws_ok(
  $$ insert into public.opportunities (professor_id, title, description, school, department, keywords, duration_semesters, eligible_class_years, positions_available, status, weekly_hours_min)
     select *, 41 from base_listing $$,
  '23514', null, 'more than 40 weekly hours is rejected'
);

select throws_ok(
  $$ insert into public.opportunities (professor_id, title, description, school, department, keywords, duration_semesters, eligible_class_years, positions_available, status, weekly_hours_min, weekly_hours_max)
     select *, 10, 8 from base_listing $$,
  '23514', null, 'a maximum below the minimum is rejected'
);

select throws_ok(
  $$ insert into public.opportunities (professor_id, title, description, school, department, keywords, duration_semesters, eligible_class_years, positions_available, status, weekly_hours_max)
     select *, 10 from base_listing $$,
  '23514', null, 'a maximum without a minimum is rejected'
);

-- Compensation consistency.
select throws_ok(
  $$ insert into public.opportunities (professor_id, title, description, school, department, keywords, duration_semesters, eligible_class_years, positions_available, status, is_paid, pay_period)
     select *, true, 'hour' from base_listing $$,
  '23514', null, 'a paid listing without an amount is rejected'
);

select throws_ok(
  $$ insert into public.opportunities (professor_id, title, description, school, department, keywords, duration_semesters, eligible_class_years, positions_available, status, is_paid, pay_amount)
     select *, true, 15 from base_listing $$,
  '23514', null, 'a paid listing without a pay period is rejected'
);

select throws_ok(
  $$ insert into public.opportunities (professor_id, title, description, school, department, keywords, duration_semesters, eligible_class_years, positions_available, status, is_paid, pay_amount, pay_period)
     select *, true, 0, 'hour' from base_listing $$,
  '23514', null, 'a zero pay amount is rejected'
);

select throws_ok(
  $$ insert into public.opportunities (professor_id, title, description, school, department, keywords, duration_semesters, eligible_class_years, positions_available, status, is_paid, pay_amount, pay_period)
     select *, false, 15, 'hour' from base_listing $$,
  '23514', null, 'an unpaid listing cannot carry an amount'
);

select throws_ok(
  $$ insert into public.opportunities (professor_id, title, description, school, department, keywords, duration_semesters, eligible_class_years, positions_available, status, pay_amount, pay_period)
     select *, 15, 'hour' from base_listing $$,
  '23514', null, 'an amount without answering the paid question is rejected'
);

select * from finish();

rollback;
