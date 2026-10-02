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
