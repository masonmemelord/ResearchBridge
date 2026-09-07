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

## September 20 Milestone

**Goal:** A professor can create and publish a research opportunity, and a student can browse published opportunities.

### Frontend responsibilities

- Build the professor dashboard and create-opportunity form.
- Build the student opportunity-browse page with department and duration filters.
- Provide responsive layouts and clear loading, empty, validation, and error states.
- Send form data to server-side actions; do not make authorization decisions in the browser.

### Backend responsibilities

- Authenticate users and verify whether they are a professor or student.
- Validate all incoming opportunity fields before a write occurs.
- Create, update, publish, close, and retrieve opportunities through server-side actions or API routes.
- Verify that a professor owns an opportunity before allowing changes.

### Database responsibilities

- Store `profiles`, `departments`, and `opportunities`.
- Enforce `duration_semesters` between 1 and 4 and require positive available positions.
- Store opportunity status as `draft`, `published`, or `closed`.
- Use row-level security: professors can manage only their own opportunities; students can read only published opportunities.

# Deadlines: 
**September 20**: A professor can create an opportunity and a student can browse it.
**October 4**: the entire student-to-professor workflow operates end to end.
**October 18**: the product contains real, reviewed Tulane data and is being tested by actual users.
**November 1**: a polished, measurable product—not merely a technical prototype.
**November 5**: presentation-ready release candidate.
**November 11**: Present at NOAI!
