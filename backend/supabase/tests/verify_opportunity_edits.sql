-- Editing updates a listing in place under the existing RLS policies.
begin;
select plan(12);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
values
  ('f1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'editor-a@edits.test', '', '{}', '{}'),
  ('f2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'editor-b@edits.test', '', '{}', '{}'),
  ('f3333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student@edits.test', '', '{}', '{}');
insert into public.profiles (id, full_name, role) values
  ('f1111111-1111-4111-8111-111111111111', 'Editor A', 'professor'),
  ('f2222222-2222-4222-8222-222222222222', 'Editor B', 'professor'),
  ('f3333333-3333-4333-8333-333333333333', 'Editing Student', 'student');
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
set local "request.jwt.claims" = '{"sub":"f1111111-1111-4111-8111-111111111111","role":"authenticated"}';
set local role authenticated;
select lives_ok($$
  update public.opportunities set title = 'Updated listing',
    learning_outcomes = 'Learn imaging methods and analyze microscopy data.',
    duties_and_skills = 'Prepare samples and maintain a detailed lab notebook.',
    weekly_hours_min = 8, weekly_hours_max = 12, is_paid = true, pay_amount = 18.50, pay_period = 'hour'
  where id = 'f4444444-4444-4444-8444-444444444444'
    and professor_id = auth.uid() and updated_at = '2000-01-01T00:00:00Z'
$$, 'the owner can complete and edit a legacy listing with a matching version');
select is((select title from public.opportunities where id = 'f4444444-4444-4444-8444-444444444444'), 'Updated listing', 'the listing is updated in place');
select is((select status::text from public.opportunities where id = 'f4444444-4444-4444-8444-444444444444'), 'published', 'editing preserves published status');
select is((select count(*) from public.applications where opportunity_id = 'f4444444-4444-4444-8444-444444444444' and message = 'Keep this application.'), 1::bigint, 'editing retains the existing application');

update public.opportunities set title = 'Stale overwrite'
where id = 'f4444444-4444-4444-8444-444444444444' and updated_at = '2000-01-01T00:00:00Z';
select is((select title from public.opportunities where id = 'f4444444-4444-4444-8444-444444444444'), 'Updated listing', 'the old version cannot overwrite newer changes');
select throws_ok($$
  update public.opportunities set professor_id = 'f2222222-2222-4222-8222-222222222222'
  where id = 'f4444444-4444-4444-8444-444444444444'
$$, '42501', null, 'an owner cannot transfer ownership during an edit');

reset role;
set local "request.jwt.claims" = '{"sub":"f2222222-2222-4222-8222-222222222222","role":"authenticated"}';
set local role authenticated;
update public.opportunities set weekly_hours_min = 1 where id = 'f4444444-4444-4444-8444-444444444444';
select is((select weekly_hours_min::integer from public.opportunities where id = 'f4444444-4444-4444-8444-444444444444'), 8, 'another professor cannot edit the details');

reset role;
set local "request.jwt.claims" = '{"sub":"f3333333-3333-4333-8333-333333333333","role":"authenticated"}';
set local role authenticated;
update public.opportunities set pay_amount = 1 where id = 'f4444444-4444-4444-8444-444444444444';
select is((select pay_amount from public.opportunities where id = 'f4444444-4444-4444-8444-444444444444'), 18.50::numeric, 'a student cannot edit compensation');
select is((select title from public.opportunities where id = 'f4444444-4444-4444-8444-444444444444'), 'Updated listing', 'students read the revised published listing');

reset role;
update public.opportunities set status = 'closed' where id = 'f4444444-4444-4444-8444-444444444444';
set local "request.jwt.claims" = '{"sub":"f1111111-1111-4111-8111-111111111111","role":"authenticated"}';
set local role authenticated;
update public.opportunities set title = 'Revised closed listing' where id = 'f4444444-4444-4444-8444-444444444444';
select is((select status::text from public.opportunities where id = 'f4444444-4444-4444-8444-444444444444'), 'closed', 'editing does not reopen a closed listing');

reset role;
update public.opportunities set status = 'draft' where id = 'f4444444-4444-4444-8444-444444444444';
set local role authenticated;
update public.opportunities set title = 'Revised draft listing' where id = 'f4444444-4444-4444-8444-444444444444';
select is((select status::text from public.opportunities where id = 'f4444444-4444-4444-8444-444444444444'), 'draft', 'editing does not publish a draft');
select throws_ok($$
  update public.opportunities set weekly_hours_max = 1 where id = 'f4444444-4444-4444-8444-444444444444'
$$, '23514', null, 'database validation rejects an invalid hours range during editing');

reset role;
select * from finish();
rollback;
