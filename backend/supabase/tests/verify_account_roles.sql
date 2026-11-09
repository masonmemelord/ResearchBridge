begin;
select no_plan();

insert into auth.users (id, email, raw_user_meta_data, encrypted_password)
values
 ('9a000000-0000-4000-8000-000000000001', 'owner@auth.test', '{"role":"admin","full_name":"Real Owner"}', 'initial'),
 ('9a000000-0000-4000-8000-000000000002', 'missing-marker@auth.test', '{}', 'initial'),
 ('9a000000-0000-4000-8000-000000000003', 'forged-marker@auth.test', '{"self_signup":false,"role":"professor"}', 'initial'),
 ('9a000000-0000-4000-8000-000000000004', 'team-admin@auth.test', '{}', 'initial'),
 ('9a000000-0000-4000-8000-000000000005', 'legacy-no-profile@auth.test', '{}', 'initial');

select is((select count(*) from public.profiles where id::text like '9a000000-%'), 5::bigint, 'every new account gets exactly one profile');
select is((select count(*) from public.profiles where id::text like '9a000000-%' and role = 'student'), 5::bigint, 'forged roles and omitted markers only produce students');
select is((select full_name from public.profiles where id = '9a000000-0000-4000-8000-000000000001'), 'Real Owner', 'profile retains the display name');

update public.profiles set role = 'professor' where id = '9a000000-0000-4000-8000-000000000001';
update public.profiles set role = 'admin' where id = '9a000000-0000-4000-8000-000000000004';
delete from public.profiles where id = '9a000000-0000-4000-8000-000000000005';
insert into public.opportunities (professor_id, title, description, school, department, keywords, duration_semesters, eligible_class_years, positions_available, status)
values ('9a000000-0000-4000-8000-000000000001', 'Auth test listing', 'A detailed research listing used for authorization checks only.', 'science_and_engineering', 'Biology', array['biology'], 1, array['junior']::public.student_class_year[], 1, 'published');

-- Synthetic pending confirmation: clear only in the transaction proving email.
update auth.users set confirmation_token = 'synthetic-pending-code', confirmation_sent_at = now() where id = '9a000000-0000-4000-8000-000000000002';
update auth.users set email_confirmed_at = now() where id = '9a000000-0000-4000-8000-000000000002';
select is((select encrypted_password from auth.users where id = '9a000000-0000-4000-8000-000000000002'), '', 'first email confirmation discards the unproven password');
update auth.users set encrypted_password = 'verified-owner-password' where id = '9a000000-0000-4000-8000-000000000002';
update auth.users set email_confirmed_at = now() where id = '9a000000-0000-4000-8000-000000000002';
select is((select encrypted_password from auth.users where id = '9a000000-0000-4000-8000-000000000002'), 'verified-owner-password', 'later confirmation updates do not clear the verified password');
update auth.users set email_confirmed_at = now() where id = '9a000000-0000-4000-8000-000000000004';
select is((select encrypted_password from auth.users where id = '9a000000-0000-4000-8000-000000000004'), 'initial', 'team auto-confirm without pending confirmation preserves its password');

set local "request.jwt.claims" = '{"sub":"9a000000-0000-4000-8000-000000000005","role":"authenticated"}';
set local role authenticated;
select is((select count(*) from public.opportunities where title = 'Auth test listing'), 0::bigint, 'legacy account without a profile cannot read listings');
select throws_ok($$insert into public.profiles(id, role) values ('9a000000-0000-4000-8000-000000000005', 'student')$$, '42501', null, 'clients cannot insert their own student profile');
select throws_ok($$select public.admin_set_user_role('9a000000-0000-4000-8000-000000000005', 'professor')$$, '42501', null, 'profileless account cannot promote itself');
select throws_ok($$select * from private.role_changes$$, '42501', null, 'authenticated users cannot inspect the role audit');
select throws_ok($$select public.discard_unverified_signup_password()$$, '42501', null, 'clients cannot call the confirmation trigger');

reset role;
set local "request.jwt.claims" = '{"sub":"9a000000-0000-4000-8000-000000000002","role":"authenticated"}';
set local role authenticated;
select is((select count(*) from public.opportunities where title = 'Auth test listing'), 1::bigint, 'automatically provisioned student can read published listings');
select throws_ok($$update public.profiles set role = 'professor' where id = '9a000000-0000-4000-8000-000000000002'$$, '42501', null, 'student cannot change its own role');

reset role;
set local "request.jwt.claims" = '{"sub":"9a000000-0000-4000-8000-000000000004","role":"authenticated"}';
set local role authenticated;
select throws_ok($$select public.admin_set_user_role('9a000000-0000-4000-8000-000000000003', 'professor')$$, '42501', 'confirm the email or invite the account before making it a professor', 'even an admin must confirm or invite an unconfirmed account before promotion');
select is(public.admin_set_user_role('9a000000-0000-4000-8000-000000000002', 'professor')::text, 'professor', 'admin can promote confirmed account');
select is(public.admin_set_user_role('9a000000-0000-4000-8000-000000000002', 'student')::text, 'student', 'admin can demote a professor');
select throws_ok($$select public.admin_set_user_role('9a000000-0000-4000-8000-000000000002', 'admin')$$, '22023', null, 'admin cannot create another admin');
select throws_ok($$select public.admin_set_user_role('9a000000-0000-4000-8000-000000000004', 'student')$$, '42501', null, 'admin cannot change its own role');
select throws_ok($$select public.admin_set_user_role('9a000000-0000-4000-8000-000000000002', null)$$, '22023', null, 'null role is rejected');
reset role;
select is((select count(*) from private.role_changes where target_user_id = '9a000000-0000-4000-8000-000000000002'), 2::bigint, 'both successful role changes are audited');
select is((select count(*) from private.role_changes where changed_by = '9a000000-0000-4000-8000-000000000004'), 2::bigint, 'audit actor comes from the authenticated admin');
select is((select count(*) from private.role_changes where target_user_id = '9a000000-0000-4000-8000-000000000003'), 0::bigint, 'rejected promotions do not create audit entries');
update auth.users set invited_at = now() where id = '9a000000-0000-4000-8000-000000000003';
set local role authenticated;
select is(public.admin_set_user_role('9a000000-0000-4000-8000-000000000003', 'professor')::text, 'professor', 'team-invited account can be activated before acceptance');
select lives_ok($$select * from public.admin_list_users()$$, 'admin user list remains available');
reset role;
set local "request.jwt.claims" = '{"role":"anon"}';
set local role anon;
select throws_ok($$select * from private.role_changes$$, '42501', null, 'anonymous visitors cannot read audit data');
reset role;
select * from finish();
rollback;
