-- Local-demo résumé persistence. Do not apply to hosted Supabase until reviewed.
create or replace function public.is_student(user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.profiles where id = user_id and role = 'student');
$$;
revoke all on function public.is_student(uuid) from public;
grant execute on function public.is_student(uuid) to authenticated;

create table public.student_resumes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null check (length(original_name) between 1 and 120),
  byte_size integer not null check (byte_size between 1 and 3145728),
  page_count smallint not null check (page_count between 1 and 5),
  extracted_text text not null check (length(extracted_text) between 30 and 20000),
  scan_result jsonb not null check (
    jsonb_typeof(scan_result) = 'object' and octet_length(scan_result::text) <= 20000
  ),
  model text not null check (length(model) between 1 and 100),
  created_at timestamptz not null default now(),
  constraint resume_owner_path check (storage_path = student_id::text || '/' || id::text || '.pdf')
);
alter table public.student_resumes enable row level security;
revoke all on public.student_resumes from anon, authenticated;
grant select, insert, delete on public.student_resumes to authenticated;

create policy "Students read their own resume" on public.student_resumes
for select to authenticated using (student_id = auth.uid() and public.is_student(auth.uid()));
create policy "Students insert their own resume" on public.student_resumes
for insert to authenticated with check (student_id = auth.uid() and public.is_student(auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-resumes', 'student-resumes', false, 3145728, array['application/pdf']);

-- No UPDATE policy: replacing a file requires explicitly deleting it first.
create policy "Students read their own resume file" on storage.objects
for select to authenticated using (
  bucket_id = 'student-resumes' and exists (
    select 1 from public.student_resumes r where r.student_id = auth.uid() and r.storage_path = name
  )
);
create policy "Students upload their own resume file" on storage.objects
for insert to authenticated with check (
  bucket_id = 'student-resumes' and exists (
    select 1 from public.student_resumes r where r.student_id = auth.uid() and r.storage_path = name
  )
);
create policy "Students delete their own resume file" on storage.objects
for delete to authenticated using (
  bucket_id = 'student-resumes' and exists (
    select 1 from public.student_resumes r where r.student_id = auth.uid() and r.storage_path = name
  )
);

-- Delete the file via the Storage API before deleting its metadata. A definer
-- helper avoids recursive RLS between student_resumes and storage.objects.
create function public.resume_file_removed(resume_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select not exists (
    select 1 from storage.objects o join public.student_resumes r on r.storage_path = o.name
    where r.id = resume_id and r.student_id = auth.uid() and o.bucket_id = 'student-resumes'
  );
$$;
revoke all on function public.resume_file_removed(uuid) from public;
grant execute on function public.resume_file_removed(uuid) to authenticated;
create policy "Students delete metadata after removing file" on public.student_resumes
for delete to authenticated using (
  student_id = auth.uid() and public.is_student(auth.uid()) and public.resume_file_removed(id)
);
