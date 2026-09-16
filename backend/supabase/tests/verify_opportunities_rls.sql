-- Run against a freshly reset local database (never against production):
--   supabase db reset
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -f backend/supabase/tests/verify_opportunities_rls.sql
--
-- The whole script runs in one transaction that is rolled back at the end,
-- so it never leaves test data behind. Each check RAISEs an EXCEPTION and
-- aborts the script if a requirement is violated; a clean run prints one
-- NOTICE per proof below and ends with "ROLLBACK".

begin;

-- Fixtures: two professors and one student, wired up the same way Supabase
-- Auth would on signup (auth.users row + matching profiles row).
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prof-a@test.edu', '', '{}', '{}'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prof-b@test.edu', '', '{}', '{}'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student@test.edu', '', '{}', '{}');

insert into profiles (id, full_name, role) values
  ('11111111-1111-1111-1111-111111111111', 'Professor A', 'professor'),
  ('22222222-2222-2222-2222-222222222222', 'Professor B', 'professor'),
  ('33333333-3333-3333-3333-333333333333', 'Student S', 'student');

-- Proof 5: invalid duration/position values are rejected by the database.
-- Runs as the table owner (bypasses RLS, not the constraints being tested).
do $$
begin
  begin
    insert into opportunities
      (professor_id, department_id, title, description, duration_semesters, eligible_class_years, positions_available)
    values
      ('11111111-1111-1111-1111-111111111111', (select id from departments where name = 'Computer Science'),
       'Bad duration', 'x', 5, array['freshman']::student_class_year[], 1);
    raise exception 'FAIL: duration_semesters = 5 should have been rejected';
  exception when check_violation then
    raise notice 'PASS (5a): duration_semesters outside 1-4 is rejected';
  end;

  begin
    insert into opportunities
      (professor_id, department_id, title, description, duration_semesters, eligible_class_years, positions_available)
    values
      ('11111111-1111-1111-1111-111111111111', (select id from departments where name = 'Computer Science'),
       'Bad positions', 'x', 2, array['freshman']::student_class_year[], 0);
    raise exception 'FAIL: positions_available = 0 should have been rejected';
  exception when check_violation then
    raise notice 'PASS (5b): positions_available <= 0 is rejected';
  end;
end $$;

-- From here on, act as the `authenticated` role so RLS is actually enforced
-- (the table owner used above bypasses RLS entirely).

-- Proof 1: a professor can create their own opportunity.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);

insert into opportunities
  (professor_id, department_id, title, description, duration_semesters, eligible_class_years, positions_available, status)
values
  ('11111111-1111-1111-1111-111111111111', (select id from departments where name = 'Computer Science'),
   'Genomics RA', 'Assist with sequencing pipeline', 2, array['junior','senior']::student_class_year[], 2, 'published');

insert into opportunities
  (professor_id, department_id, title, description, duration_semesters, eligible_class_years, positions_available, status)
values
  ('11111111-1111-1111-1111-111111111111', (select id from departments where name = 'Computer Science'),
   'Unfinished Draft', 'Still being written', 1, array['senior']::student_class_year[], 1, 'draft');

do $$
begin
  if (select count(*) from opportunities where professor_id = '11111111-1111-1111-1111-111111111111') <> 2 then
    raise exception 'FAIL: professor A could not create their own opportunities';
  end if;
  raise notice 'PASS (1): professor A created their own opportunities';
end $$;

-- Proof 2: another professor cannot modify it.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated')::text, true);

update opportunities set title = 'Hijacked' where title = 'Genomics RA';

do $$
declare
  affected int;
begin
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'FAIL: professor B was able to modify professor A''s opportunity';
  end if;
  raise notice 'PASS (2): professor B cannot modify professor A''s opportunity (0 rows affected)';
end $$;

-- Proof 3 & 4: a student can browse a published opportunity, but not a draft.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);

do $$
begin
  if (select count(*) from opportunities where title = 'Genomics RA') <> 1 then
    raise exception 'FAIL: student could not see the published opportunity';
  end if;
  raise notice 'PASS (3): student can browse the published opportunity';

  if (select count(*) from opportunities where title = 'Unfinished Draft') <> 0 then
    raise exception 'FAIL: student could see a draft opportunity';
  end if;
  raise notice 'PASS (4): student cannot see the draft opportunity';
end $$;

reset role;
rollback;
