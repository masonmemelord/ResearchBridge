# Held database changes

Files here are **not** applied by `supabase db push`, `supabase db reset`, or
`supabase test db`. The CLI reads only `migrations/` and `tests/`.

| File | Feature | Why it is held |
| --- | --- | --- |
| `migrations/20261003200000_student_resumes.sql` | Local AI résumé demo | Not reviewed for hosted use. It creates the `student_resumes` table and a private Storage bucket. |
| `tests/verify_student_resumes_rls.sql` | pgTAP tests for that migration | Fails on a database without the held migration. |

**Using the résumé demo locally.** Apply the held migration to the local
database only:

```bash
cd backend
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -f supabase/held/migrations/20261003200000_student_resumes.sql
```

**Releasing it later.** Copy the migration back into `migrations/` under a
**new** timestamp later than every applied migration, review it, and move the
test back into `tests/`. Reusing the old timestamp would sort it before
migrations that hosted Supabase has already applied, so `db push` would refuse it.
