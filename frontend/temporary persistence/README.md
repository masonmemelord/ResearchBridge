# Temporary persistence

This directory contains the file-based handoff representation of the prototype's temporary opportunity store.

- `researchbridge-opportunities.json` mirrors the browser storage key `researchbridge-opportunities`.
- Its top-level value must always be a JSON array of opportunity records.
- The current prototype still writes to browser `localStorage`; browser-only entries are not automatically mirrored to this file.
- Replace this directory with Supabase-backed persistence before production. Do not store resumes, credentials, or personal data here.

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
- Department
- Duration
- At least one eligible class year
- Positions available between 1 and 20