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

