# Temporary persistence

This directory contains the file-based handoff representation of the prototype's temporary opportunity store.

- `researchbridge-opportunities.json` mirrors the browser storage key `researchbridge-opportunities`.
- Its top-level value must always be a JSON array of opportunity records.
- The current prototype still writes to browser `localStorage`; browser-only entries are not automatically mirrored to this file.
- Replace this directory with Supabase-backed persistence before production. Do not store resumes, credentials, or personal data here.

## Record schema (version 2)

New records are written by `app/professor/opportunities/new/page.tsx`:

```ts
{
  schemaVersion: 2;
  id: string;
  title: string;                 // 1–120 characters
  description: string;           // at least 30 characters
  school: "Architecture" | "Liberal Arts" | "Public Health" | "Science and Engineering";
  department: string;            // hosting department or discipline, 2–100 characters
  preferredMajors: string[];     // 0–8 items, 2–60 characters each; [] = open to all majors
  keywords: string[];            // 1–8 items, 2–30 characters each
  durationSemesters: 1 | 2 | 3 | 4;
  eligibleClassYears: ("Freshman" | "Sophomore" | "Junior" | "Senior")[];
  positionsAvailable: number;    // whole number, 1–20
  status: "draft" | "published";
  createdAt: string;             // ISO 8601
}
```

Majors and keywords are trimmed and deduplicated case-insensitively (first spelling kept) before saving.

## Legacy records and migration

Entries without `schemaVersion` are **legacy** (version 1). They were saved before `school`, `preferredMajors`, and `keywords` existed, and their `department` field holds what is now the school name.

- The app never deletes, rewrites, or back-fills legacy entries. New records are only appended.
- Missing school, department, major, or keyword values are not invented. The form page only counts legacy entries and flags them.
- Entries with an unknown `schemaVersion` or an invalid version 2 shape are counted as unrecognized and also left untouched.
- If the stored value is not a readable JSON array, saving is refused so the existing data is not overwritten.

**Before database persistence:** legacy entries need a migration. Map legacy `department` to `school` only if it matches one of the four schools. A professor must supply the hosting department and keywords, since those cannot be derived. Set `preferredMajors` to `[]` unless confirmed. Entries that cannot be completed should stay drafts or be excluded from the import.

# Test Persistence
1. Open localhost in Chrome 
2. Open Devtools (opt + cmd + I)
3. Go to Console
4. Make an opportunity
5. when draft is saved or published run
```javascript
JSON.parse(localStorage.getItem("researchbridge-opportunities")) 
``` 
in console 

If null returns there is a validation issue with:
- Title
- Description with at least 30 characters
- School
- Hosting department (2–100 characters)
- Preferred majors (optional; at most 8, each 2–60 characters)
- Keywords (1–8, each 2–30 characters)
- Duration
- At least one eligible class year
- Positions available between 1 and 20