# ResearchBridge
An AI-assisted research discovery platform connecting students with professors and opportunities based on interests, skills, and academic fit—starting at Tulane and built to scale across universities.

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

### Editing professor opportunities

From **My opportunities**, choose **Edit opportunity** to reopen a listing at
`/professor/opportunities/<id>/edit`. The form uses the same fields and
validation as posting a new opportunity. Existing listings with missing learning
outcomes, duties, weekly hours, or compensation must have those details completed
before saving.

Edits update the original listing, keeping its applications, ownership, and
published/draft/closed status. Published changes become visible to students when
they reload or refresh their listings. Drafts and closed listings stay private.
Changing status is a separate action; the edit form does not publish or reopen
a listing.

The read and update requests filter by the signed-in professor's ID, and
Postgres RLS enforces ownership and professor role. Updates also match the
loaded `updated_at` value, so another tab or an admin's changes cannot be
silently overwritten. A conflict keeps the local entries and offers **Reload
latest version** with a discard confirmation. Failed network requests can be
retried, and **Cancel** confirms before discarding edits. Refreshing or closing
the tab also warns about unsaved entries when supported by the browser.

No new migration or environment variable is required for editing; the existing
opportunity-details migration must already be applied. Regression coverage is in
`frontend/tests/opportunity-editing.test.mjs` and
`backend/supabase/tests/verify_opportunity_edits.sql`.

## Account signup, verification and recovery

Supabase Auth owns credentials and sessions; Resend delivers Auth emails over
custom SMTP. Postgres provisions every new Auth user as a `student`, regardless
of client metadata. RLS controls data access. Clients cannot insert profiles or
grant themselves roles. Professors and admins use the same sign-in system with
separate, trusted provisioning.

Install frontend dependencies with `cd frontend && npm ci`, copy `.env.example`
to `.env.local`, and provide the public URL and anon key for your Supabase
project. Never put a service-role key or Resend API key in a `NEXT_PUBLIC_*`
variable. Run `npm run dev` for development. Keep real environment files out of Git.

- **Students:** `/sign-up` → email code → **Set password and continue** →
  `/opportunities`. The initial password is discarded atomically when a pending
  signup is first confirmed; the verified owner establishes their password next.
  Signup keeps the entered password in memory to prefill that step, never in
  application storage or logs. `/verify-email` resumes with a code and asks for
  the owner's name and password.
- **Interrupted setup / forgotten password:** `/reset-password` sends a code,
  verifies inbox ownership, and lets the owner set a password. An account whose
  setup stopped after verification has no usable password until this completes.
- **Professors:** the team verifies faculty status, invites from Supabase, and
  an existing app admin assigns `professor`. The invited user enters their code
  at `/accept-invite`, sets a password, and reaches the professor workspace.
  Promote an existing confirmed student account in place; preserve its data.
  The database refuses promotion of an account that is neither confirmed nor
  team-invited. The admin's role change is the approval; confirmation alone does
  not establish faculty status. Changes are recorded in `private.role_changes`,
  which has no client access. The professor-request mailbox remains a team decision.
- **Admins:** create a confirmed account through trusted team tooling, then
  promote its automatic student profile from the Supabase SQL editor:

  ```sql
  insert into public.profiles (id, role)
  select id, 'admin'::public.user_role
  from auth.users where email = 'approved-admin@example.org'
  on conflict (id) do update set role = excluded.role;
  ```

  App admins cannot assign `admin`, alter another admin, or change their own role.

`NEXT_PUBLIC_ENABLE_SELF_SIGNUP` defaults off and accepts only the exact value
`true`, including production. Next.js embeds this value at build time; changing
it requires a new build/deployment. It controls UI availability, not API security.
Keep hosted **Allow new users to sign up** off until the hosted tests pass. This
change does not enable signup in any hosted project or set a university-domain
restriction. Allowed email domains remain a separate product decision.

### Local Auth checks

Prerequisites: Docker, Supabase CLI, and Node with native TypeScript stripping
(`--experimental-strip-types`). Start local services and apply migrations without
resetting the database:

```bash
cd backend
supabase start
supabase migration up --local
supabase test db --local
supabase db lint --local --level warning
cd ../frontend
npm run test:auth
npm run test:auth:integration -- --manage-local
```

The integration runner accepts only loopback services and reads local keys in
memory. `--manage-local` stops/starts the local stack, temporarily opens local
signup and raises local test limits, restores `config.toml` byte-for-byte, removes
its synthetic users/emails/audit rows, and stops the stack afterward. Existing
local data is preserved. Without that flag it requires an already-running local
stack with signup enabled. It never uses hosted `.env.local` settings. Checks
cover password pre-registration, concurrent/gap logins, interrupted setup,
recovery, metadata forgery, professor promotion and invitations, and team-created
accounts. Run these tests on every Supabase/Auth upgrade as well as before release.

### Hosted rollout and rollback

1. Use an isolated staging Supabase project and a Vercel Preview pointing to it.
   A Preview using production Supabase still accesses production data.
2. With registration closed, deploy the password-setup/recovery frontend with
   the signup flag off, then apply `20261108120000_account_signup_hardening.sql`.
   Existing pending confirmations must reach the new password setup before the
   confirmation trigger is installed. Do not deploy the trigger alone alongside
   the old verification UI.
3. Configure staging SMTP and Site URL/redirect allowlist. In hosted Supabase,
   copy the code-only **Confirm signup**, **Reset password**, and **Invite user**
   templates from `backend/supabase/templates/`. Local template configuration does
   not update hosted templates. Set confirmation on, six-digit codes, and test the
   actual expiry and secure-password-change settings. Verify Resend's sending
   domain, DNS authentication, and launch quotas in its dashboard.
4. Enable staging signup only, run the complete security and real-inbox browser
   suite, and verify existing student/professor/admin accounts still work. Current
   hosted compatibility and delivery are unverified. Keep production closed until
   these pass, then repeat the rollout with environment-specific keys/settings.

The confirmation trigger writes an Auth-managed password field and depends on
GoTrue's pending-confirmation columns. This is a compatibility risk requiring
hosted staging and upgrade tests. It is not a substitute for email confirmation.
If it fails hosted testing, keep signup closed; a shorter JWT lifetime does not
fix an attacker password that remains usable after interrupted setup.

For incidents, close hosted signup first and disable the public UI flag. Preserve
password setup/recovery and the confirmation protection while repairing forward;
reverting them can strand pending users or restore the attack. Coordinate any
database rollback with those pending accounts. The role hierarchy and existing
confirmed users' passwords are otherwise preserved.

The `Quality and local Auth security` GitHub Actions workflow runs the release
checks and the database/Auth suite for every PR and push to `main`, using an
ephemeral local Supabase stack and no hosted credentials. Its CLI version is
pinned; update it deliberately and rerun hosted staging before Auth upgrades.
The workflow itself still needs its first GitHub run after this branch is pushed.

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
npx next typegen
npx tsc --noEmit --incremental false
npm run test:auth
npm run test:resumes
npm run test:release
npm run test:applications
npm run test:admin
npm run test:opportunities
npm audit --omit=dev
npm run build
```

A pull request should not merge while these checks fail. `npm run release:check`
runs this sequence. Also inspect the full `npm audit`: runtime advisories must
be resolved before release; development-only advisories need documented review.
Review the main professor and student flow when a change affects UI or data behavior.

`next typegen` generates the ignored Next.js declarations before TypeScript
checks, so the checks also work on a fresh checkout after `npm ci`.

### Database and security

- Every database change gets a new, timestamped migration file; do not edit a migration that another teammate may already have applied.
- Keep secrets in local `.env` files or deployment environment variables. Never commit credentials, API keys, resumes, or student personal information.
- Database authorization must be enforced with server-side checks and Supabase Row-Level Security, never only by frontend UI.

### Deployment

```text
Feature branch → Pull request checks → Teammate review → Merge to main → Production deployment
```

- Deploy only code that passes lint and production build checks.
- Before deploying the opportunity-details frontend, apply
  `backend/supabase/migrations/20261023120000_opportunity_details.sql` using
  `supabase db push` from `backend/`. Browsing requests the new columns, so
  deploying the frontend first breaks that page. Test the migration locally
  with `supabase test db --local` and `supabase db lint --local --level warning`.
  The added columns are nullable for existing listings; leave them in place
  if rolling back the frontend to the previous deployment.
- Use preview deployments to review substantial UI changes before merging.
- If production breaks, redeploy the last known-good deployment while the issue is investigated.

# Deadlines: 
- **September 20**: A professor can create an opportunity and a student can browse it.
- **October 4**: the entire student-to-professor workflow operates end to end.
- **October 12**: Pitch Friday + Apply to 1834 VC
- **October 18**: the product contains real, reviewed Tulane data and is
being tested by actual users.
- **November 1**: a polished, measurable product—not merely a technical prototype.
- **November 5**: presentation-ready release candidate.
- **November 11**: Present at NOAI!
