# ResearchBridge
An AI-assisted research discovery platform connecting students with professors and opportunities based on interests, skills, and academic fit—starting at Tulane and built to scale across universities.
*Updates will be pushed every week on Saturday*

## Invite-only MVP release

A research opportunity board with three account tiers:

- **Students** browse published postings, search and filter them, and apply
  with an optional message. They can withdraw an application.
- **Professors** post opportunities and see who applied under
  **My opportunities** (`/professor/opportunities`), with each applicant's
  name, account email, and message.
- **Admins** (the ResearchBridge team) use `/admin` to give accounts the
  student or professor role and to see every posting and applicant. They can
  close or reopen any posting.

Public signup, résumé upload/AI scanning, and the unfinished draft UI are
disabled in production even if their feature flags are accidentally enabled.
Matching and messaging are not implemented.

Invitation requests and opportunity questions go to
**TheResearchAmbassadors@wave.tulane.edu**. `/access` and each published listing
open a pre-addressed `mailto:` draft; the user must send it through their email
app. This is not an automatic email service or an application submission.
Professors should include approved contact/next-step instructions in descriptions;
the cards now display the full description. Do not request résumés by email for
this pilot.

**Release checklist (hosted settings are separate from local config):**

1. In hosted Supabase Auth settings, disable **Allow new users to sign up**.
   `backend/supabase/config.toml` disables local signup only; the frontend gate
   does not prevent calls directly to the hosted Auth API.
2. Provision invited, confirmed student/professor accounts and matching profiles
   through the dashboard. Privately share access instructions, never credentials
   in Git or issues. Do not turn off signup-trigger/RLS safeguards.
3. Push the release migrations with `supabase db push` after reviewing
   `supabase migration list --linked`. Hosted Supabase needs
   `20261004120000` (student self-signup trigger, inert while signup is off),
   `20261004180000` (applications and owner-only profile reads), and
   `20261004200000` (admin tier). The résumé migration is held in
   `backend/supabase/held/` so a push cannot deploy it. Then appoint the team's
   admins in the SQL Editor (see **Admin accounts**). Verify hosted RLS:
   anonymous reads denied, students see published rows only, professors own
   their writes, and users cannot promote their own roles. Do not run database
   reset on hosted data.
4. Add only faculty-approved, real opportunities. Label examples as examples;
   synthetic test listings are not launch content.
5. Build with the hosted public URL/anon key and all three experimental flags
   absent or `false`. `NEXT_PUBLIC_*` values are fixed at build time: rebuild
   after changing them. Never include a service-role key in the frontend.
6. Run `cd frontend && npm run release:check`, then smoke-test the deployed
   professor-publishes/student-browses flow and email links at desktop/mobile
   sizes. A local passing test does not certify hosted configuration.
7. Merge through a reviewed PR and retain the last known-good deployment for
   rollback. No automatic deployment pipeline is configured by this section.

The experimental implementations remain available for development, not shipping:
`NEXT_PUBLIC_ENABLE_SELF_SIGNUP=true` (also requires enabling local Auth signup),
`NEXT_PUBLIC_ENABLE_DRAFTS=true`, and `npm run dev:local` for the résumé demo.
Production refuses these features regardless of the flags. Do not use real
student PDFs in local demos.

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
npx tsc --noEmit --incremental false
npm run test:auth
npm run test:resumes
npm run test:release
npm audit --omit=dev
npm run build
```

A pull request should not merge while these checks fail. `npm run release:check`
runs this sequence. Also inspect the full `npm audit`: runtime advisories must
be resolved before release; development-only advisories need documented review.
Review the main professor and student flow when a change affects UI or data behavior.

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

**Verifying the RLS policies and constraints:** `backend/supabase/tests/verify_opportunities_rls.sql` proves the required access rules and frontend-aligned constraints. `verify_student_self_signup.sql` proves the sign-up trigger only ever creates student profiles. `verify_applications_rls.sql` proves who can apply and who can see applications. `verify_admin_tier.sql` proves what admins can and cannot do. It runs in a transaction that's rolled back at the end, so it's safe to run repeatedly:

```bash
cd backend
supabase db reset --local
supabase test db
supabase db lint --local --level warning
```

A clean run reports all pgTAP assertions successful and no schema lint errors.

### Local AI résumé demo

This first version is **local only**. Students upload a text-based PDF, review
AI-extracted skills/education/experience/research interests, download the
original, and delete it. No matching, applications, professor résumé access,
malware scanning, OCR, or cloud AI calls are implemented.

**One-time setup:**

```bash
# macOS; Ollama + Qwen3-4B download uses approximately 2.5 GB for model weights.
brew install ollama
ollama pull qwen3:4b  # run with ollama serve already running in another terminal

cd backend
supabase start
supabase migration up --local  # applies pending migrations without resetting data
# The résumé migration is held out of migrations/ so it cannot reach hosted.
# Apply it to the local database only:
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -f supabase/held/migrations/20261003200000_student_resumes.sql
supabase test db --local
```

The résumé pgTAP tests are held in `backend/supabase/held/tests/`. See
`backend/supabase/held/README.md` for how to release the feature later.

**Each demo session:**

```bash
# Terminal 1: local inference only, not a login/background service
OLLAMA_HOST=127.0.0.1:11434 OLLAMA_NO_CLOUD=1 ollama serve

# Terminal 2: from the repository's frontend directory
cd frontend
npm ci
npm run dev:local
```

Sign in with a **local** student account and open `/student/resume`, or use
**My résumé** in the navigation. Hosted accounts do not automatically exist
locally. Provision a confirmed Auth user and matching student profile in local
Supabase Studio using the account-provisioning instructions below. Use synthetic
résumés for demos, never put real student files or credentials in Git.

`dev:local` reads local Supabase's public API settings from `supabase status`,
passes them to Next.js, and binds the frontend to `127.0.0.1`. It leaves your
hosted `frontend/.env.local` unchanged. Normal `npm run dev` has no résumé demo
link and the résumé API refuses hosted Supabase connections. Neither startup
command installs packages or pulls models automatically. Run `npm ci` only
after the lockfile changes or on a fresh checkout, not on every session.

**Local server settings:** `LOCAL_RESUME_DEMO=true`,
`NEXT_PUBLIC_ENABLE_RESUME_DEMO=true`, `OLLAMA_BASE_URL=http://127.0.0.1:11434`,
and `OLLAMA_MODEL=qwen3:4b` are supplied by `dev:local`; no paid API key or
service-role key is used by the feature. These values are not production setup.

**Limits and privacy:** one résumé per student, 3 MB, 1–5 pages, and at most
20,000 extracted characters. PDF parsing runs in a worker with a 15-second
deadline and bounded V8 heap; Ollama inference has a 120-second timeout and
one active scan per Next.js process. A private `student-resumes` bucket and
owner/role RLS protect both PDFs and `student_resumes` rows. Files are downloaded
as attachments, never embedded. The model has no tools; output is validated and
rendered as text. JSON validity does not guarantee factual accuracy—student
review is required, and scan results are not currently used for matching.

**API contract:** all routes require a Bearer Supabase student access token.

- `GET /api/student/resume`: `{ resume: StudentResume | null }`.
- `POST /api/student/resume`: raw PDF body, `Content-Type: application/pdf`,
  URL-encoded `X-Resume-Name`, and `X-Resume-Consent: true`; returns 201 with
  `{ resume }` after extraction, AI validation, and persistence.
- `GET /api/student/resume/file`: downloads the owner's original PDF.
- `DELETE /api/student/resume`: `X-Resume-Id` prevents stale-tab deletion;
  removes the stored object before its metadata/scan results. Replacing requires
  deleting the existing résumé first. Errors return `{ error: string }`.

**Checks:** Node 22.18+ is recommended for the test runner.

```bash
cd frontend
npm run test:resumes
npm run test:auth   # sign-up validation and error-message tests
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

Before production: patch existing dependency advisories, add distributed rate
limits/queues and stronger parser isolation, evaluate hallucinations and prompt
injection with representative synthetic résumés, and design reviewed/editable
results, retention, and authenticated inference hosting. Storage and database
writes are not atomic; failed uploads attempt cleanup and users can refresh and
delete a partially saved entry. When deleting an account, remove its Storage
objects via the Storage API **before** deleting Auth/profile rows to avoid
orphaned files. Stop both foreground servers with Ctrl+C after the demo; the
downloaded model remains reusable locally.

### Account provisioning details

**How roles work**

- **Every user has two linked rows:**
  * `auth.users`: handles sign-in (email and password).
  * `public.profiles`: the app's row for that user.
  * `profiles.id` must be the same value as `auth.users.id` exactly; link used for database to know which profile belongs to the signed-in user.

- **`profiles.role` decides what a user can do.** It can be a professor, student or admin.
  * **professor**: can create opportunities; view, update and delete their own in any status (draft, published, closed); read applications to their own opportunities.
  * **student**: can browse published opportunities, apply once to each (with an optional message of up to 1,000 characters), and withdraw their own applications.
  * **admin**: the team. Reads every profile, posting, and application; lists every account with its email; makes non-admin accounts students or professors; publishes or closes any posting. Admins cannot appoint admins or change their own role in the app.
  * Each user can read only their own profile, except admins. A professor sees an applicant's name and email only through the application, which copies them from the account when the student applies.

- **Database enforces rules, not frontend**: Row-level security checks the signed-in user's role and id on every request.

- **What happens on sign-in**: The frontend reads the user's role and sends them to their page:
  * **admins**: `/admin`.
  * **professors**: `/professor/opportunities` (their postings and applicants).
  * **students**: `/opportunities`.
  * If the user does not have a profile row, the app tells them to contact the team.
  * If the user has not confirmed their email yet, the sign-in page explains this and offers to resend the link.

**Student accounts**

- **Students are allowed to create their own profile**:
  * The database lets a signed-in user insert their own `profiles` row with two conditions:
    - `id` must be their own `auth.users.id`.
    - `role` must be `student`.

- **Anything else is rejected by the database, including:**
  * attempts to create a profile as `professor` or `admin`.
  * creating a profile for someone else's id.

- **Pilot students request access at `/access`.** The preserved `/sign-up` flow
  is experimental and development-only; production redirects to `/access`.

- **The team can still create a student by hand** (for example, for a demo account):
  1. In the Supabase dashboard, go to **Authentication → Users → Add user** and enter an email and password. Check auto-confirm so they can sign in right away.
  2. Copy the new user's **User UID**, then run this in the **SQL Editor**:
     ```SQL

     insert into public.profiles (id, full_name, role)
     values ('<user-uid>', '<full name>', 'student');

     ```

**Student sign-up and email confirmation**

This is a preserved development feature, **not part of the invite-only release**.
Set `NEXT_PUBLIC_ENABLE_SELF_SIGNUP=true` only for local testing and explicitly
enable local Auth signup for that session. Production always redirects `/sign-up`
to `/access`. Do not enable hosted public registration for this pilot.

- **The flow:**
  1. A student fills in name, email, and password at `/sign-up` (linked from **Get started** and the sign-in page when development signup is enabled).
  2. Supabase Auth creates the `auth.users` row and emails a six-digit code to the **email the student entered**. The page asks for that code and offers a resend button with a 60-second cooldown.
  3. The student enters the code. The browser calls Supabase `verifyOtp` with that email, token, and `type: 'email'`, then routes the verified student to `/opportunities`.
  4. If the page is closed before verification, open `/verify-email`, enter the same email and code, and continue. Signing in before confirming offers a resend control. `/auth/callback` remains for previously issued links and other link-based Auth responses.

The Research Ambassadors mailbox is only for pilot-access and opportunity
questions. It is never passed to Supabase as the verification recipient. The
local confirmation template is `backend/supabase/templates/confirm_signup.html`;
its `{{ .Token }}` placeholder is supplied by Supabase, not generated or stored
by the frontend.

- **The profile is created by the database, not the browser.** Migration `20261004120000_student_self_signup_profiles.sql` adds a trigger on `auth.users`. When the sign-up page marks a new user with `self_signup: true`, the trigger inserts their `profiles` row in the same transaction.
  * The role is always `student`. Anything else in the signup data, such as `role: "professor"`, is ignored.
  * Users created without that marker, such as through the dashboard's **Add user**, get no automatic profile. The manual steps above and below keep working unchanged.
  * Names are trimmed, stripped of control characters, and capped at 120 characters.

- **Professors cannot sign up.** The sign-up page is for students only and tells professors to sign in with the details the team sent them.

- **Testing locally:**
  * `backend/supabase/config.toml` disables signup globally for the pilot and requires email confirmation and 8-character passwords. Keep `auth.email.enable_signup=true`: CLI 2.104 uses this as the email-provider switch, and setting it false also prevents existing users signing in. To test experimental registration locally, temporarily enable `auth.enable_signup` and restart with `supabase stop && supabase start` from `backend/`. Local data is kept. Restore disabled global signup afterward.
  * Local Supabase does not send real email. Open Mailpit at `http://127.0.0.1:54324` to read confirmation codes. Restart local Supabase after changing its template or config.
  * Run the frontend on port 3000 (`npm run dev` or `npm run dev:local`). Confirmation links only return to the redirect URLs allowed in `config.toml`.
  * Dashboard-created local users still need **auto-confirm** checked, now that confirmation is required.

- **Future hosted signup checklist, not a pilot launch instruction.** `config.toml` only controls the local stack. Before intentionally opening registration in a future release, a team member must do these in the hosted project (and revise the production signup gate):
  1. Apply the new migration with `supabase db push`. Without it, new students are told their profile is missing.
  2. **Authentication → Sign In / Providers → Email:** keep **Confirm email** on and set the minimum password length to 8.
  3. **Authentication → URL Configuration:** set **Site URL** to the deployed site, and add `https://<your-domain>/auth/callback` and `http://localhost:3000/auth/callback` to **Redirect URLs**.
  4. **Authentication → Emails → SMTP Settings:** configure and verify a real email provider. Supabase's built-in email service only delivers to the project team's own addresses and has a very low hourly limit, so student codes will not arrive without this. Set a verified sender address; the recipient comes from the student signup form.
  5. **Authentication → Email Templates → Confirm signup:** use a code template containing `{{ .Token }}` (not only `{{ .ConfirmationURL }}`). For example: `<p>Your ResearchBridge code: {{ .Token }}</p>`. Match the six-digit code length and one-hour expiry in Auth settings. The local template file does not update the hosted project automatically.
  6. Test signup and resend with a **team-owned test student inbox**, enter the code on `/sign-up`, and check that the verified student reaches `/opportunities`.

- **Known limitation:** anyone with a working email address can create a student account and then browse published opportunities. To limit sign-up to university addresses, add a server-side check, such as a Supabase "before user created" auth hook. A frontend-only check is not enough because the signup API is public.

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

- **Checking it worked:** sign in as the new professor. Should land on `/professor/opportunities`. If they see the "contact the team" message, the profile row is missing or its `id` does not match the User UID.

**Admin accounts**

- **Appoint admins only in the SQL Editor.** The app never grants the admin role. Create the user under **Authentication → Users → Add user** (auto-confirm), copy the **User UID**, then run:
  ```SQL

  insert into public.profiles (id, full_name, role)
  values ('<user-uid>', '<full name>', 'admin')
  on conflict (id) do update set role = 'admin';

  ```
- **Faster professor and student setup:** after the first admin exists, add any account with **Add user**, then open `/admin`. The account appears under **People** as **Needs a role**. Choose **Student** or **Professor** and select **Activate**. No SQL is needed.

**Changing a role**

- **Users cannot change their own role.** A database trigger rejects any signed-in user who tries to update `profiles.role`, including a student trying to become a professor or admin.
- **An admin changes student and professor roles at `/admin`.** Admin roles are changed only in the SQL Editor:
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
