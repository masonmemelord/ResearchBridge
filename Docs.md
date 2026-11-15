# Documentation
This is the files for documentation for changes also external memory for coding agents
Please include:
- Date of changes made (Month, Day)
- Changes made
- Future Changes 

## Sep 11 
**Changes Made:**
1. Created PI posting page 
2. Implemented hardcoded testing for PI postings/opportunities
3. Tested web persistence in Google Dev Console (successful)

**Future Changes**
1. Update language to make it more humanized
2. Set up Auth routing for PI's via Sign In/Get Started
3. Link Auth and Supabase persistence to repsective PI
4. Build Student facing page:
    - Opportunity cards
    - Dept filter
    - Duration filter
    - Class-year eligibility
    - Position availabilty mirror
    - Only showing **published** opportunities

`learning Github for collaborations has been fun`

## Sep 13
**Changes Made**
1. Updated UI across site
**Future Changes**
1. Humanize language
2. Set up Auth routing for PI's via Sign In/Get Started
3. Link Auth and Supabase persistence to repsective PI
4. Build Student facing page:

## Sep 16
**Changes Made:**
1. Added profiles, departments, and opportunities; schema migration (enums, constraints, indexes, updated_at trigger, RLS policies), replacing the separate professors /students tables
2. Added department seed data (`backend/supabase/seed.sql`)
3. Added RLS verification test (`backend/supabase/tests/verify_opportunities_rls.sql`) proving professor-owns-opportunity, student-sees-published-only, and constraint checks

## Sep 19
**Changes Made:**
- Fixed Supabase Postgres issues (Session based)
- Merged Docker into project
- Added RLS
- Added Supabase/js and browser client
- Connected frontend to Supabase
- Added Sign in/out pages
- Added Student browse page

**Future Changes**
1. Transfer back to transaction pooler 
2. Test RLS
3. Integrate Sign-in/out auth specifications

## Sep 28
**Changes Made:**
1. Added migration `20260926210414_secure_profiles_and_opportunity_reads.sql`
    - Users can only create their own profile with role `student`; professor/admin profiles can no longer be self-assigned
    - Professor profiles must now be created by an admin (dashboard or service-role key, never in frontend code)
    - Existing trigger still blocks users from changing their own role
    - Opportunity read policies restricted to signed-in users; anonymous requests see nothing
2. Expanded RLS tests (`backend/supabase/tests/verify_opportunities_rls.sql`) from 16 to 35 tests
    - Profiles: new user cannot create a professor or admin profile, can create a student profile; student cannot change role to admin
    - Visibility: anonymous sees nothing; student and other professors see published only; owner sees draft/published/closed
    - Writes: owner can update/delete; other professors and students cannot delete; students cannot update
    - Constraints: empty title, description under 30 chars, empty class-year list, more than 8 keywords, invalid school value
3. Updated README to include changes to Account provisioning section: (roles, student/professor setup, changing roles, test accounts)
4. Set up local Supabase with Colima (Docker runtime installed via Homebrew, no Docker Desktop needed)
5. Local results: migrations apply cleanly, all 35 tests pass, `supabase db lint` finds no issues running.
6. Created professor and student test accounts in the hosted project (credentials shared outside GitHub)
7. Verified the workflow against the hosted project: professor publishes, student sees published only, signed-out users see nothing

**Future Changes**
1. Teammate review and merge of the Issue #3 PR

`Colima setup: run colima start before supabase start`

## 2026-10-03 — Use Docs.md for agent session logging

**Changes Made:**

- Updated `AGENTS.md` and `CLAUDE.md` to use `Docs.md` as their shared ticket
  and change log, read at session start and updated before the final handoff.
- Entries must include completed changes, affected files, verification results,
  and remaining blockers or follow-up tasks.
- Reversed the previous `TICKETS.md` logging requirement and removed the entry
  added in that session, preserving its original heading.

**Verification:**

- Reviewed the instructions and Markdown formatting. Application tests were
  not run because this change only affects documentation.

**Future Changes:**

- Both agents should append subsequent session entries here and preserve the
  existing history.

## 2026-10-03 — Professor submission and student browsing end-to-end test

**Changes Made:**

- Tested the current professor opportunity form through real local Supabase Auth,
  the Data API, Postgres, and RLS, then verified visibility as a student.
- Started Docker Desktop and applied the existing pending migration
  `20260926210414_secure_profiles_and_opportunity_reads.sql` locally with
  `supabase migration up --local`; no database reset was used.
- Created temporary synthetic professor/student accounts and submissions for
  testing. Removed them afterward and independently verified that no test users,
  profiles, or opportunities remained. Hosted Supabase was untouched.
- Repository file changed in this session: `Docs.md` only. The test harness and
  evidence are outside the repository at
  `/private/tmp/researchbridge-e2e.VfYoQC/` (`run.cjs`, `results.json`, `REPORT.md`,
  and screenshots). No application code or dependencies were changed.

**Verification:**

- All 19 browser/workflow assertions passed: role-based sign-in, invalid
  credentials, empty-form and position validation, draft save, published save,
  database persistence, private-draft visibility, combined filters, reload,
  student/anonymous access restrictions, failed-save recovery, both sign-outs,
  and 375px layouts. No unhandled browser JavaScript errors occurred.
- Including provisioning, the test build, and cleanup, `run.cjs` recorded
  22 passing checks and zero failures.
- `supabase test db --local`: all 35 pgTAP tests passed.
- `supabase db lint --local --level warning`: no schema errors.
- `npm run lint` and `tsc --noEmit --incremental false`: passed.
- Default `npm run build` was blocked by a Turbopack worker port-binding
  permission error in this execution environment. The supported
  `next build --webpack` fallback passed and was used for browser testing.
- Stopped the temporary frontend server and regenerated the production output
  using the normal frontend environment. Docker/local Supabase remain running.

**Future Changes:**

- No student résumé/file uploader exists in the current repository, so that
  separate feature could not be tested.
- Hosted end-to-end verification remains separate from this local test.
- Draft reopening/editing is not implemented and was not exercised; this run
  verified saving a draft and publishing a separate new opportunity.
- Recheck the default Turbopack build in an unrestricted development/CI
  environment before treating that build path as verified.

## 2026-10-03 — Research open-source résumé scanning options

**Changes Made:**

- Inspected the existing authentication, opportunity routes, Supabase schema,
  and storage configuration for the proposed student résumé feature.
- Confirmed the desired scan is AI-based. At the user's request, researched
  open-source alternatives instead of integrating a proprietary AI provider.
- Compared local Ollama inference with the Apache-2.0 Qwen3-4B model,
  llama.cpp inference, and Docling PDF/layout/OCR extraction using their
  official documentation. These are recommendations, not implemented features.
- Provisionally installed `pdf-parse@2.4.5` during the initial investigation,
  then uninstalled it while the scanning stack is being selected. Verified
  `frontend/package.json` and `frontend/package-lock.json` have no diff.
- This session's retained repository change is this `Docs.md` entry only.
  No AI models were downloaded, résumé data transmitted, migrations applied,
  hosted resources changed, or commits/pushes made.

**Verification:**

- Inspected the working-tree diff and dependency metadata.
- `npm audit` reported seven existing dependency findings: one critical
  Next.js advisory and six high findings involving development dependencies.
  None named the provisional PDF parser. No automatic audit fix was run.
- Application checks were not rerun because no application changes were retained.

**Future Changes:**

- Choose local-demo versus hosted inference before implementing the scanner.
- Implement private student-owned file storage, server-side authorization,
  upload limits, bounded parsing/inference, structured-result validation, and
  student review of AI-generated results. Treat uploaded document instructions
  as untrusted input and never as authorization to execute actions.
- Address the dependency advisories separately before production launch.

## 2026-10-03 — Local student résumé upload and AI scan demo

**Changes Made:**

- Built `/student/resume`: PDF selection, consent, upload/scan progress,
  private AI results and extracted-text review, original-file download,
  deletion confirmation, replacement via deletion, and recovery/error states.
  Student navigation includes `My résumé` only in local-demo mode.
- Added server routes at `/api/student/resume` (GET/POST/DELETE) and
  `/api/student/resume/file` (GET). Every request verifies the Supabase user
  and student role, uses the user's token under RLS, and refuses hosted
  Supabase connections. No service-role or paid AI key is used by the feature.
- Added owner-only `student_resumes` metadata and a private Storage bucket in
  `backend/supabase/migrations/20261003200000_student_resumes.sql`.
  Enforced one résumé per student, exact owner/record object paths, PDF-only
  bucket uploads, 3 MB, and one to five pages. File removal precedes metadata
  deletion. Applied this new migration locally without resetting data.
- Added `frontend/lib/resumes/` modules for contracts, bounded upload reads,
  isolated PDF parsing, local Ollama inference, output validation, and client
  requests. PDF parsing has a 15-second deadline and bounded V8 heap; inference
  has a 120-second deadline and one concurrent scan per frontend process.
- With the user's explicit approval, installed Ollama via Homebrew (including
  its mlx/mlx-c dependencies) and downloaded `qwen3:4b` (~2.5 GB). Added pinned
  `pdf-parse@2.4.5` to frontend dependencies. No automatic model downloads occur
  on startup. No private résumé information was transmitted to a cloud AI.
- Added `frontend/scripts/dev-local.mjs` and `npm run dev:local` to supply
  local public Supabase settings, enable the demo, and bind to loopback without
  editing the hosted `.env.local`. Added `npm run test:resumes`, frontend PDF/
  contract tests, and `backend/supabase/tests/verify_student_resumes_rls.sql`.
- Updated `README.md` with local setup, account provisioning requirements,
  API contracts, limits, privacy, recovery behavior, and production follow-ups.
- Set `agentRules: false` in `frontend/next.config.ts` because agent instructions
  are maintained at the root. Removed only the two frontend agent stubs that
  Next.js regenerated during testing, preserving the user's existing file move.
- Affected frontend UI: `components/auth/AuthNav.tsx`,
  `components/resumes/ResumeUploader.tsx`, `app/student/resume/page.tsx`, and
  the two new API route files. Package manifests/lockfile and this log changed.

**Verification:**

- `npm run lint`: passed. `tsc --noEmit --incremental false`: passed.
- `npm run test:resumes`: all 10 tests passed, including real PDF worker parsing,
  invalid/corrupt PDFs, empty/oversized files, page limits, untrusted model
  output, and malformed persisted scan recovery. The Node test runner emits
  a harmless module-type autodetection warning for TypeScript source imports.
- `supabase test db --local`: all 54 assertions passed (35 opportunities,
  19 résumé/storage checks). `supabase db lint --local --level warning`: clean.
  Corrected an initial CTE test-syntax error before the passing run.
- Real browser + local Supabase + real Ollama end-to-end test: 26 checks passed,
  zero failures. Verified upload/consent and server validation, AI extraction,
  Postgres/file persistence, original-byte download, duplicate protection,
  cross-student/professor/anonymous isolation, reload, error retry, deletion,
  mobile layout, keyboard focus, and no unhandled browser errors.
- Test harness/evidence are outside Git at
  `/private/tmp/researchbridge-resume-e2e.JQ9DIn/` (`run.cjs`, `results.json`,
  desktop/mobile screenshots). Used synthetic files/accounts only and removed
  all temporary accounts, profiles, PDFs, and scan rows afterward. An initial
  browser selector collided with Next.js's route-announcement alert; it was
  corrected before the passing end-to-end run.
- Visually inspected desktop results and the 375px upload screen; both are
  within bounds. The synthetic scan also demonstrated why results require
  review: the model unnecessarily questioned a future graduation year.
- Default `npm run build` still fails in this environment with the existing
  Turbopack worker port-binding permission error. `next build --webpack` passed
  with the normal hosted frontend environment; résumé APIs are disabled there.
- `npm audit --omit=dev` reports the existing critical Next.js advisory
  GHSA-vcvr-r3jv-pc5j, not the new PDF parser. The earlier full audit also had
  six high development-dependency findings. No automatic audit fix was run.
- `git diff --check`: passed. No commits, pushes, hosted migrations, hosted
  résumé writes, or hosted environment-file edits were made.
- Stopped the temporary frontend and foreground Ollama server after testing.
  Local Supabase remains running; Ollama/model installation remains available
  for the next demo, without installing a login/background service.

**Future Changes:**

- This is a local demo, not a production-ready scanner. Real image-only or
  password-protected PDFs are not supported; add OCR deliberately later.
- Review/edit/confirmation persistence and research matching remain separate
  features. Treat extracted facts as unverified, not eligibility decisions.
- Before launch, patch dependency advisories, add stronger parser isolation,
  distributed queues/rate limits, representative accuracy/prompt-injection
  evaluations, account-deletion object cleanup, and a retention policy.
- Review the migration and choose authenticated inference hosting before
  enabling this feature for the live website. Storage and Postgres writes are
  non-atomic; cleanup failures require refresh/deletion and retry.

## 2026-10-04 — Student sign-up and email confirmation flow

**Changes Made:**

- Added student self-service sign-up at `/sign-up`: full name, email,
  password, and confirmation, with inline validation, focus on the first
  invalid field, a show-passwords toggle, and recoverable error messages.
  Professors are told their accounts come from the team; no role is chosen in
  the UI.
- Added `/auth/callback` for confirmation links. It signs the student in via
  supabase-js (implicit flow) and routes by profile role. Expired or reused
  links show a recovery screen with a resend form.
- Added a reusable resend-confirmation control with a 60-second cooldown that
  starts as soon as the "Check your email" screen appears. Hosted Supabase
  rejects repeat sends inside its own cooldown.
- Sign-in now links to sign-up and offers a resend when Supabase reports
  `email_not_confirmed`. Homepage **Get started** and the opportunities sign-in
  prompt now lead to sign-up.
- Added migration `20261004120000_student_self_signup_profiles.sql`: an
  `auth.users` trigger creates the `profiles` row when sign-up metadata has
  `self_signup: true`. The role is hardcoded to `student`; metadata is never
  read for the role. Users without the marker (dashboard "Add user") get no
  automatic profile, so existing professor provisioning is unchanged.
  Applied locally with `supabase migration up --local` (no reset).
- Local `config.toml`: email confirmations on (matches hosted defaults),
  minimum password length 8, and redirect allow-list set to
  `/auth/callback` on `127.0.0.1:3000` and `localhost:3000`. Restarted local
  Supabase to apply; it had no users at the time.
- Extracted the shared auth page layout and styles into
  `components/auth/AuthShell.tsx`; sign-in now uses it. Pure validation and
  error mapping live in `lib/auth/signup.ts`.
- Fixed a site-wide styling bug in `app/globals.css`: element resets were
  unlayered, so they overrode every Tailwind color, weight, size, underline,
  and cursor class on links, buttons, and inputs. For example, homepage CTAs
  rendered near-black text on dark green instead of white. Moved the resets
  into `@layer base`; compared before/after screenshots of the homepage,
  opportunities, sign-in, and professor pages.
- Updated `README.md` with the sign-up flow, local Mailpit testing, a hosted
  setup checklist, and the open-registration limitation.
- Files: `frontend/app/sign-up/page.tsx`, `frontend/app/auth/callback/page.tsx`,
  `frontend/app/sign-in/page.tsx`, `frontend/app/opportunities/page.tsx`,
  `frontend/app/globals.css`, `frontend/components/auth/AuthShell.tsx`,
  `frontend/components/auth/ResendConfirmation.tsx`,
  `frontend/components/auth/AuthNav.tsx`, `frontend/lib/auth/signup.ts`,
  `frontend/tests/signup.test.mjs`, `frontend/package.json` (`test:auth`
  script), `backend/supabase/migrations/20261004120000_student_self_signup_profiles.sql`,
  `backend/supabase/tests/verify_student_self_signup.sql`,
  `backend/supabase/config.toml`, `README.md`.

**Verification:**

- `supabase test db --local`: 65 assertions passed (11 new sign-up trigger
  tests, including role injection via metadata and the dashboard-user path).
  `supabase db lint --local --level warning`: no schema errors.
- `npm run test:auth`: 10 passed. `npm run test:resumes`: 10 passed.
- `eslint`: exit 0. `tsc --noEmit --incremental false`: passed.
- `npm run build` (default Turbopack): passed in this session.
- Real browser + local Supabase + Mailpit end-to-end run: 20 checks passed,
  zero failures. Covered validation, mobile layout at 375px, sign-up,
  trigger-created profile, the real emailed link, unconfirmed sign-in,
  resend and cooldown, expired-link recovery, already-signed-in handling,
  sign-out and password sign-in, duplicate email, direct-API role injection,
  and no unhandled browser errors. Separate regression check: a
  dashboard-style professor still gets no automatic profile and signs in to
  the posting page.
- The first run found two test-timing issues, not product bugs: a resend
  inside Supabase's 1-second local cooldown, and an expectation that a
  repeat sign-up would be hidden. This Supabase version returns
  `user_already_exists`, so the UI now points those users to sign in.
- Harness and screenshots are outside Git in this session's scratchpad.
  Synthetic accounts only; all were deleted afterward (0 users remain).
  Hosted Supabase was not touched.

**Future Changes:**

- Hosted rollout is not done: push the migration, set Site URL and redirect
  URLs, keep Confirm email on, set min password length 8, and configure
  custom SMTP. The built-in mailer only reaches team addresses.
- Open registration means anyone with an email can browse published
  opportunities. Decide whether to restrict sign-up to university domains
  with a server-side "before user created" auth hook.
- No password-reset flow exists yet; it is the natural next auth feature.
- No commits or pushes were made.

## 2026-10-04 — Same-day MVP release-readiness review

**Review Outcome:**

- Recommended an invite-only research-opportunity discovery pilot: homepage,
  sign-in/out and role-based navigation, professor creation/publishing, and
  authenticated student browsing/search/filtering. These are release candidates,
  not a certification of the hosted deployment.
- Reviewed the new student sign-up/profile trigger and confirmation/resend flow.
  Local tests pass, but hosted migration/email/redirect configuration was not
  verified. Hold public registration until the hosted rollout is tested; hiding
  the sign-up UI alone does not disable Supabase registration.
- Hold résumé upload/AI analysis, matching/applications/messaging, and draft
  management. Résumé API handlers already require local-demo mode and loopback
  Supabase; both demo flags should be absent/false in the deployed environment.
  Draft saving exists but there is still no reopening/publishing UI for drafts.
- Opportunity cards currently truncate descriptions and have no application or
  faculty-contact action. A useful pilot needs a clear manual next step and
  approved, real listings; do not advertise a completed application workflow.
- Existing profile SELECT policy allows every authenticated account to read
  profile names/roles/IDs. Revisit this broad visibility before public signup.

**Verification:**

- `npm run lint` and `tsc --noEmit --incremental false`: passed.
- `npm run test:auth`: 10 passed; `npm run test:resumes`: 10 passed.
- `supabase test db --local`: all 65 assertions passed, transaction rolled back.
- Default `npm run build` (Turbopack): passed in this session.
- `git diff --check`: passed.
- `npm audit --omit=dev`: one critical advisory against Next.js 16.3.4
  (GHSA-vcvr-r3jv-pc5j), fixed in 16.3.6. Reviewed the official advisory:
  exploitation requires attacker-controlled Node ImageResponse SVG content.
  No `next/og`/`ImageResponse` use was found in app/components/lib, so no
  applicable exploit path was identified; nevertheless recommend patching
  before launch. This check is not a complete vulnerability audit.
- Confirmed Supabase's official SMTP documentation requires custom SMTP for
  sending Auth email beyond project-team addresses. Hosted SMTP, redirect URLs,
  RLS state, and a production end-to-end workflow were not inspected/tested.
- No application, dependency, environment, or migration changes were made.
  This review's only edit is the required session entry in `Docs.md`; existing
  changes were preserved. No hosted writes, commits, pushes, or deployments.

**Required Before Release:**

- Patch/retest the Next.js dependency, freeze a reviewed release snapshot,
  review intended migrations, and keep résumé demo disabled in production.
- For an invite-only pilot, provision student/professor accounts through the
  team, disable hosted public registration, and align signup-related calls to
  action with that choice. These settings/UI edits have not been applied.
- Test the deployed hosted professor-publishes/student-browses flow, including
  anonymous denial, draft privacy, and protection against another user editing
  an opportunity. Keep a known-good code deployment available for rollback.

## 2026-10-04 — Invite-only release implementation and deploy decision

**Completed changes:**

- Added production gates for public signup, résumé UI/API, and draft saving in
  `frontend/lib/release.ts`, related pages/components, and a `/access` page.
  The production gates hold even when experimental public flags are set true.
- Added manual email links for pilot invitations and published opportunity
  questions addressed to TheResearchAmbassadors@wave.tulane.edu. These open
  an email draft; the visitor must send it. Opportunity cards show full
  descriptions, and the professor form asks for approved next steps.
- Patched Next.js and `eslint-config-next` from 16.3.4 to 16.3.8 in
  `frontend/package.json` and `frontend/package-lock.json`. Added
  `frontend/tests/release.test.mjs`, `release:check`, release notes in
  `README.md`, and example development flags in `frontend/.env.example`.
- Set local `backend/supabase/config.toml` to disable new signups globally.
  Email login remains enabled. Local CLI 2.104 mapped
  `auth.email.enable_signup=false` to `GOTRUE_EXTERNAL_EMAIL_ENABLED=false`,
  which disabled all email login during a smoke test; that setting was
  corrected to true. No hosted Supabase setting was changed.

**Checks and limits:**

- Frontend lint, type check, 10 auth tests, 10 résumé tests, 8 release tests,
  and optimized production build passed. `npm audit --omit=dev` found zero
  vulnerabilities after the patch. The full audit still lists six high
  advisories in development-only lint dependencies. `git diff --check` passed.
- Local pgTAP suite passed: 65 assertions. Browser smoke test confirmed
  production invitation links and résumé UI/API blocking, but the professor
  login flow failed while the local email provider was incorrectly disabled.
  The local config was fixed afterward; the user asked to stop using the
  temporary `run.cjs` harness, so a complete browser retest was not run.
- Public hosted Auth settings were read without mutation and still report
  `disable_signup=false`. The hosted project therefore permits registration
  directly through Auth even though the web signup page is gated. Production
  professor/student login, RLS, approved live listings, deployment, and email
  client delivery were not verified. No commit, push, or deploy was made.

**Before deployment:**

- Disable public signup in hosted Supabase Auth, verify the public settings
  changed, and confirm an existing invited user can still sign in.
- Review the intended migrations and stage a release snapshot that excludes
  unfinished résumé and self-signup features. Smoke-test professor publishing,
  student browsing, draft privacy, and mobile/email links against the deployed
  environment. Retain a rollback deployment.

## 2026-10-04 — Student email verification code

**Completed changes:**

- Confirmed signup and resend already address Supabase Auth messages to the
  student's entered email; `TheResearchAmbassadors@wave.tulane.edu` appears
  only in separate pilot-contact mailto links.
- Added a six-digit code entry and Supabase `verifyOtp` flow in
  `frontend/app/sign-up/StudentSignup.tsx`, plus `/verify-email` recovery in
  `frontend/app/verify-email/page.tsx` and a link from sign-in. Updated resend
  messaging in `frontend/components/auth/ResendConfirmation.tsx` and code
  validation/error helpers in `frontend/lib/auth/signup.ts`.
- Added local `backend/supabase/templates/confirm_signup.html` with Supabase's
  `{{ .Token }}` placeholder and wired it in `backend/supabase/config.toml`.
  Updated `README.md` with hosted SMTP and Confirm signup template steps.
  Public signup remains disabled in the production web app and local global
  Auth settings until a future launch explicitly enables it.

**Verification:**

- `npm run lint`, `npx tsc --noEmit --incremental false`, `npm run test:auth`
  (12 passing), `npm run build`, and `git diff --check` passed.
- Initial type check encountered four duplicate ignored Next-generated type
  files with ` 2.ts` suffixes. They were moved intact to
  `/private/tmp/rb-next-duplicate-types.HQ1nEQ`; source files were preserved.
  The clean type check and build then passed.
- Hosted Auth public settings still allow signup and require confirmation, but
  public settings do not expose SMTP configuration. No real email was sent or
  hosted template/settings changed. Delivery and end-to-end code verification
  remain unverified until custom SMTP, the hosted `{{ .Token }}` confirmation
  template, and a team-owned test inbox are available. No commit, push, or
  deployment was made.

## 2026-10-04 — Codebase rundown and review

**Review Outcome:**

- No implementation changes were made. This session's only edit is this
  `Docs.md` entry. A pasted three-phase release task flow was received without
  an accompanying request to execute it, so none of its actions were taken.
- Architecture: Next.js 16 client components talk directly to Supabase through
  one browser client using the public anon key. `AuthProvider` resolves the
  session and `profiles.role` for navigation and page guards only. Postgres
  RLS is the real authorization boundary. Release gates in
  `frontend/lib/release.ts` turn off signup, résumé, and draft UI in
  production builds.
- Findings worth acting on before or during the pilot:
  - Hosted Auth still allows public signup, and the existing RLS policy lets
    any signed-in user insert their own student profile. Together, anyone can
    register through the Auth API and read published listings. Disable hosted
    signup before launch, as earlier entries already note.
  - Every signed-in user can read every profile's id, name, and role. Narrow
    this policy before registration opens.
  - `profiles.id` and `opportunities.professor_id` foreign keys have no
    `on delete` behavior, so deleting an Auth user with a profile or listing
    fails until those rows are removed or the keys are changed.
  - Professors cannot list, edit, close, or reopen their own listings. Draft
    saving is hidden in production for that reason.
  - The student page loads all published listings and filters in the browser.
    This is fine for a pilot but needs server-side paging at larger volume.
  - No CI workflow exists under `.github/`. `frontend/temporary persistence/`
    and unused `public/*.svg` starter assets remain in the tree.
  - The unfinished résumé migration sits in the same migrations folder as
    release migrations, so a plain `supabase db push` would deploy it.

**Verification:**

- `npm run lint`: exit 0. `tsc --noEmit --incremental false`: exit 0.
- `npm run test:auth` 12 passed, `test:resumes` 10 passed, `test:release`
  8 passed. `npm audit --omit=dev`: 0 vulnerabilities.
- Not run: `supabase test db` (local Supabase was not running) and
  `npm run build`. No hosted settings were read or changed. No commits,
  pushes, or deployments.

**Future Changes:**

- Confirm whether to execute the pasted Phase 1–3 release task flow.
- Move or hold the résumé migration before any hosted `db push`, add a pull
  request CI workflow, disable hosted signup, and tighten the profiles read
  policy before opening registration.

## 2026-10-04 — Ship-readiness for professor posting and student browsing

**Completed changes:**

- Held the résumé feature out of the release database path. Moved
  `backend/supabase/migrations/20261003200000_student_resumes.sql` and
  `backend/supabase/tests/verify_student_resumes_rls.sql` into
  `backend/supabase/held/`, with `backend/supabase/held/README.md` explaining
  local use and how to release it later under a new timestamp. Both files were
  untracked, so no teammate history is affected.
- Marked that version as reverted in this machine's **local** migration
  history only (`supabase migration repair --status reverted 20261003200000
  --local`). The local résumé tables were left in place and no reset was run,
  because the local database holds one existing user account.
- Updated `README.md`: the release checklist now says hosted already has the
  needed migrations and not to run `supabase db push`. The résumé demo setup
  now applies the held migration locally with `psql`.
- No application code changed. Résumé UI and API remain gated off in
  production builds.

**Verification:**

- Hosted, read-only: `supabase migration list --linked` shows every migration
  through `20260926210414` applied; only the résumé and self-signup
  migrations are unapplied. Public Auth settings report `disable_signup=false`
  with the email provider on. Anonymous opportunity reads return an empty list.
  The `student_resumes` table does not exist on hosted.
- `supabase test db --local`: 46 assertions passed across the two remaining
  test files. `supabase db lint --local --level warning`: no schema errors.
- Local data-path check (scratchpad script, not the `run.cjs` harness, not a
  browser test): 18/18 passed. It covered professor role lookup, publishing
  with the form's exact payload, draft saving, spoofed `professor_id` denial,
  student browse query, draft privacy, normalization and combined filters,
  student publish/edit denial, another professor's edit/delete/draft-read
  denial, anonymous denial, and an unchanged title. Its three synthetic users
  and their rows were deleted afterward.
- `npm run release:check` passed: lint, type check, 12 auth, 10 résumé and
  8 release tests, `npm audit --omit=dev` with 0 vulnerabilities, and the
  production build.
- Production server smoke check on `127.0.0.1`: `/`, `/sign-in`,
  `/opportunities`, `/professor/opportunities/new`, and `/access` returned 200.
  `/sign-up` redirected to `/access`. `/student/resume` and
  `/api/student/resume` returned 404. The homepage shows "Request access".
- Not done: no browser click-through, no hosted writes, no commit, push, or
  deployment.

**Remaining before shipping (requires a person):**

- In hosted Supabase, turn off **Allow new users to sign up** while keeping the
  Email provider enabled. Then confirm `/auth/v1/settings` reports
  `disable_signup: true` and an existing account can still sign in.
- Provision real professor and student accounts with matching `profiles`
  rows. Publish faculty-approved listings only.
- Deploy with the hosted URL and anon key and no experimental flags. Then
  click through publish, browse, filters, the email link, and mobile width on
  the deployed site.
- Commit the release from a reviewed branch. No CI workflow exists yet.

## 2026-10-04 — Gap check against today's goal (sign-in, browsing, applications)

**Review outcome (no implementation changes):**

- Goal stated by the user: professors and students can sign in, students see
  professor posts, and professors see which students applied.
- Already working: professor and invited-student sign-in, professor
  publishing, and student browsing/filtering of published listings.
- Built but switched off in production: student self-signup with a six-digit
  email code. It needs custom SMTP, the hosted "Confirm signup" template, the
  self-signup migration pushed, and the production gate in
  `frontend/lib/release.ts` changed.
- Not built: applications. No table, no Apply button, no professor view of
  their own listings or applicants. Cards only open an email to the team.
- An attempted change to allow production signup and restrict profile reads
  was stopped before any file was edited.

**Proposed next work (not started):** applications table with RLS, a student
Apply button, a professor "My opportunities" page with applicants, a narrower
profiles read policy, and enabling student signup once hosted email works.

## 2026-10-04 — Applications and the admin/professor/student tiers

**Completed changes:**

- **Applications.** Migration
  `backend/supabase/migrations/20261004180000_opportunity_applications.sql`
  adds `applications` (one per student per opportunity, optional message up to
  1,000 characters). Students apply only to published postings, read and
  withdraw their own, and cannot edit. The owning professor reads applications
  to their postings. A trigger copies the applicant's name and account email,
  so the browser never supplies them. Profile reads are narrowed to the
  signed-in user's own row.
- **Admin tier.** Migration `20261004200000_admin_tier.sql` lets admins read all
  profiles, postings, and applications. It adds security-definer functions to
  list every account with its email, assign the student or professor role
  (creating a missing profile), and publish or close any posting. Admins
  cannot grant admin, change another admin, or change their own role in the
  app. Admins are appointed in the SQL Editor only.
- **Frontend.** Students get an Apply panel on each card
  (`frontend/components/opportunities/ApplyPanel.tsx`). Professors land on a
  new My opportunities page (`frontend/app/professor/opportunities/page.tsx`)
  that lists their postings and applicants. Admins land on
  `frontend/app/admin/page.tsx`, with People and Postings views, search,
  filters, role activation, and close/reopen. Data access lives in
  `frontend/lib/applications/applications.ts` and `frontend/lib/admin/admin.ts`.
  Role-specific page guards are generalized in
  `frontend/components/auth/RoleGate.tsx` and
  `frontend/components/layout/WorkspaceShell.tsx`. Navigation, role home
  routes, and pilot copy were updated.
- Shared components: `ApplicantList.tsx`, `StatusBadge.tsx`,
  `ProfessorPageShell.tsx`. The held résumé migration now uses
  `create or replace` for `is_student` so it stays compatible.
- `frontend/tsconfig.json`: enabled `allowImportingTsExtensions`, so the Node
  test runner can load library files that import other library files.
- New tests: `backend/supabase/tests/verify_applications_rls.sql` (25),
  `backend/supabase/tests/verify_admin_tier.sql` (24),
  `frontend/tests/applications.test.mjs` (8), and `frontend/tests/admin.test.mjs`
  (6). New `test:applications` and `test:admin` scripts are part of
  `release:check`.
- `README.md` documents the three tiers, appointing admins, activating
  accounts from `/admin`, and the release push.

**Verification:**

- `supabase test db --local`: 95 assertions passed across four files.
  `supabase db lint --local --level warning`: no schema errors.
- `npm run release:check` passed: lint, type check, auth 12, résumé 10,
  release 8, applications 8, and admin 6 tests, `npm audit --omit=dev`
  0 vulnerabilities, and the production build.
- Local data-path scripts in the session scratchpad (real app helpers, local
  Supabase, synthetic accounts deleted afterward): admin tier 16/16,
  applications 15/15, publish/browse 18/18.
- Production server smoke check: `/admin`, `/professor/opportunities`,
  `/professor/opportunities/new`, `/opportunities`, `/sign-in` returned 200.
- `supabase db push --dry-run` against hosted would push exactly the
  self-signup, applications, and admin-tier migrations. Nothing was pushed.
- Not done: browser click-through of the new UI, hosted push, appointing
  hosted admins, deployment, commit.
- Moved two stale duplicate generated files (`.next/types/* 2.ts`) to the
  session scratchpad so the type check could run.

**Remaining (requires a person):**

- Run `supabase db push` from `backend/`, then appoint admins in the SQL Editor.
- Deploy the frontend and click through all three roles on the live site.
- Professors still cannot edit or close their own postings. Admins can close
  them.

## 2026-10-08 — Student sign-up readiness and removal of "Request access"

**Completed changes:**

- Removed the request-access flow. Deleted `frontend/app/access/page.tsx` and
  every "Request access" / "Request an invitation" link from the homepage nav
  (`frontend/components/auth/AuthNav.tsx`), sign-in
  (`frontend/app/sign-in/page.tsx`), email-confirmation
  (`frontend/app/auth/callback/page.tsx`) and the signed-out opportunities
  panel (`frontend/app/opportunities/page.tsx`). With sign-up closed, the
  homepage's primary nav action is **Sign in** and auth pages say accounts are
  set up by the team.
- `frontend/app/sign-up/page.tsx` now redirects to `/sign-in` while the
  production gate is closed. `frontend/next.config.ts` adds a temporary (307)
  redirect from `/access` to `/sign-in` for old links. Nothing points to `/access`.
- `frontend/lib/release.ts`: `pilotEmailHref` now only builds opportunity
  question emails (title required); the generic invitation email is gone.
  `frontend/tests/release.test.mjs` updated (9 tests).
- **Public sign-up was not enabled.** `publicSignupEnabled()` still returns
  false in production because the hosted email setup failed verification
  (below). Résumé upload remains production-disabled (unchanged).
- Updated the sign-up reference text and hosted checklist in this file.

**Verification — hosted Supabase (read-only settings, real test sign-ups):**

- `supabase migration list --linked`: all 9 migrations applied on hosted,
  including the self-signup trigger, applications, and admin tier.
- `/auth/v1/settings`: `disable_signup: false`, `mailer_autoconfirm: false`.
- Two fresh disposable inboxes (mail.tm) were registered with the same
  `signUp` call the page makes, including `role: "admin"` in the metadata.
  Email arrived within 5 s at the address entered, but from Supabase's built-in
  sender with the **default link-only template**. No six-digit code is
  sent, so `verifyOtp` failed. The link's redirect fell back to
  `researchbridge-mason-mitchells-projects.vercel.app`; the requested
  `https://researchbridge-omega.vercel.app/auth/callback` is not allow-listed.
- Confirmed the second test account through its emailed link and ran checks as
  that signed-in student on hosted: 9/9 passed. Profile created as `student`
  despite `role: "admin"` metadata. Updating own role to professor/admin,
  inserting a professor profile, `admin_set_user_role`, and `admin_list_users`
  were all rejected (42501). No other profiles are readable. Only published
  opportunities are returned (1 row).

**Verification — deployed site (read-only HTTP, before this change):**

- `https://researchbridge-omega.vercel.app` is deployed at `34795fb` (current
  `main`). `/sign-up` → 307 `/access`; homepage shows "Request access";
  `/student/resume` 404. This session's changes are **not deployed**.

**Verification — local only:**

- `npm run lint` and `tsc --noEmit --incremental false` passed (after moving
  stale `.next/dev/types` from an old dev session to the session scratchpad and
  running `next typegen`). Tests: auth 12, résumé 10, release 9,
  applications 8, admin 6, all passing. `npm run build` passed.
- `npm audit --omit=dev` **fails**: two new high advisories in transitive
  dependencies, `sharp` (<0.35.5, GHSA-wq5f-xc86-pv6w) and `source-map-js`
  (GHSA-68fv-2mgg-jv7q). The lockfile was not changed in this session, so
  `release:check` currently stops at the audit step.
- `next start` smoke test: `/sign-up` and `/access` → 307 `/sign-in`; `/`,
  `/sign-in`, `/verify-email`, `/opportunities`, `/auth/callback` 200; résumé
  page and API 404. Headless Chrome with emulated 375px and 768px viewports:
  no horizontal overflow, no request-access text or `/access` links, logical
  tab order with visible focus on home and sign-in.
- Not run: local `supabase test db` (no SQL changed). Existing-account sign-in
  was not exercised end to end (no team credentials used); its code path is
  unchanged apart from the footer text.

**Required before opening student sign-up (hosted settings, needs a person):**

1. Authentication → Emails → SMTP Settings: configure a real provider and a
   verified sender.
2. Authentication → Email Templates → Confirm signup: include `{{ .Token }}`
   (for example, use `backend/supabase/templates/confirm_signup.html`). Keep
   email OTP length 6 and expiry 3600 s.
3. Authentication → URL Configuration: Site URL
   `https://researchbridge-omega.vercel.app`; add
   `https://researchbridge-omega.vercel.app/auth/callback` to Redirect URLs.
4. Keep Confirm email on; set minimum password length 8 (not visible publicly,
   so unverified).
5. Re-run the fresh-inbox check, then change `publicSignupEnabled()` for
   production in a reviewed PR and deploy.

**Other follow-ups:**

- Decide now whether to set hosted **Allow new users to sign up** off until
  step 5. It is currently on, so anyone can register through the Auth API and,
  after clicking the emailed link, browse published listings as a student.
- Delete the two hosted test accounts: `rb-signup-b588d494@maxxspace.com`
  (unconfirmed) and `rb-signup-d61b5a81@maxxspace.com` (confirmed, id
  `90538e66-0955-45a3-9fa2-ba2962207fc1`). Delete each `profiles` row first,
  then the Auth user (the foreign key has no cascade).
- Patch `sharp` and `source-map-js` in a separate dependency change.
- `frontend/.env.example` was deleted in `34795fb` but this file still tells
  readers to copy it.
- No commits, pushes, deployments, or hosted setting changes were made.

## 2026-10-23 — Professor form: learning outcomes, hours, compensation, duties

**Completed changes:**

- Reviewer request: the professor posting form now asks for **learning
  outcomes**, **time commitment** (hours per week, a single number or a range),
  **compensation** (Yes/No; if Yes, a dollar amount and whether it is per hour,
  per semester, or a one-time total), and **expected duties and skills**. All
  four are required for new postings. Students see them on each listing card,
  and search now also matches learning outcomes and duties.
- Migration `backend/supabase/migrations/20261023120000_opportunity_details.sql`
  adds `learning_outcomes`, `weekly_hours_min`, `weekly_hours_max`, `is_paid`,
  `pay_amount` (`numeric(9,2)`), `pay_period` (new enum
  `compensation_period`: `hour`, `semester`, `total`), and `duties_and_skills`.
  Check constraints: text 20–1,500 characters; hours 1–40 with an optional
  maximum not below the minimum; a paid listing must have an amount
  ($0.01–$100,000) and a period, and an unpaid or unanswered one has neither.
  RLS is unchanged (professors still write only their own rows).
- **Design decision:** the columns are nullable and "required" is enforced by
  the form, not the database. Existing hosted listings have no values, and a
  `NOT VALID` check would still run when an admin closes one of them. Old
  listings show "Not listed" for hours and compensation and hide the empty
  text sections.
- **Design decision:** compensation stores a pay period with the amount,
  because "$15" and "$3,000" mean different things to a student. Drop or
  rename the period options if reviewers prefer.
- Shared validation and display labels live in
  `frontend/lib/opportunities/details.ts`. Updated
  `frontend/app/professor/opportunities/new/page.tsx` (fields, validation,
  error summary, insert, confirmation), `frontend/lib/opportunities/published.ts`
  (columns, normalization, search text),
  `frontend/components/opportunities/OpportunityCard.tsx`, and the search hint in
  `frontend/components/opportunities/OpportunityFilters.tsx`.
- Tests: `backend/supabase/tests/verify_opportunity_details.sql` (21 assertions)
  and `frontend/tests/opportunity-details.test.mjs` (5 tests, new
  `test:opportunities` script, added to `release:check`).

**Verification (local only; nothing deployed or pushed to hosted):**

- Applied the migration locally with `supabase migration up --local` (no
  reset). `supabase test db --local`: 116 assertions across 5 files passed.
  `supabase db lint --local --level warning`: no schema errors.
- `npm run lint`, `tsc --noEmit --incremental false`, and all unit tests
  passed: auth 12, résumé 10, release 9, applications 8, admin 6, opportunity
  details 5. `npm run build` passed.
- Browser workflow against local Supabase (headless Chrome over DevTools,
  synthetic professor and student, deleted afterward): 32/32 checks passed.
  Covered the empty-submit error summary and its links, focus on the first
  invalid field, the paid radio group by keyboard (Space and arrow keys),
  pay fields shown only for paid positions, hours-range and amount errors,
  publishing, the saved database row, the confirmation summary, the student
  card, search on new text, and no horizontal overflow at 375px.
- `supabase db push --dry-run` (read-only): hosted would receive only this
  migration.
- **`npm audit --omit=dev` fails** with 3 advisories, including a new
  **critical** one in `next` 16.3.8 (GHSA-2464-fhr4-w9xw, unauthenticated RCE
  in the Image Optimization API with SVGs; also GHSA-673q-mjm6-r5xr and
  GHSA-p3m5-59mp-jv5r). The fix is `next` 16.4.2. The production site runs the
  affected version. `sharp` and `source-map-js` advisories remain from
  2026-10-08. The lockfile was not changed in this session.

**Release order (needs a person):**

1. `supabase db push` from `backend/` **before** deploying this frontend. The
   student page now requests the new columns, so deploying first would break
   browsing until the migration lands.
2. Deploy, then publish a test listing on the live site and view it as a
   student.

**Follow-ups:**

- Upgrade `next` to 16.4.2 (and run `npm audit fix` for `sharp` and
  `source-map-js`) in a separate, reviewed change, soon.
- Professors still cannot edit their postings, so listings published before
  this change cannot gain the new details except through SQL. Consider an edit
  flow, or ask those professors to re-post.
- Possible next step: a "Paid only" filter and an hours filter on the student
  page, now that the data is structured.
- No commits, pushes, deployments, or hosted setting changes were made.

## 2026-10-23 — Security hotfix: Next.js 16.4.2, sharp, source-map-js

**Completed changes** (branch `fix/next-16.4.2-security`, built in a separate
worktree from `main` at `9847d40` so the uncommitted opportunity-details work
stays out of this change):

- `frontend/package.json`: `next` and `eslint-config-next` 16.3.8 → 16.4.2
  (exact pins, as before).
- `frontend/package-lock.json`: `sharp` 0.35.4 → 0.35.5 (required by
  `next@16.4.2`) with its `@img/*` platform packages and libvips 1.3.3 → 1.3.4;
  `source-map-js` 1.2.1 → 1.2.2 via `npm update source-map-js` (in range).
  No other package versions changed. `npm audit fix --force` was not used.

**Advisories addressed (production dependencies):**

- `next`: GHSA-2464-fhr4-w9xw (critical, unauthenticated RCE in the Image
  Optimization API with SVGs), GHSA-673q-mjm6-r5xr (RCE in `use cache`
  functions returning typed arrays), GHSA-p3m5-59mp-jv5r (Server Actions DoS).
- `sharp`: GHSA-wq5f-xc86-pv6w (high, librsvg CVE-2026-96889).
- `source-map-js`: GHSA-68fv-2mgg-jv7q (high, event-loop DoS).

**Verification (local; not deployed):**

- Before: `npm audit --omit=dev` 3 findings (1 critical, 2 high); full audit
  9 (1 critical, 8 high). After: `npm audit --omit=dev` **0 vulnerabilities**;
  full audit 6 high, all in the dev-only ESLint chain
  (`eslint-config-next`, `@next/eslint-plugin-next`, `fast-glob`,
  `micromatch`, `braces`, `brace-expansion`), unchanged from before. npm's
  suggested fix for those downgrades `eslint-config-next` to 14.x, so it was
  not applied.
- `npm ci` from the new lockfile, then `npm run release:check`: exit 0 (lint,
  type check, auth 12, résumé 10, release 9, applications 8, admin 6 tests,
  audit, production build on Next.js 16.4.2).
- Pre-existing gap found: on a fresh checkout, `release:check` fails its type
  check (4 errors) until `next typegen` or a build has generated
  `next-env.d.ts` and `.next/types`. Reproduced on unmodified `main` with
  16.3.8, so it is not caused by this upgrade. Not changed here.
- `next start` smoke test (hosted Supabase settings): `/`, `/opportunities`,
  `/sign-in`, `/professor/opportunities`, `/professor/opportunities/new`,
  `/admin`, `/verify-email`, `/auth/callback` 200; `/sign-up` and `/access`
  307 to `/sign-in`; résumé page and API 404. The image optimizer served the
  logo (200 PNG, via the upgraded `sharp`) and refused an SVG (400).
- Headless Chrome on the six main routes at 1280px and 375px: client reports
  `window.next.version` 16.4.2, no uncaught exceptions, no horizontal
  overflow.
- Signed-in flows on a 16.4.2 build pointed at **local** Supabase (synthetic
  professor, student, and admin; deleted afterward): 13/13 checks passed —
  professor publishes, student browses and applies, professor sees the
  applicant, admin sees People and Postings and closes the posting, closed
  posting is hidden from students.
- Production before the change: `researchbridge-omega.vercel.app` serves
  `9847d40` and its client chunk contains `window.next={version:"16.3.8"`.

**Rollback plan:**

- Fastest: in Vercel, promote the previous production deployment
  (`9847d40`, `researchbridge-96yr3ilvk`) with Instant Rollback.
- In Git: `git revert -m 1 <merge commit>` on a branch, open a PR, and merge.
  This restores 16.3.8 and the critical advisory, so only roll back for a
  confirmed regression, and re-apply a fix promptly.
- No database migrations or environment variables are involved.

**After deployment (needs approval first):**

- Confirm the live client chunk reports `window.next={version:"16.4.2"`, then
  sign in as a professor, student, and admin and repeat the main flows.
- No merge, deployment, or hosted setting changes were made.


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

**Verifying the RLS policies and constraints:** `backend/supabase/tests/verify_opportunities_rls.sql` proves the required access rules and frontend-aligned constraints. `verify_student_self_signup.sql` proves the sign-up trigger only ever creates student profiles. `verify_applications_rls.sql` proves who can apply and who can see applications. `verify_admin_tier.sql` proves what admins can and cannot do. `verify_opportunity_details.sql` proves the learning-outcome, hours, compensation, and duties constraints. Each runs in a transaction that's rolled back at the end, so it's safe to run repeatedly:

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

- **Student self-sign-up at `/sign-up` is built but closed in production** until
  the hosted email setup below is done; production redirects `/sign-up` to
  `/sign-in`. The old `/access` request page was removed (`/access` also
  redirects to `/sign-in`). Until sign-up opens, the team creates accounts.

- **The team can still create a student by hand** (for example, for a demo account):
  1. In the Supabase dashboard, go to **Authentication → Users → Add user** and enter an email and password. Check auto-confirm so they can sign in right away.
  2. Copy the new user's **User UID**, then run this in the **SQL Editor**:
     ```SQL

     insert into public.profiles (id, full_name, role)
     values ('<user-uid>', '<full name>', 'student');

     ```

**Student sign-up and email confirmation**

Built and tested, but **closed in production** until the hosted checklist below
passes. Set `NEXT_PUBLIC_ENABLE_SELF_SIGNUP=true` only for local testing and
explicitly enable local Auth signup for that session. `publicSignupEnabled()` in
`frontend/lib/release.ts` returns false in production builds, so production
redirects `/sign-up` to `/sign-in`; opening sign-up means changing that gate in
a reviewed pull request after the checklist passes.

- **The flow:**
  1. A student fills in name, email, and password at `/sign-up` (linked from **Get started** and the sign-in page when development signup is enabled).
  2. Supabase Auth creates the `auth.users` row and emails a six-digit code to the **email the student entered**. The page asks for that code and offers a resend button with a 60-second cooldown.
  3. The student enters the code. The browser calls Supabase `verifyOtp` with that email, token, and `type: 'email'`, then routes the verified student to `/opportunities`.
  4. If the page is closed before verification, open `/verify-email`, enter the same email and code, and continue. Signing in before confirming offers a resend control. `/auth/callback` remains for previously issued links and other link-based Auth responses.

The Research Ambassadors mailbox is only for opportunity questions. It is never passed to Supabase as the verification recipient. The
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

- **Hosted signup checklist (status checked 2026-10-08).** `config.toml` only controls the local stack. Before opening registration, a team member must do these in the hosted project, then revise the production signup gate:
  1. ✅ Done: migration `20261004120000` is applied on hosted and verified to create only `student` profiles.
  2. **Authentication → Sign In / Providers → Email:** keep **Confirm email** on and set the minimum password length to 8.
  3. **Authentication → URL Configuration:** set **Site URL** to the deployed site, and add `https://<your-domain>/auth/callback` and `http://localhost:3000/auth/callback` to **Redirect URLs**.
  4. **Authentication → Emails → SMTP Settings:** configure and verify a real email provider. Supabase's built-in email service only delivers to the project team's own addresses and has a very low hourly limit, so student codes will not arrive without this. Set a verified sender address; the recipient comes from the student signup form.
  5. **Authentication → Email Templates → Confirm signup:** use a code template containing `{{ .Token }}` (not only `{{ .ConfirmationURL }}`). For example: `<p>Your ResearchBridge code: {{ .Token }}</p>`. Match the six-digit code length and one-hour expiry in Auth settings. The local template file does not update the hosted project automatically.
  6. Test signup and resend with a **team-owned test student inbox**, enter the code on `/sign-up`, and check that the verified student reaches `/opportunities`.

  As of 2026-10-08, steps 3–5 are **not done** on hosted: the confirmation email
  is Supabase's default link-only template from `noreply@mail.app.supabase.io`,
  and its link returns to `researchbridge-mason-mitchells-projects.vercel.app`
  rather than `https://researchbridge-omega.vercel.app/auth/callback`. Hosted
  Auth also still reports `disable_signup: false`, so the Auth API accepts
  registrations even though the web page is closed. The built-in sender did
  deliver to a non-team test address in that check, but it is rate-limited and
  not meant for production, so custom SMTP is still required.

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

### To-Do

1. **Add professor side logic** Learning outcomes, Time commitment, Compensation(Y/N), Expected duties/requirements
   — built and tested locally on 2026-10-23; push the migration, then deploy.
2. **Set up Resend for sign-up and emails.** Use Resend as the custom SMTP
  provider in hosted Supabase (**Authentication → Emails → SMTP Settings**) with
  a verified sending domain. Then finish the rest of the hosted sign-up
  checklist above: the `{{ .Token }}` "Confirm signup" template, Site URL, and
  redirect URLs. Re-test with a fresh inbox before opening the production
  sign-up gate.
3. **UI changes.**
4. **Finish résumé scanning logic.** The feature is still local-only and held
  out of hosted migrations (see `backend/supabase/held/README.md` and the
  "Before production" notes in **Local AI résumé demo**).

## 2026-10-24 — Consolidate and verify changes for pushing

**Completed changes:**

- Fetched `origin` and checked branch ancestry. The older schema and frontend
  branches were already included in `main`; only
  `fix/next-16.4.2-security` needed integrating with the opportunity-details work.
- Created `codex/push-ready-opportunity-details` from `main` and committed the
  existing opportunity form, card, search, validation, migration, and tests as
  `97d924d`. Merged security commit `ee35e10`, preserving both session entries
  when resolving the `Docs.md` conflict. Local `main` remains unchanged so the
  combined branch can follow the README's push-and-PR workflow.
- Integrated `frontend/package.json` and `frontend/package-lock.json`: Next.js
  and eslint-config-next 16.4.2, sharp 0.35.5, and source-map-js 1.2.2, while
  retaining the opportunity test script and release gate.
- Fixed the documented fresh-checkout release-check failure by generating
  Next.js declarations with `next typegen` before `tsc` in
  `frontend/package.json`. Read the installed Next.js TypeScript/CLI guides
  before changing the check command.
- Updated `README.md` with the complete check sequence, migration-before-deploy
  requirement, and the frontend rollback approach (retain the additive columns).
  This entry records the review and verification; no additional feature code
  was introduced in this session.

**Verification:**

- `npm ci --no-audit --no-fund`: passed with the merged lockfile.
- `npm run release:check`: passed, including lint, route type generation,
  TypeScript, 50 unit tests (auth 12, résumé 10, release 9, applications 8,
  admin 6, opportunity details 5), runtime audit, and the default Turbopack
  production build on Next.js 16.4.2. The first sandboxed attempt reached
  audit but could not resolve the registry; the subsequent complete run with
  network access exited successfully.
- Fresh-source-copy check without `.next` or `next-env.d.ts`:
  `next typegen` followed by `tsc --noEmit --incremental false` passed.
- Started Docker Desktop and confirmed local Supabase was running. No database
  reset was used. `supabase test db --local`: all 116 assertions in five files
  passed. `supabase db lint --local --level warning`: no schema errors.
- `npm audit --omit=dev`: zero vulnerabilities. Full `npm audit --json`:
  two high development-only findings, in transitive `brace-expansion`
  (1.1.18 and 5.0.9) and `zod` (4.5.4) under ESLint tooling. They are absent
  from the runtime audit; the remaining risk is denial of service during
  development/tooling use. These still require a dependency follow-up.
- A targeted `npm update brace-expansion zod --dry-run --ignore-scripts
  --no-audit --no-fund` failed because npm's remote-package fetch policy refused
  an optional Tailwind tarball. No update was applied and the security branch's
  lockfile was preserved; no policy override or forced downgrade was used.
- `git diff --check`: passed after resolving the documentation conflict.
  Browser and hosted end-to-end flows were not rerun; the earlier entries
  record those separate checks. No hosted database/settings changes,
  deployments, or pushes were made. Docker/local Supabase remain running.

**Remaining release steps:**

- Push the combined branch and open a PR for teammate review before merging
  into `main`, per `README.md`.
- Apply `20261023120000_opportunity_details.sql` to hosted Supabase before
  deploying this frontend. The hosted migration state was not rechecked in
  this session. After deployment, verify professor posting and student browsing
  together on the live site.
- Resolve the two development-only dependency advisories in a focused follow-up.

## 2026-10-24 — Verify and prepare the requested GitHub merge

**Completed work:**

- The user requested merging the pushed changes into `main`. Refreshed
  `origin` and confirmed `codex/push-ready-opportunity-details` matches the
  previously tested `e542b4f`; `origin/main` has no divergent commits.
- Created [PR #6](https://github.com/masonmemelord/ResearchBridge/pull/6)
  to merge the combined opportunity-details and security changes into `main`.
  GitHub reports it mergeable with a clean merge state; the Vercel deployment
  and preview-comment checks passed. Supabase Preview was skipped.
- `supabase db push --dry-run`: remote database is up to date. The migration
  prerequisite for deploying the new frontend is satisfied; no database
  migrations or hosted settings were changed in this session.
- The only repository file changed in this merge session is `Docs.md`.
  Application code and dependency versions remain identical to the verified
  release. PR #6 records the subsequent GitHub merge and deployment outcome.

**Verification and follow-ups:**

- `git diff --exit-code e542b4f origin/codex/push-ready-opportunity-details`
  and `git diff --check origin/main...origin/codex/push-ready-opportunity-details`:
  passed before this documentation update.
- Application tests were not repeated because there are no new application
  changes. The preceding session records the passing release check, 50 unit
  tests, 116 database assertions, schema lint, and fresh-checkout type check.
- After merging, confirm the production deployment and smoke-test professor
  posting and student browsing. Two development-only dependency advisories
  remain as documented above; the verified runtime audit is clean.

## 2026-10-24 — Post-merge status and next priorities

**Review outcome:**

- GitHub reports a successful Vercel deployment for merge commit `6008853`.
  The Supabase check on that commit also succeeded. Local `main` was synced
  and clean when inspected. No application changes were made in this review;
  the only file updated is this session log, `Docs.md`.
- Next: smoke-test the deployed professor-to-student workflow, including the
  new opportunity details, an application, and professor applicant visibility.
  Successful deployment checks do not verify those signed-in flows.
- Then finish the existing student email/signup backlog: hosted SMTP, code
  template, callback URLs, and fresh-inbox verification before opening the
  production signup gate. Previously documented hosted settings need to be
  rechecked rather than assumed current.
- Follow with the documented development-only dependency advisories and
  automated PR quality checks. Professor posting edits and targeted UI polish
  are useful subsequent product work; hosted résumé scanning remains separate.

**Verification:**

- `git status --short --branch`: local `main` matched `origin/main` with no
  pre-existing changes.
- GitHub commit status API for `6008853`: Vercel `success`; check-runs API:
  Supabase Preview `success`.
- Read `README.md` and recent `Docs.md` entries. Application tests and live
  signed-in browser flows were not rerun because this was a status/priorities
  review. No commits, pushes, deployments, or hosted settings changes were made.

## 2026-10-24 — Professor opportunity editing

**Completed changes:**

- Added **Edit opportunity** to each professor listing and the route
  `frontend/app/professor/opportunities/[id]/edit/page.tsx`. Created branch
  `codex/professor-opportunity-editing`, preserving the preceding uncommitted
  documentation entry. Domain/email setup remains deferred while the user
  waits for their club lead to purchase the domain.
- Moved the existing create form into
  `frontend/components/professor/OpportunityEditor.tsx` and its types,
  validation, and explicit write-field allowlist into
  `frontend/lib/opportunities/form.ts`. The new-posting page is now a small
  wrapper around the shared editor. Create and edit use identical validation;
  duration and class-year values are checked against the supported options.
- Added `frontend/components/professor/EditOpportunityWorkspace.tsx` and
  `frontend/lib/opportunities/editing.ts`: owner-filtered loading, prefilled
  fields, retry/unavailable states, authenticated saves, and atomic
  `updated_at` matching. Stale updates show a recoverable conflict rather than
  overwriting newer changes. Reloading the latest version confirms before
  discarding local edits.
- Edits update the same opportunity ID and never write its owner, status,
  timestamps, or applications. Existing RLS enforces professor ownership and
  role on the server/database. Published, closed, and draft statuses are
  preserved, including when an admin changes status while an editor is open.
  No new database migration, dependency, environment variable, or domain is
  required. Existing opportunity-details columns must already be present.
- Added saving/duplicate-submit protection, confirmation focus, network-error
  recovery, a Cancel discard confirmation, and browser unload warnings for
  unsaved entries. Older listings explain which new details must be completed
  before saving. Published edits appear when students refresh their listings.
- Added `frontend/tests/opportunity-editing.test.mjs` (9 tests) and
  `backend/supabase/tests/verify_opportunity_edits.sql` (12 assertions).
  Updated `frontend/package.json` so `test:opportunities` runs both opportunity
  suites. Updated `README.md` with the edit workflow and concurrency behavior.
  The dashboard change is in `frontend/app/professor/opportunities/page.tsx`.

**Verification:**

- `npm run release:check`: passed (lint, route generation, TypeScript, 59 unit
  tests, runtime audit with zero vulnerabilities, and default Turbopack
  production build). The new dynamic edit route is included in build output.
- `supabase test db --local`: all 128 assertions in six files passed.
  `supabase db lint --local --level warning`: no schema errors. New checks
  cover editing legacy details, ownership restrictions, preservation of
  applications/status, database validation, and stale version rejection.
- Real headless Chrome + local Supabase: all 27 browser/integration checks
  passed. Covered dashboard discovery, prefill, paid-to-unpaid editing,
  saved-row identity and applicant preservation, focus, legacy completion,
  closed/draft privacy, conflicts/reload, blocked-network save/retry, Cancel
  confirmation, another professor's URL/direct write, student visibility and
  rejected writes, malformed URLs, and new-opportunity creation regression.
- Checked the editor at 375px with no horizontal overflow and visually
  inspected the full mobile screenshot. No uncaught browser exceptions.
  Harness and evidence: `/private/tmp/researchbridge-edit-e2e/` (`run.cjs`,
  `results.json`, `edit-mobile.png`). Synthetic accounts, profiles,
  opportunities, and applications were removed afterward.
- `git diff --check`: passed. Stopped the temporary local frontend and test
  Chrome process. Existing Docker/local Supabase remain available. Hosted
  configuration, hosted data, and local environment files were unchanged.
  No commits, pushes, PRs, or deployments were made in this feature session.

**Follow-ups and limits:**

- Review and commit the feature branch before pushing/opening a PR. Perform
  the live professor/student smoke test after deployment.
- Editing preserves status; professor publish/close/reopen controls remain a
  separate product improvement. Older listings must complete the new required
  detail fields before edits can save.
- Unsaved-change prompts cover Cancel, conflict reload, and browser unload;
  other client-side navigation does not yet use a shared global navigation guard.
- The previously documented two development-only dependency advisories remain
  outside this feature; the runtime release audit is clean.

## 2026-11-08 — Review Resend setup for public registration

**Review outcome:**

- Reviewed the current Supabase password sign-in, student signup/code verification,
  release gate, local confirmation template, and earlier email setup backlog.
  Checked current official Resend and Supabase documentation for domain verification,
  custom SMTP credentials, redirect URLs, email templates, and sending limits.
- Provided setup guidance for a verified sending subdomain, Resend SMTP in hosted
  Supabase, production URLs, the `{{ .Token }}` confirmation template, capacity
  planning, and fresh-inbox registration/sign-in verification.
- Identified that `frontend/lib/release.ts` hard-disables public signup in production
  even when `NEXT_PUBLIC_ENABLE_SELF_SIGNUP=true`; the matching release test also
  enforces this. Connecting SMTP alone will not expose public registration.
- No application implementation changes were made. Only `Docs.md` was updated;
  existing uncommitted work was preserved. No DNS, hosted settings, credentials,
  deployments, commits, or pushes were changed.

**Verification and follow-ups:**

- Read the relevant source files and `frontend/tests/release.test.mjs`; application
  tests were not run because this session only reviewed configuration and guidance.
- Hosted settings and the user's newly connected domain were not inspected, so
  actual delivery remains unverified. Configure and verify SMTP, then deliberately
  update/test the production signup gate and enable hosted registration before launch.
- Check both Supabase email rate limits and Resend account quotas for the expected
  launch volume; ordinary existing-account password sign-in does not send an email.

## 2026-11-08 — Confirm Resend .org domain compatibility

- Confirmed that a `.org` domain can be used for Resend sending after DNS
  verification; reviewed the official verified-domain documentation.
- Only `Docs.md` changed. No implementation or hosted configuration changes.
  Application tests were not run because this was an informational follow-up.
- Domain verification and actual email delivery still need to be completed.

## 2026-11-08 — Student sign-up architecture review and plan

**Review outcome (no application code or hosted settings changed):**

- Wrote `docs/student-signup-auth.md`: responsibilities (Next.js, Supabase
  Auth, Resend, Postgres), a sequence diagram of registration, code
  verification, profile provisioning, and sign-in, edge-case behavior, hosted
  settings, DNS, environment variables, launch limits, alternatives, and a
  file-level implementation and rollout plan.
- Recommendation: keep the current design (browser supabase-js, email +
  password, six-digit code, trigger-created student profile, RLS). Codes
  survive university mail scanners that pre-open links. Close three
  database gaps before launch: (G1) any signed-in account, even without a
  profile, can read published listings; (G2) users may insert their own
  student profile, which no app code uses; (G3) any email domain can
  self-register. Proposed fixes: require a profile for listing reads, drop the
  self-insert policy, and add a Before User Created hook that limits
  self-sign-ups to approved domains (assumed `tulane.edu`). Make the
  production gate honor `NEXT_PUBLIC_ENABLE_SELF_SIGNUP=true`.
- **Blocker:** untracked duplicate files with a ` 2` suffix, including
  `backend/supabase/migrations/20261023120000_opportunity_details 2.sql`.
  `supabase migration list --linked` shows it as a second, pending migration
  with an already-applied version, so the next `supabase db push` would try
  to apply it. Not removed; the files are not from this session.
- Minor bug noted: the resend countdown says "Send another link in Ns"
  instead of "code" (`frontend/components/auth/ResendConfirmation.tsx`).

**Verification (read-only):**

- Read `AGENTS.md`, `README.md`, recent `Docs.md` entries, the auth pages,
  helpers, release gate and tests, all migrations, database tests, local
  `config.toml`, and the installed Next.js 16.4.2 `authentication.md` and
  `environment-variables.md` guides.
- Hosted Auth public settings: `disable_signup: false`,
  `mailer_autoconfirm: false`, email provider on. The Auth API already
  accepts registrations from any address.
- `supabase migration list --linked`: all 10 migrations applied; the duplicate
  file appears as pending.
- Live site `https://www.ntcresearchnetwork.org`: apex redirects to `www`;
  `/sign-up` 307 to `/sign-in`; main routes 200. The old
  `researchbridge-omega.vercel.app` alias now returns 404.
- DNS: Resend DKIM (`resend._domainkey`) present; `send` CNAME to
  `send.forge.rmta.net` supplies SPF and MX; **no DMARC record**. Whether these
  match the Resend dashboard's expected values was not confirmed.
- Checked current Supabase (rate limits, SMTP, templates, Before User Created
  hook, CAPTCHA) and Resend (quotas, SMTP setup) documentation.
- Not verified: SMTP configuration, confirmation template, OTP settings, Site
  URL and redirect URLs, rate limits, Resend domain status and plan, Vercel
  environment variables, and actual email delivery. No test sign-up was made.
  No tests were run because no code changed. Local Supabase was not running and
  was not started.

**Decisions needed / next steps:**

- Choose allowed sign-up domains, the Resend plan for launch week, and whether
  to turn hosted "Allow new users to sign up" off until launch (recommended).
- Remove the duplicate ` 2` files, then implement Step 1 of the plan as one PR.
- No commits, pushes, deployments, DNS, or hosted setting changes were made.
  Existing uncommitted work on `codex/professor-opportunity-editing` was left
  untouched.

## 2026-11-08 — Review signup architecture proposal for bypasses

**Review outcome:**

- Reviewed `docs/student-signup-auth.md`, the profile provisioning and RLS
  migrations, the admin provisioning RPC, and official Supabase hook/user docs.
- The proposed domain hook checks only requests marked `self_signup=true`.
  That marker is client-controlled; omitting it would still allow non-approved
  Auth registrations and email sends. Dropping profile inserts and requiring a
  profile would restrict application access, but would not prevent those Auth
  registrations. A trusted provisioning exception needs separate design and tests.
- Flagged the proposed hook rollback: close hosted signup before disabling a
  domain restriction, otherwise registration reopens without that restriction.
- University-domain-only registration is a product decision rather than a Resend
  requirement; the approved domain list remains unconfirmed by the user.
- Compared all four untracked ` 2` copies with their original files: all are
  byte-identical. No duplicates were removed and no migrations were pushed.

**Verification and limits:**

- Read-only source inspection and Python byte comparisons completed successfully.
  No application tests or hosted checks were run; this was a proposal review.
- Only `Docs.md` was updated. Application code, the architecture proposal,
  hosted settings, DNS, deployments, and other uncommitted work were preserved.

## 2026-11-08 — Student sign-up architecture, revision 2

**Changes made:**

- Revised `docs/student-signup-auth.md` (supersedes the first version's hook
  design and rollback steps):
  - **Trust model.** `self_signup` user metadata is now treated as
    attacker-controlled: it is never proof that a request is public, and its
    absence is never proof the team created an account. It only decides
    whether the trigger gives an account the least-privileged role,
    `student`.
  - **Domain policy independent of metadata.** If university-only
    registration is chosen, a Before User Created hook allows creation only
    when the email domain is in `private.allowed_signup_domains` or the
    address is in `private.account_approvals`. Both are team-only tables.
    Direct API requests are rejected whether the marker is forged or
    omitted. A request-by-request table covers forged, omitted, approved,
    and team cases.
  - **Trusted provisioning preserved.** The team adds an approval, creates
    the user, then activates the role. New gap G3: `admin_set_user_role`
    should require a professor approval, so an admin cannot accidentally
    promote a stranger's direct-API account shown as "Needs a role".
  - **Decision left open.** University-only registration and its allowed
    domains are an unresolved product decision. The profile-read,
    self-insert, and approval fixes apply either way.
  - **Tests.** pgTAP cases for forged/omitted markers, normalization and
    look-alike domains, approvals, privileges, profiles, and professor
    activation. A local HTTP integration test sends real direct-API sign-ups
    and Admin API creations, and records whether the hook runs for team
    creations (still unverified).
  - **Rollback corrected.** Turn hosted sign-up off before disabling or
    changing the hook. Re-enable the hook and verify before turning sign-up
    back on. Rollout also enables the hook before sign-up is opened.
  - Fixed a column/variable name clash in the hook SQL sketch.
- Removed the four untracked ` 2` duplicates after confirming with `cmp` that
  each is byte-identical to its tracked original:
  `backend/supabase/migrations/20261023120000_opportunity_details 2.sql`,
  `backend/supabase/tests/verify_opportunity_details 2.sql`,
  `frontend/lib/opportunities/details 2.ts`,
  `frontend/tests/opportunity-details.test 2.mjs`.

**Verification:**

- `supabase migration list --linked` after removal: all 10 migrations
  applied, nothing pending (the duplicate entry is gone).
- `git status`: only `Docs.md` and `docs/student-signup-auth.md` changed by
  this session; the other agent's uncommitted editing work is untouched.
- No application code, hosted settings, DNS, or data changed. No tests were
  run because no code changed; the proposed tests are specified in the
  document for the implementation PR.

**Open items:**

- Confirm allowed sign-up domains (or open registration), the Resend launch
  plan, and whether to turn hosted sign-up off until launch.
- Commit or park `codex/professor-opportunity-editing`, then implement
  Step 1 as one PR.

## 2026-11-08 — Account sign-up and roles architecture, revision 3

**Changes made (documentation only):**

- Rewrote `docs/student-signup-auth.md` as revision 3, superseding the
  revision 2 approval design:
  - **Students fully self-service.** Proposed: replace the sign-up trigger
    function so every new Auth user gets a `student` profile, whatever
    metadata the client sends. `self_signup` is no longer read. No team step
    for students.
  - **"No self-created profiles" clarified** as blocking direct client
    inserts into `profiles` (drop the self-insert policy). The database still
    provisions the student profile during sign-up.
  - **Professor approval without an approval table.** The approval is the
    admin's `admin_set_user_role(…, 'professor')` call. Proposed rule: allowed
    only for accounts whose email is confirmed or that the team invited
    (`invited_at`), plus an append-only `private.role_changes` audit log.
    Revision 2's `private.account_approvals` table is withdrawn. A table is
    only warranted later for an in-app request queue or for hook exceptions.
  - **Professor flow:** `mailto:` request link → team verifies faculty status
    → dashboard invite → admin activates → new `/accept-invite` page (code +
    set password). Interim: existing **Add user** with auto-confirm.
  - **Admins:** dashboard **Add user**, then SQL Editor role update only.
    Provisioning SQL in this file's reference section must switch to
    `on conflict (id) do update` once the trigger creates every profile.
  - **Public sign-up never yields professor or admin.** The document lists
    each path an attacker could try and the control that blocks it.
  - **New edge case (unverified):** an address registered by someone else
    before the real owner verifies. Proposed fix: set the password again
    after verification. An integration test settles whether it is needed.
  - **University-only registration remains an open decision.** The hook now
    reads only domain and exact-address exception tables.
  - Rollback order kept: close hosted sign-up before touching the hook.
  - Tests specified: pgTAP for metadata-independent provisioning, blocked
    client inserts, the professor activation rule and audit log, privileges,
    and admin provisioning; HTTP integration for direct-API sign-ups,
    pre-registered addresses, invites, and admin creation.

**Verification:**

- Read the trigger (`20261004120000`), `admin_set_user_role` and
  `prevent_profile_role_change` (`20261004200000`), and the provisioning
  reference in this file to confirm current behavior.
- No application code, migrations, hosted settings, DNS, or data changed. No
  tests were run because no code changed.

**Open items:**

- Decide registration scope (allowed domains or open), the professor request
  mailbox, the Resend launch plan, and whether to turn hosted sign-up off now.
- Commit or park `codex/professor-opportunity-editing`, then implement Step 1
  (database and gate) and Step 1b (professor invitation page).

## 2026-11-08 — Review professor invitations and password ownership

**Review outcome:**

- Read the revised `docs/student-signup-auth.md` proposal and official Supabase
  invitation, OTP, password-update documentation and current Auth signup source.
- Current upstream signup source retains an existing unconfirmed user's password
  on repeat signup. This supports the pre-registration concern, but behavior of
  the project's deployed Auth version remains untested.
- Recommended testing password A / repeated signup with password B / mailbox
  verification, then both logins, including the interval before password update
  and any session acquired during that interval. A frontend password update is
  not an atomic verification-and-password replacement guarantee.
- Reviewed the professor request, team invitation, code verification and password
  setup design. Invite codes require the Invite user template and invite OTP type;
  confirmed existing student accounts need promotion, not deletion/recreation.

**Verification and limits:**

- Documentation/source review only; no test accounts, emails, migrations, hosted
  configuration or application changes. Only `Docs.md` updated. No application
  tests were run. The planned Auth integration tests remain required before launch.

## 2026-11-08 — Pre-registration (password A/B) test

**What was run:** a local experiment only, with no hosted accounts, emails,
or settings touched. Docker Desktop was started, and local Supabase
(CLI 2.104.0, GoTrue v2.196.0) ran with Mailpit as the inbox and throwaway
`@example.test` addresses. `backend/supabase/config.toml` was temporarily
changed to allow local sign-up and to raise the local email limit from 2 to
20 per hour. It was restored byte-for-byte afterwards (`cmp` clean, no git
diff). The four test users were deleted and the local stack was stopped. The
scripts are in the session scratchpad, not the repository.

**Results:**

- Without the fix: signing up with password A, then again with B, returns the
  same user. After verifying the real inbox's code, **A signs in and B
  fails**, and the profile keeps the first registrant's name. The
  pre-registration risk is confirmed.
- With `updateUser({ password: B })` right after verification: **B signs in,
  A fails.** A session the stranger opened with A just before the update
  cannot refresh, and Auth's `/user` rejects it. Its already-issued access
  token still reads the database through RLS until it expires (one hour,
  student-level access).

**Documentation changes:** `docs/student-signup-auth.md`:
- Section 6 now records the risk as confirmed.
- New section 6.1 holds the results.
- Step 1 makes the password update (and setting the profile name)
  **required** on `/sign-up`.
- `/verify-email` now asks for a new password.
- The integration test asserts the fixed behavior.

No application code changed.

**Open items:** implement the fix in the Step 1 PR, and repeat the check on
hosted staging (its GoTrue version and *Secure password change* setting are
unverified).

## 2026-11-08 — Pre-registration: gap login and interrupted setup tests

**What was run (local only):**
- Local Supabase: CLI 2.104.0, GoTrue v2.196.0, PostgREST v14.5.
- Mailpit served as the inbox, with throwaway `@example.test` addresses.
- `backend/supabase/config.toml` was changed temporarily: local sign-up on,
  email limit 50/hour, `jwt_expiry` 60 s. It was restored byte-for-byte
  (`cmp` clean, no git diff).
- A candidate trigger was created in the local database only, then dropped.
- All test users, the seeded listing, applications, and experiment objects
  were deleted; the one pre-existing local user is untouched.
- The local stack was stopped. Docker Desktop is still running.
- Scripts are in the session scratchpad, not the repository.
- The first run was interrupted by the user; its partial data was removed
  before rerunning.
- Nothing hosted was touched.

**Results** (detail in `docs/student-signup-auth.md` sections 6.2–6.4):

- **Gap login, password update only: fails.** A stranger who signs in with A
  between verification and the update loses refresh and Auth `/user` access.
  However, their issued access token kept RLS **read and write** access: it
  read the profile and listings, changed the name, and created an
  application. This lasted until about 30 s past the token's `exp` (PostgREST
  clock skew), so up to about an hour on hosted defaults.
- **Interrupted setup, password update only: owner recovers, but A stays
  usable until they do.**
  - Resuming with the saved refresh token and setting B works.
  - Password recovery by email works.
  - Both revoke the stranger's refresh tokens.
- **Candidate fix: passes both cases.** A `before update` trigger on
  `auth.users` clears the stored password when a pending self sign-up is first
  confirmed. A never signs in, interrupted owners recover by refresh or by
  recovery email, and all controls pass (normal sign-up, team Add user with
  auto-confirm, team invite).
  - The first version broke Add user with auto-confirm. Auth confirms those
    accounts in a separate update, so the condition was narrowed to a
    pending confirmation token or sent time.
- Normal sign-up without the trigger: re-setting the same password returns
  `422 same_password`; the page must treat that as success.

**Documentation changes:** `docs/student-signup-auth.md` now has sections
6.2–6.4. Step 1 adds the trigger, `/reset-password`, sign-in guidance, and
`same_password` handling. The test plan adds gap, interrupted-setup, control,
and trigger tests. Step 3 requires the full pre-registration suite on hosted
staging with real inboxes before production registration opens.

**Status:** locally verified; hosted behavior unverified. No application code
or migrations changed.

**Not done:** the staging run. It needs Step 1 implemented and deployed to
Preview, plus the hosted SMTP, template, and URL settings, none of which
exist yet.

## 2026-11-08 — Assess confirmation trigger and launch fallback

**Review outcome:**

- Reviewed the candidate confirmation trigger and local experiment results in
  `docs/student-signup-auth.md` sections 6.2–6.4. The reported results support
  implementing the candidate with permanent tests before hosted staging; the
  prototype is not yet a repository migration or deployed application fix.
- Confirmed the dependency risk: the trigger changes `auth.users.encrypted_password`
  using internal confirmation columns. Supabase warns that managed Auth columns
  and other objects may change. Hosted compatibility is still unverified.
- Flagged the proposed fallback as insufficient for launch: shorter JWT expiry
  bounds an individual token after revocation but does not stop repeated password-A
  logins while setup is interrupted and A remains stored. Keep registration closed
  if the trigger fails staging until an alternative passes both security cases.
- Next work: implement migration, post-verification password setup and recovery,
  retain permanent tests, then run the complete suite in an isolated hosted staging
  project with its own email/URL configuration before opening production signup.

**Verification and limits:**

- Read repository proposal/log and official Supabase session and managed-user-data
  documentation. No independent rerun of the reported experiments or application
  tests, and no hosted access or mutations. Only `Docs.md` changed this review.

## 2026-11-08 — Summarize pre-push work and launch dependencies

**Review outcome:**

- Checked working-tree status, package scripts, the production signup gate,
  migration inventory and the current architecture implementation plan.
- Current branch remains `codex/professor-opportunity-editing` with uncommitted
  feature work. Auth hardening is still a proposal/local prototype: no permanent
  hardening migration, `/reset-password` or `/accept-invite` page is present.
  The production signup gate still always returns false. Duplicate ` 2` files
  are no longer present in working-tree status.
- Explained that dependencies come from coordinating Auth confirmation/password
  handling, profile provisioning/RLS, recovery, and professor/admin onboarding;
  the role hierarchy itself is not a package dependency conflict.
- Recommended separating the existing editing work from an auth PR, implementing
  the database and matching UI/recovery with permanent tests, and running local
  release/database/integration checks before pushing a reviewable auth branch.
- Distinguished pushing a review branch from production launch: hosted staging
  with its own Supabase project must precede production auth rollout; a Vercel
  Preview alone does not isolate the database. Production signup stays closed
  until the hosted tests pass. Do not rely on a shorter JWT lifetime fallback.

**Verification:**

- Read-only repository inspection completed. Tests/builds were not run because
  this was a readiness overview and no application implementation changed.
- Only `Docs.md` updated; no commits, pushes, deployments or hosted mutations.

## 2026-11-08 — Verify professor opportunity editing for branch push

**Completed review and preparation:**

- The user requested pushing `codex/professor-opportunity-editing` if safe.
  Refreshed `origin`; the branch is based on current `origin/main` (`6008853`)
  and no remote branch with this feature name existed at the time of inspection.
- Reviewed the existing implementation: shared create/edit editor and validation,
  owner-filtered loading, explicit writable fields, atomic `updated_at` matching,
  preservation of listing identity/status/applications, and existing database RLS.
  Read the installed Next.js dynamic-route guide. No implementation fixes needed.
- Prepared a focused feature commit containing `README.md`, the professor new,
  dashboard and edit routes, `EditOpportunityWorkspace.tsx`,
  `OpportunityEditor.tsx`, `lib/opportunities/editing.ts` and `form.ts`,
  `frontend/package.json`, frontend editing tests, database editing tests,
  and the relevant entries in this shared log. Signup architecture notes and
  their other log entries remain local for the separate auth work.

**Verification:**

- `npm ci --no-audit --no-fund`: passed; package-lock unchanged. This removed
  duplicate installed type folders that initially blocked TypeScript. Cleared
  the generated `.next` cache to remove duplicate route declarations; no source
  or dependency-version changes were used to bypass these local cache failures.
- `npm run release:check`: passed (lint, route type generation, TypeScript,
  59 unit tests, runtime audit with zero vulnerabilities, default Turbopack
  production build). Build includes `/professor/opportunities/[id]/edit`.
- `supabase test db --local`: all 128 assertions in six files passed.
  `supabase db lint --local --level warning`: no schema errors. Started the
  existing local database without a reset for these checks and stopped it
  afterward, preserving its data and restoring its previous stopped state.
- Full `npm audit --json`: two high and eight moderate development-only package
  findings under ESLint tooling (brace-expansion, zod, minimatch and affected
  dependents). Reviewed with `npm ls`; none are in the runtime audit. Existing
  tooling denial-of-service risks require a separate dependency update. No forced
  downgrade or automatic audit fix was applied.
- `git diff --check`: passed. Browser/hosted end-to-end tests were not repeated;
  the original feature entry records the earlier 27 passing local browser checks.

**Publication scope and follow-ups:**

- Commit and push the verified feature branch for review; do not merge into
  `main` or change hosted settings. No new migration is required by editing.
- Keep the signup implementation separate. Public production signup remains
  disabled in frontend code. Hosted auth risks and staging verification remain
  the separate signup workstream documented in the local architecture review.
- Teammate review and a live professor/student smoke test remain before merging
  and releasing the editing feature. No production deployment was requested.

## 2026-11-08 — Post-push confidence and next steps

**Review outcome:**

- Confirmed opportunity-editing commit `72cc13817cf161f347ee1626b8e7631d494f3556`
  was pushed; the local feature branch tracks its matching remote branch.
- GitHub commit status reports Vercel deployment success. Check runs show
  Vercel Preview Comments succeeded and Supabase Preview was skipped.
- No pull request exists for `codex/professor-opportunity-editing` yet.
- Recommended opening a PR, teammate review and signed-in preview smoke tests
  for owner edits, student visibility, application preservation and conflicts,
  followed by merge and a production smoke test. Hosted signed-in flows have
  not been independently verified in this push session.
- Confidence is high for the editing feature's tested local behavior; it is
  ready for review. The auth confirmation trigger remains a separate local
  prototype, requiring implementation and hosted staging before signup launch.

**Verification:**

- Read Git status/commit and GitHub statuses, check-runs and PR-list APIs.
  Application tests were not repeated because code has not changed since the
  passing pre-push checks. Only `Docs.md` updated; no PR, merge, deployment,
  hosted configuration change or additional push was performed.

## 2026-11-08 — Implement student signup security and account recovery

**Completed implementation:**

- Created local branch `codex/student-signup-auth` from pushed editing commit
  `72cc138`, preserving the uncommitted architecture notes and shared-log history.
  This branch follows the editing feature; merge that feature first or rebase
  before opening an independent auth PR. No auth commit or push was made.
- Added `backend/supabase/migrations/20261108120000_account_signup_hardening.sql`:
  every new Auth account gets a student profile regardless of metadata; client
  profile INSERT is removed; published listing reads require a profile; professor
  promotion requires an admin plus a confirmed or team-invited target; role changes
  are audited in a private table without client access. Admin listing now exposes
  trusted confirmation/invitation timestamps. Existing confirmed users' roles and
  passwords are preserved; older profileless accounts are not automatically activated.
- Added the tested `before update` confirmation trigger, which clears the password
  selected before inbox ownership was proved in the same transaction as first
  pending-signup confirmation. It depends on Auth-managed fields and needs hosted
  staging and upgrade checks. No weaker JWT-expiry fallback is accepted.
- Added `frontend/lib/auth/password-setup.ts`, `components/auth/PasswordSetup.tsx`
  and `AccountCodeFlow.tsx`, plus `/reset-password` and `/accept-invite` pages.
  Signup and `/verify-email` now finish password setup after email verification;
  legacy `/auth/callback` links also offer setup. Signup prefills the original
  password only from memory and lets the verified owner confirm/change it. Setup
  checks the server-verified identity, accepts only `same_password` for idempotent
  retries, saves the owner's name, and preserves a recoverable session on failure.
- Updated `frontend/app/sign-up/StudentSignup.tsx`, `app/sign-in/page.tsx`,
  `app/verify-email/page.tsx`, `app/auth/callback/page.tsx`, `lib/auth/signup.ts`,
  and `components/auth/ResendConfirmation.tsx` for code wording, duplicate-submit
  protection, password recovery discovery and clearer verification errors.
- Updated `frontend/app/admin/page.tsx` and `lib/admin/admin.ts` to show trusted
  confirmation/invitation state and explain refused promotions. The team still
  verifies faculty identity; email confirmation alone is not faculty approval.
- Changed only the public signup gate in `frontend/lib/release.ts` to honor the
  exact `NEXT_PUBLIC_ENABLE_SELF_SIGNUP=true` build-time flag in production.
  It defaults off. Resume/draft production restrictions remain in place. No hosted
  flag or Auth setting was changed, and no domain restriction was added.
- Added code-only recovery/invitation templates in `backend/supabase/templates/`
  and configured them locally in `backend/supabase/config.toml`, with local redirect
  URLs. Hosted templates must be configured separately. Local signup stays off.
- Added frontend password-setup tests and real Auth HTTP tests at
  `frontend/tests/integration/account-roles.integration.mjs`; updated package
  scripts, release/admin tests, and existing SQL fixtures for automatic profiles.
  Added `backend/supabase/tests/verify_account_roles.sql` for provisioning, RLS,
  confirmation clearing, role activation/audit and private-table privileges.
- Added `.github/workflows/quality.yml` for PR/main release checks, database tests,
  schema lint and Auth integration using local services and pinned Supabase CLI.
  Updated `README.md`, `frontend/.env.example`, and `docs/student-signup-auth.md`
  with setup, tradeoffs, environment variables, coordinated rollout and rollback.
  The original architecture review remains available alongside its implementation update.

**Verification:**

- Read installed Next.js authentication/environment-variable guides and official
  Supabase Auth/setup-cli documentation before implementation.
- Applied the new migration locally with `supabase migration up --local`; no reset.
  `supabase test db --local`: all 153 assertions across seven files passed.
  `supabase db lint --local --level warning`: no schema errors.
- `NEXT_PUBLIC_ENABLE_SELF_SIGNUP=false npm run release:check`: passed (lint,
  route generation, TypeScript, 64 unit tests, runtime audit with zero findings,
  production Turbopack build). Final subsequent source edits were comment/error-copy
  changes only. New recovery and invitation routes appear in build output.
- `npm run test:auth:integration -- --manage-local --database-checks`: passed
  all 153 database assertions and 11 real Auth scenarios, including eight competing
  password grants around confirmation, A/B password ownership, interrupted setup
  resumed with a session or recovery code, forged metadata, blocked self-promotion,
  team auto-confirm, fresh invitations, invitations of existing unconfirmed accounts,
  and promotion of confirmed students without replacing their account or name.
- Initial integration assertions passed, but cleanup exposed the existing non-cascade
  `profiles_id_fkey`. Corrected the runner to remove its profiles before Auth users,
  clean its audit rows/messages, and restore config in a nested finally. Removed the
  initial synthetic accounts explicitly. Subsequent complete runs cleaned up all
  seven synthetic accounts per run and restored config byte-for-byte.
- Browser rendering/empty-form validation inspected for signup, verification,
  recovery and invitation; sign-in recovery link verified. No console errors were
  captured, and the narrow sign-in layout was visually inspected. Credential flows
  were exercised through real Auth API tests rather than entered in the browser.
- Workflow YAML parses; its exact command passed locally, but the first GitHub
  Actions run is pending a later push/PR. Existing development-only dependency
  advisories remain separate; no runtime dependencies or lockfile changes.
- `git diff --check` and targeted credential/whitespace review, including new files:
  passed. Stopped the temporary browser/frontend and local Supabase services;
  original local data was preserved. Hosted environment files/settings/data were
  untouched. No commits, pushes, production migrations or deployments were made.

**Remaining rollout requirements:**

- Review the migration and complete hosted staging on an isolated Supabase project
  with the new frontend, actual SMTP/templates/URLs and real controlled inboxes.
  The linked hosted Auth version differs from local; compatibility and email
  delivery are unverified. Keep production registration closed during rollout;
  changing the UI gate does not close the direct Supabase Auth API.
- Domain restrictions, the professor-request mailbox, and launch sending capacity
  remain product/configuration decisions. These do not block the implemented local
  password-ownership fix. Do not deploy the confirmation trigger without the matching
  password-setup and recovery UI, or drop it as a fallback while pending accounts exist.

## 2026-11-08 — Pre-push review of student signup security branch

**Review outcome (no implementation changes):**

- Reviewed the uncommitted work on `codex/student-signup-auth` (based on
  editing commit `72cc138`):
  - the migration `20261108120000_account_signup_hardening.sql`;
  - password setup, recovery, and invitation pages and components;
  - the sign-up, verify-email, callback, sign-in, and admin changes;
  - the release gate, templates, and config;
  - the pgTAP and integration tests, the CI workflow, the README, and
    `.env.example`.
- **Verdict:** ready to commit and push as a review branch. Not ready to merge
  or deploy until hosted staging passes.
- **Before or at push:**
  - Nothing is committed yet. Include `docs/`, `.github/`, and the new files.
  - The branch stacks on the unmerged editing commit: merge that first, or
    target the PR at the editing branch.
  - Confirm `NEXT_PUBLIC_ENABLE_SELF_SIGNUP` is unset or `false` for Vercel
    Preview, because previews likely use production Supabase.
- **Non-blocking findings to fix before merge:**
  - Recovery (`/reset-password`) does not ask for a name. A pre-registrant's
    name can therefore persist if the owner recovers instead of finishing
    `/sign-up`, and applications copy `profiles.full_name` to professors.
  - `/auth/callback` now shows password setup to any signed-in visitor.
  - The integration runner's 180 s CLI timeout may be tight for a cold
    `supabase start` on GitHub runners, and its errors are withheld. Watch
    the first CI run.
  - The migration is the only one with explicit `begin`/`commit`. It
    applied cleanly locally.
  - Before merging, check whether the Supabase GitHub integration
    auto-applies migrations. The README requires the frontend to deploy
    before the migration.

**Verification run during review:**

- `NEXT_PUBLIC_ENABLE_SELF_SIGNUP=false npm run release:check`: passed. That
  covers lint, typegen, `tsc`, 64/64 unit tests, `npm audit --omit=dev` (0
  vulnerabilities), and the production build. The build includes
  `/reset-password` and `/accept-invite`.
- `npm run test:auth:integration -- --manage-local --database-checks`: passed.
  pgTAP: 7 files, 153 tests. Schema lint: no output. Real Auth scenarios: 11/11.
  The runner removed its 7 synthetic users and stopped the stack.
  `config.toml` is byte-identical to its pre-run state.
- Secret-pattern scan of the diff and untracked files: no matches.
  `.env.local` is ignored by `frontend/.gitignore`.
- The GitHub action `supabase/setup-cli@v3` tag exists.

**Not verified:** hosted Auth compatibility, email delivery, and the
first GitHub Actions run. Only `Docs.md` was updated in this review. No
commits, pushes, or hosted changes were made.
