-- All authenticated edits go through the versioned database function.
begin;
select plan(15);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
values
  ('f1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'editor-a@edits.test', '', '{}', '{}'),
  ('f2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'editor-b@edits.test', '', '{}', '{}'),
  ('f3333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student@edits.test', '', '{}', '{}');
insert into public.profiles (id, full_name, role) values
  ('f1111111-1111-4111-8111-111111111111', 'Editor A', 'professor'),
  ('f2222222-2222-4222-8222-222222222222', 'Editor B', 'professor'),
  ('f3333333-3333-4333-8333-333333333333', 'Editing Student', 'student')
on conflict (id) do update set full_name = excluded.full_name, role = excluded.role;
insert into public.opportunities (
  id, professor_id, title, description, school, department, keywords,
  duration_semesters, eligible_class_years, positions_available, status, updated_at
) values (
  'f4444444-4444-4444-8444-444444444444', 'f1111111-1111-4111-8111-111111111111',
  'Original listing', 'An older research listing with a sufficiently detailed description.',
  'science_and_engineering', 'Biology', array['microscopy'], 2,
  array['junior']::public.student_class_year[], 2, 'published', '2000-01-01T00:00:00Z'
);

set local "request.jwt.claims" = '{"sub":"f3333333-3333-4333-8333-333333333333","role":"authenticated"}';
set local role authenticated;
insert into public.applications (opportunity_id, student_id, message)
values ('f4444444-4444-4444-8444-444444444444', 'f3333333-3333-4333-8333-333333333333', 'Keep this application.');

reset role;

create function pg_temp.edit_fields()
returns jsonb
language sql
as $$
  select '{
    "title":"Updated listing",
    "description":"An older research listing with a sufficiently detailed description.",
    "school":"science_and_engineering",
    "department":"Biology",
    "preferred_majors":[],
    "keywords":["microscopy"],
    "duration_semesters":2,
    "eligible_class_years":["junior"],
    "positions_available":2,
    "learning_outcomes":"Learn imaging methods and analyze microscopy data.",
    "duties_and_skills":"Prepare samples and maintain a detailed lab notebook.",
    "weekly_hours_min":8,
    "weekly_hours_max":12,
    "is_paid":true,
    "pay_amount":18.50,
    "pay_period":"hour"
  }'::jsonb;
$$;

set local "request.jwt.claims" = '{"sub":"f1111111-1111-4111-8111-111111111111","role":"authenticated"}';
set local role authenticated;

select throws_ok($$
  update public.opportunities set title = 'Direct edit'
  where id = 'f4444444-4444-4444-8444-444444444444'
$$, '42501', null, 'owners cannot directly update the listing');
select throws_ok($$
  select * from public.professor_edit_opportunity(
    'f4444444-4444-4444-8444-444444444444', null, pg_temp.edit_fields())
$$, '22023', null, 'an edit must include a version');
select throws_ok($$
  select * from public.professor_edit_opportunity(
    'f4444444-4444-4444-8444-444444444444', '2000-01-01T00:00:00Z',
    pg_temp.edit_fields() || '{"status":"closed"}')
$$, '22023', null, 'protected fields are rejected');
select throws_ok($$
  select * from public.professor_edit_opportunity(
    'f4444444-4444-4444-8444-444444444444', '2000-01-01T00:00:00Z',
    pg_temp.edit_fields() - 'learning_outcomes')
$$, '22023', null, 'older listings still need required details');
select throws_ok($$
  select * from public.professor_edit_opportunity(
    'f4444444-4444-4444-8444-444444444444', '2000-01-01T00:00:00Z',
    pg_temp.edit_fields() || '{"weekly_hours_max":1}')
$$, '23514', null, 'the database rejects invalid hours');
select is((
  select id from public.professor_edit_opportunity(
    'f4444444-4444-4444-8444-444444444444', '2000-01-01T00:00:00Z', pg_temp.edit_fields())
), 'f4444444-4444-4444-8444-444444444444'::uuid, 'the owner updates the original listing');
select is((select title from public.opportunities where id = 'f4444444-4444-4444-8444-444444444444'),
  'Updated listing', 'the new title was stored');
select is((select status::text from public.opportunities where id = 'f4444444-4444-4444-8444-444444444444'),
  'published', 'editing preserves status');
select is((select count(*) from public.applications where opportunity_id = 'f4444444-4444-4444-8444-444444444444'),
  1::bigint, 'editing preserves existing applications');
select is((
  select count(*) from public.professor_edit_opportunity(
    'f4444444-4444-4444-8444-444444444444', '2000-01-01T00:00:00Z', pg_temp.edit_fields())
), 0::bigint, 'an obsolete version cannot save');

reset role;
update public.opportunities set status = 'closed' where id = 'f4444444-4444-4444-8444-444444444444';
set local role authenticated;
select is((
  select id from public.professor_edit_opportunity(
    'f4444444-4444-4444-8444-444444444444',
    (select updated_at from public.opportunities where id = 'f4444444-4444-4444-8444-444444444444'),
    pg_temp.edit_fields())
), 'f4444444-4444-4444-8444-444444444444'::uuid, 'owners can edit their closed listings');
select is((select status::text from public.opportunities where id = 'f4444444-4444-4444-8444-444444444444'),
  'closed', 'editing does not reopen a closed listing');

reset role;
update public.opportunities set status = 'published' where id = 'f4444444-4444-4444-8444-444444444444';
set local "request.jwt.claims" = '{"sub":"f2222222-2222-4222-8222-222222222222","role":"authenticated"}';
set local role authenticated;
select is((
  select count(*) from public.professor_edit_opportunity(
    'f4444444-4444-4444-8444-444444444444',
    (select updated_at from public.opportunities where id = 'f4444444-4444-4444-8444-444444444444'),
    pg_temp.edit_fields())
), 0::bigint, 'another professor cannot edit the listing even with its current version');

reset role;
set local "request.jwt.claims" = '{"sub":"f3333333-3333-4333-8333-333333333333","role":"authenticated"}';
set local role authenticated;
select throws_ok($$
  select * from public.professor_edit_opportunity(
    'f4444444-4444-4444-8444-444444444444', '2000-01-01T00:00:00Z', pg_temp.edit_fields())
$$, '42501', null, 'students cannot edit a listing');

reset role;
set local "request.jwt.claims" = '{"role":"anon"}';
set local role anon;
select throws_ok($$
  select * from public.professor_edit_opportunity(
    'f4444444-4444-4444-8444-444444444444', '2000-01-01T00:00:00Z', '{}'::jsonb)
$$, '42501', null, 'anonymous clients cannot execute the edit function');

reset role;
select * from finish();
rollback;
