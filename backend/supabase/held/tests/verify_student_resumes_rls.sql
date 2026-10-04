begin;
select plan(19);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data)
values
('aaaaaaaa-1111-4444-8888-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','resume-a@example.com','','{}','{}'),
('aaaaaaaa-2222-4444-8888-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','resume-b@example.com','','{}','{}'),
('aaaaaaaa-3333-4444-8888-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','resume-prof@example.com','','{}','{}');
insert into public.profiles (id, full_name, role) values
('aaaaaaaa-1111-4444-8888-111111111111','Synthetic Student A','student'),
('aaaaaaaa-2222-4444-8888-222222222222','Synthetic Student B','student'),
('aaaaaaaa-3333-4444-8888-333333333333','Synthetic Professor','professor');

select is((select public from storage.buckets where id = 'student-resumes'), false, 'resume bucket is private');
select is((select file_size_limit from storage.buckets where id = 'student-resumes'), 3145728::bigint, 'bucket limits uploads to 3 MB');

set local "request.jwt.claims" = '{"sub":"aaaaaaaa-1111-4444-8888-111111111111","role":"authenticated"}';
set local role authenticated;
select lives_ok($$
 insert into public.student_resumes(id,student_id,storage_path,original_name,byte_size,page_count,extracted_text,scan_result,model)
 values('bbbbbbbb-1111-4444-8888-111111111111','aaaaaaaa-1111-4444-8888-111111111111',
 'aaaaaaaa-1111-4444-8888-111111111111/bbbbbbbb-1111-4444-8888-111111111111.pdf',
 'synthetic.pdf',1000,1,'Synthetic resume containing Python and research experience.','{}','qwen3:4b');
$$, 'student can insert their own resume');
select is((select count(*)::integer from public.student_resumes), 1, 'student can read their own resume');
select throws_ok($$
 insert into public.student_resumes(id,student_id,storage_path,original_name,byte_size,page_count,extracted_text,scan_result,model)
 values('bbbbbbbb-2222-4444-8888-222222222222','aaaaaaaa-1111-4444-8888-111111111111',
 'aaaaaaaa-1111-4444-8888-111111111111/bbbbbbbb-2222-4444-8888-222222222222.pdf',
 'second.pdf',1000,1,'Synthetic resume containing Python and research experience.','{}','qwen3:4b');
$$, '23505', null, 'student cannot create a second resume');
select throws_ok($$
 insert into public.student_resumes(student_id,storage_path,original_name,byte_size,page_count,extracted_text,scan_result,model)
 values('aaaaaaaa-1111-4444-8888-111111111111','someone-else/resume.pdf','synthetic.pdf',1000,1,
 'Synthetic resume containing Python and research experience.','{}','qwen3:4b');
$$, '23514', null, 'storage paths must match the record owner and id');
select lives_ok($$
 insert into storage.objects(bucket_id,name) values('student-resumes','aaaaaaaa-1111-4444-8888-111111111111/bbbbbbbb-1111-4444-8888-111111111111.pdf');
$$, 'student can upload the file for their own metadata');
with deleted as (delete from public.student_resumes returning id)
select is((select count(*)::integer from deleted), 0, 'metadata cannot be removed while its file exists');

reset role;
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-2222-4444-8888-222222222222","role":"authenticated"}';
set local role authenticated;
select is((select count(*)::integer from public.student_resumes), 0, 'other student cannot read the resume');
select is((select count(*)::integer from storage.objects where bucket_id = 'student-resumes'), 0, 'other student cannot read the file');
select throws_ok($$
 insert into public.student_resumes(student_id,storage_path,original_name,byte_size,page_count,extracted_text,scan_result,model)
 values('aaaaaaaa-1111-4444-8888-111111111111','anything.pdf','synthetic.pdf',1000,1,
 'Synthetic resume containing Python and research experience.','{}','qwen3:4b');
$$, '42501', null, 'other student cannot impersonate the owner');
select throws_ok($$update public.student_resumes set student_id = 'aaaaaaaa-2222-4444-8888-222222222222'$$,
 '42501', null, 'students cannot update ownership or overwrite scan rows');
with deleted as (delete from public.student_resumes returning id)
select is((select count(*)::integer from deleted), 0, 'other student cannot delete the resume');
select throws_ok($$insert into storage.objects(bucket_id,name) values('student-resumes','aaaaaaaa-2222-4444-8888-222222222222/no-record.pdf')$$,
 '42501', null, 'uploads require matching owned metadata');

reset role;
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-3333-4444-8888-333333333333","role":"authenticated"}';
set local role authenticated;
select is((select count(*)::integer from public.student_resumes), 0, 'professors cannot read student resumes');
select throws_ok($$
 insert into public.student_resumes(id,student_id,storage_path,original_name,byte_size,page_count,extracted_text,scan_result,model)
 values('bbbbbbbb-3333-4444-8888-333333333333','aaaaaaaa-3333-4444-8888-333333333333',
 'aaaaaaaa-3333-4444-8888-333333333333/bbbbbbbb-3333-4444-8888-333333333333.pdf',
 'synthetic.pdf',1000,1,'Synthetic resume containing Python and research experience.','{}','qwen3:4b');
$$, '42501', null, 'professor cannot create a student resume');
reset role;
set local "request.jwt.claims" = '{"role":"anon"}';
set local role anon;
select throws_ok($$select * from public.student_resumes$$, '42501', null, 'anonymous requests cannot read resume metadata');
select is((select count(*)::integer from storage.objects where bucket_id = 'student-resumes'), 0, 'anonymous requests cannot read resume files');
reset role;
select throws_ok($$update public.student_resumes set byte_size = 3145729$$, '23514', null, 'database also rejects oversized metadata');
select * from finish();
rollback;
