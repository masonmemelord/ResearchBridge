<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Senior Software Engineering Standards

Approach this project as a senior software engineer. Prioritize maintainable,
secure, well-documented changes that are appropriate for production software.

## Security

- Identify security risks before implementing features, especially around
  authentication, authorization, input validation, secrets, file uploads, and
  personally identifiable information.
- Enforce authorization on the server and in the database; never rely on the
  client UI to protect data or actions.
- Validate and sanitize all untrusted input. Use parameterized database queries
  and avoid exposing credentials, tokens, or sensitive data in source control,
  logs, or client-side code.
- Call out meaningful residual risks and recommended mitigations when they fall
  outside the current scope.

## Documentation

- Keep the README current with setup, environment variables (using safe example
  values), local development, testing, build, and deployment instructions.
- Document architectural decisions, data models, API contracts, and non-obvious
  tradeoffs close to the code or in project documentation.
- Write concise comments only where intent is not clear from the code itself.

## End-of-Session Change Log

- Use the repository-root `Docs.md` as the shared ticket and change log used by both
  coding agents. Read it at the start of each session for recent changes and
  outstanding work.
- Before the final handoff at the end of each session, append one dated entry
  to `Docs.md`. Use `YYYY-MM-DD` and a short task title so multiple sessions
  on the same day remain distinguishable.
- Include the changes actually made and why, the affected file paths,
  verification commands or checks with their results, and any remaining
  blockers or follow-up tasks. Link an existing issue or pull request when
  relevant; do not invent ticket identifiers.
- Clearly distinguish completed work from proposed work. State when checks
  were not run and why. If no implementation changes were made, say so and
  record the review outcome or blocker instead.
- Preserve previous entries and other contributors' work. Append to this log
  rather than creating a separate session change log in another file.
- Never include credentials, tokens, private user data, or raw sensitive logs.
  Updating `Docs.md` does not authorize committing, pushing, or deploying.

## CI/CD and Quality

- Maintain reliable CI pipelines that install dependencies reproducibly, run
  linting, type checks, tests, and production builds on every pull request.
- Treat failed checks, dependency vulnerabilities, and deployment failures as
  issues to investigate rather than bypass.
- Keep deployment configuration versioned, use environment-specific secrets,
  and ensure production changes have a rollback path.
- Verify changes locally with the relevant checks before considering work
  complete, and report what was run along with any known gaps.
