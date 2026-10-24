-- Opportunity details requested by faculty reviewers: learning outcomes,
-- weekly time commitment, compensation, and expected duties/skills.
--
-- The columns are nullable because listings published before this migration
-- have none of these values, and a NOT VALID check would still be re-checked
-- whenever an old row is updated (for example, when an admin closes it). The
-- professor form requires every field for new postings; these constraints keep
-- whatever is stored well-formed.

create type public.compensation_period as enum ('hour', 'semester', 'total');

alter table public.opportunities
  add column learning_outcomes text,
  add column weekly_hours_min smallint,
  add column weekly_hours_max smallint,
  add column is_paid boolean,
  add column pay_amount numeric(9, 2),
  add column pay_period public.compensation_period,
  add column duties_and_skills text,

  add constraint opportunities_learning_outcomes_length
    check (
      learning_outcomes is null
      or char_length(btrim(learning_outcomes)) between 20 and 1500
    ),

  add constraint opportunities_duties_and_skills_length
    check (
      duties_and_skills is null
      or char_length(btrim(duties_and_skills)) between 20 and 1500
    ),

  -- Either no time commitment, or a minimum of 1-40 hours with an optional
  -- maximum that is not below it. NULL comparisons are spelled out because a
  -- CHECK that evaluates to NULL passes.
  add constraint opportunities_weekly_hours_range
    check (
      (weekly_hours_min is null and weekly_hours_max is null)
      or (
        weekly_hours_min is not null
        and weekly_hours_min between 1 and 40
        and (
          weekly_hours_max is null
          or weekly_hours_max between weekly_hours_min and 40
        )
      )
    ),

  -- Paid listings need a positive amount and a period; unpaid or unanswered
  -- listings carry neither.
  add constraint opportunities_compensation_consistent
    check (
      case
        when is_paid is true then
          pay_amount is not null
          and pay_amount > 0
          and pay_amount <= 100000
          and pay_period is not null
        else
          pay_amount is null
          and pay_period is null
      end
    );

comment on column public.opportunities.learning_outcomes is
  'What students will learn or gain. Required by the professor form; NULL on older listings.';

comment on column public.opportunities.weekly_hours_min is
  'Expected hours per week (1-40). With weekly_hours_max NULL, this is the exact commitment.';

comment on column public.opportunities.weekly_hours_max is
  'Upper bound of the weekly hours range, or NULL when the commitment is a single number.';

comment on column public.opportunities.is_paid is
  'Whether the position is paid. NULL only on listings created before this field existed.';

comment on column public.opportunities.pay_amount is
  'Pay in US dollars per pay_period. Present only when is_paid is true.';

comment on column public.opportunities.pay_period is
  'What pay_amount covers: per hour, per semester, or a one-time total.';

comment on column public.opportunities.duties_and_skills is
  'Expected duties and the skills students should bring or will use.';
