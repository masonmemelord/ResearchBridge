# Legacy temporary persistence

> This folder is retained only as a reference for prototype records. The running
> frontend no longer reads or writes these files or the former browser-storage
> key; opportunities are persisted in Supabase.

`researchbridge-opportunities.json` is a handoff snapshot of the former
`researchbridge-opportunities` localStorage array. It is not imported
automatically and must not receive new records, credentials, resumes, or other
personal information.

If these prototype records are intentionally imported later, validate them
against the current `opportunities` table and associate every record with a real
authenticated professor. Records missing a hosting department or keyword need
manual review rather than invented values.

Current persistence is verified with the Supabase pgTAP suite:

```bash
cd backend
supabase db reset --local
supabase test db
```
