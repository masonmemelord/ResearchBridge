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

### Request flow

```text
Frontend form → Backend authentication and validation → Database write with RLS
Student browse page → Backend/database query → Published opportunities only
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

# Deadlines: 
- **September 20**: A professor can create an opportunity and a student can browse it.
- **October 4**: the entire student-to-professor workflow operates end to end.
- **October 12**: Pitch Friday + Apply to 1834 VC
- **October 18**: the product contains real, reviewed Tulane data and is
being tested by actual users.
- **November 1**: a polished, measurable product—not merely a technical prototype.
- **November 5**: presentation-ready release candidate.
- **November 11**: Present at NOAI!
