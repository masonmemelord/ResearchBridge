-- Existing creation and admin status changes retain their separate paths.
drop policy "Professors can update their own opportunities" on public.opportunities;
revoke update on public.opportunities from public, anon, authenticated;

-- Guarantee a new version even for multiple changes within one transaction.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;

create function public.professor_edit_opportunity(
  target_opportunity_id uuid,
  expected_updated_at timestamptz,
  fields jsonb
)
returns table (id uuid, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  edited public.opportunities;
begin
  if not public.is_professor(caller_id) then
    raise exception using errcode = '42501', message = 'professor access required';
  end if;

  if expected_updated_at is null or jsonb_typeof(fields) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'a listing version and editable fields are required';
  end if;

  if fields - array[
    'title', 'description', 'school', 'department', 'preferred_majors', 'keywords',
    'duration_semesters', 'eligible_class_years', 'positions_available',
    'learning_outcomes', 'duties_and_skills', 'weekly_hours_min', 'weekly_hours_max',
    'is_paid', 'pay_amount', 'pay_period'
  ] <> '{}'::jsonb then
    raise exception using errcode = '22023', message = 'only listing details can be edited';
  end if;

  edited := jsonb_populate_record(null::public.opportunities, fields);
  if edited.learning_outcomes is null or edited.duties_and_skills is null
    or edited.weekly_hours_min is null or edited.is_paid is null then
    raise exception using errcode = '22023', message = 'complete the required listing details';
  end if;

  return query
  update public.opportunities as opportunity
  set title = edited.title,
      description = edited.description,
      school = edited.school,
      department = edited.department,
      preferred_majors = edited.preferred_majors,
      keywords = edited.keywords,
      duration_semesters = edited.duration_semesters,
      eligible_class_years = edited.eligible_class_years,
      positions_available = edited.positions_available,
      learning_outcomes = edited.learning_outcomes,
      duties_and_skills = edited.duties_and_skills,
      weekly_hours_min = edited.weekly_hours_min,
      weekly_hours_max = edited.weekly_hours_max,
      is_paid = edited.is_paid,
      pay_amount = edited.pay_amount,
      pay_period = edited.pay_period
  where opportunity.id = target_opportunity_id
    and opportunity.professor_id = caller_id
    and opportunity.updated_at = expected_updated_at
  returning opportunity.id, opportunity.created_at;
end;
$$;

revoke all on function public.professor_edit_opportunity(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.professor_edit_opportunity(uuid, timestamptz, jsonb) to authenticated;
