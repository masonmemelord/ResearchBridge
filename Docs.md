# Documentation
This is the files for documentation for changes.
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
