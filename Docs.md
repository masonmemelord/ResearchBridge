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

  ### To-Do
  