# ResearchBridge
An AI-assisted research discovery platform connecting students with professors and opportunities based on interests, skills, and academic fit—starting at Tulane and built to scale across universities.
*Updates will be pushed every week on Saturday*

# Development Stack
**Frontend:**
- Next.Js
**Backend**
- Python
**Database**
- Postgres SQL (Supabase) + RLS

### Frontend responsibilities

- Build the professor dashboard and create-opportunity form.
- Build the student opportunity-browse page with department and duration filters.
- Provide responsive layouts and clear loading, empty, validation, and error states.
- Send opportunity data through the authenticated Supabase client and present useful loading,
  success, empty, and authorization-error states.

### Backend responsibilities

- Authenticate users with Supabase Auth and verify whether they are a professor or student.
- Validate all incoming opportunity fields before a write occurs.
- Create, update, publish, close, and retrieve opportunities through server-side actions or API routes.
- Verify that a professor owns an opportunity before allowing changes.

### Database responsibilities

- Store `profiles`, `departments`, and `opportunities`.
- Enforce `duration_semesters` between 1 and 4 and require positive available positions.
- Store opportunity status as `draft`, `published`, or `closed`.
- Use row-level security: professors can manage only their own opportunities; students can read only published opportunities.

### Request flow

```text
Frontend form → Supabase Auth session → Data API → Database validation and RLS
Student browse page → Supabase Auth session → Data API → Published opportunities only
```

## Team CI/CD Rules

### Branches and pull requests

- Create one branch per focused change, such as `feature/professor-form` or `feature/student-browse`.
- Do not push directly to `main` or force-push shared branches.
- Open a pull request into `main` and get one teammate review before merging.
- Before merging, update your branch with `git fetch origin` and `git merge origin/main`, then resolve and test any conflicts.

### Required checks

Run these from `frontend/` before opening or approving a pull request:

```bash
npm run lint
npm run build
```

A pull request should not merge while either check fails. Review the main professor and student flow when a change affects UI or data behavior.

### Database and security

- Every database change gets a new, timestamped migration file; do not edit a migration that another teammate may already have applied.
- Keep secrets in local `.env` files or deployment environment variables. Never commit credentials, API keys, resumes, or student personal information.
- Database authorization must be enforced with server-side checks and Supabase Row-Level Security, never only by frontend UI.

### Deployment

```text
Feature branch → Pull request checks → Teammate review → Merge to main → Production deployment
```

- Deploy only code that passes lint and production build checks.
- Use preview deployments to review substantial UI changes before merging.
- If production breaks, redeploy the last known-good deployment while the issue is investigated.

## Database Setup

The schema (enums, `profiles`, `departments`, `opportunities`, constraints, indexes, triggers, and RLS policies) lives in `backend/supabase/migrations/`. Department seed data lives in `backend/supabase/seed.sql`.

**Frontend environment variables** (put these in `frontend/.env.local`, which is gitignored):

- `NEXT_PUBLIC_SUPABASE_URL` — the project API URL from the Supabase Connect dialog.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the public browser key. This key does not bypass RLS.

Copy `frontend/.env.example` to `frontend/.env.local` and replace the example values. Never put
the service-role key in a `NEXT_PUBLIC_` variable.

**Supabase CLI environment variables** (put these in `backend/supabase/.env.local`, which is gitignored):

- `SUPABASE_URL` — your project's API URL (`http://127.0.0.1:54321` for local dev).
- `SUPABASE_ANON_KEY` — public key used by the frontend/browser.
- `SUPABASE_SERVICE_ROLE_KEY` — secret key for trusted server-side code only; it bypasses RLS, so never expose it to the browser.
- `SUPABASE_DB_URL` — Postgres connection string, needed for running raw SQL (e.g. the verification script) against the database directly.

For a local Supabase CLI project, run `supabase status` after starting the stack to print the local values for these.

**Applying migrations:**

```bash
# Local development (requires Docker):
supabase start          # boots the local stack
supabase db reset --local # (re)applies all migrations + seed.sql from scratch

# Against a hosted/linked project:
supabase link --project-ref <your-project-ref>
supabase db push        # applies any migrations not yet on the remote database
```

**Verifying the RLS policies and constraints:** `backend/supabase/tests/verify_opportunities_rls.sql` proves the required access rules and frontend-aligned constraints. It runs in a transaction that's rolled back at the end, so it's safe to run repeatedly:

```bash
cd backend
supabase db reset --local
supabase test db
supabase db lint --local --level warning
```

A clean run reports all pgTAP assertions successful and no schema lint errors.

### Account provisioning

**How roles work**

- **Every user has two linked rows:**
  * `auth.users`: handles sign-in (email and password).
  * `public.profiles`: the app's row for that user.
  * `profiles.id` must be the same value as `auth.users.id` exactly; link used for database to know which profile belongs to the signed-in user.

- **`profiles.role` decides what a user can do.** It can be a professor, student or admin.
  * **professor**: can create opportunities; view, update and delete their own in any status (draft, published, closed).
  * **student**: allowed to browse published opportunities only.
  * **admin**: reserved for the team. No page in the app yet.

- **Database enforces rules, not frontend**: Row-level security checks the signed-in user's role and id on every request.

- **What happens on sign-in**: The frontend reads the user's role and sends them to their page:
  * **professors**: `/professor/opportunities/new`.
  * **students**: `/opportunities`.
  * If the user does not have a profile row, the app tells them to contact the team.

**Student accounts**

- **Students are allowed to create their own profile**:
  * The database lets a signed-in user insert their own `profiles` row with two conditions:
    - `id` must be their own `auth.users.id`.
    - `role` must be `student`.

- **Anything else is rejected by the database, including:**
  * attempts to create a profile as `professor` or `admin`.
  * creating a profile for someone else's id.

- **For now, the team creates student accounts.**
  * The app has no sign-up or "create profile" UI yet, so students are set up the same way as professors:
    1. In the Supabase dashboard, go to **Authentication → Users → Add user** and enter an email and password. Check auto-confirm so they can sign in right away.
    2. Copy the new user's **User UID**, then run this in the **SQL Editor**:
       ```SQL

       insert into public.profiles (id, full_name, role)
       values ('<user-uid>', '<full name>', 'student');

       ```

**Professor accounts**

- **Users cannot make themselves professors**
  * If a signed-in user tries to create their own profile with `role = 'professor'`, the database will reject it.

- **Only a team member with dashboard access can create professor accounts:**
  1. In the Supabase dashboard, go to **Authentication → Users → Add user** and enter an email and password. Click auto-confirm if you want to sign in right away. 
  2. Copy the new user's **User UID**, then run this in the **SQL Editor**:
     ```SQL
     
     insert into public.profiles (id, full_name, role)
     values ('<user-uid>', '<full name>', 'professor');
     
     ```

- **Scripts that create accounts** may use the service-role key instead, but only in trusted server-side code. It bypasses row-level security, so it must never appear in frontend code, a `NEXT_PUBLIC_` variable, or a commit (see **Database Setup**).

- **Checking it worked:** sign in as the new professor. Should land on `/professor/opportunities/new`. If they see the "contact the team" message, the profile row is missing or its `id` does not match the User UID.

**Changing a role**

- **Users cannot change their own role.** A database trigger rejects any signed-in user who tries to update `profiles.role`, including a student trying to become a professor or admin.
- **A team member changes roles in the SQL Editor:**
  ```SQL

  update public.profiles
  set role = 'professor'
  where id = '<user-uid>';
  
  ```
- The user should sign out and back in so it can allow the app to send them to the right page for their new role.

**Test accounts**

- The hosted project has two non-production test accounts for MVP testing: one professor and one student.
- Each one has an `auth.users` row and `public.profiles` row with the same `id`.
- Credentials are shared and stored privately with the team. Never put passwords, tokens, or keys in GitHub issues, pull requests, source code, migrations, seed files, or logs.
- To confirm both accounts are set up correctly, run this in the **SQL Editor**:
  ```SQL

  select u.email, p.role
  from auth.users u
  join public.profiles p on p.id = u.id
  order by p.role;

  ```



# Deadlines: 
- **September 20**: A professor can create an opportunity and a student can browse it.
- **October 4**: the entire student-to-professor workflow operates end to end.
- **October 12**: Pitch Friday + Apply to 1834 VC
- **October 18**: the product contains real, reviewed Tulane data and is
being tested by actual users.
- **November 1**: a polished, measurable product—not merely a technical prototype.
- **November 5**: presentation-ready release candidate.
- **November 11**: Present at NOAI!
