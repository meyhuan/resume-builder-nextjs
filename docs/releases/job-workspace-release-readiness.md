# Job search workspace release readiness

## Included stages

1. Job workspace foundation and independent tailored resumes.
2. Confirmed resume facts and deterministic JD matching.
3. Grounded AI suggestions with source traceability and conflict checks.
4. Editable job materials.
5. Application board, immutable timeline and follow-up tracking.
6. Interview rounds, outcome feedback and descriptive review dashboard.

## Deployment order

Apply the additive SQL migrations in filename order before deploying application code:

1. `20260711_job_workspace_foundation.sql`
2. `20260712_job_materials.sql`
3. `20260713_applications_and_timeline.sql`
4. `20260714_interviews_and_outcomes.sql`

Run `pnpm prisma generate` in the application build after the schema is deployed.

## Release gates

- Prisma schema validates.
- TypeScript passes without emitting files.
- ESLint passes for every new or changed job workspace directory.
- Next.js production build completes and includes all workspace pages and API routes.
- Every workspace API authenticates the caller and scopes records through Job ownership.
- Tailored resumes stay out of ordinary resume lists and cannot be deleted through ordinary resume deletion APIs.
- AI generation receives only user-confirmed facts, and generated edits retain source fact IDs.
- Export does not downgrade an application-stage Job status.
- Multiple applications derive the Job status from the highest active stage.
- Review metrics remain descriptive and do not claim causation.

## Known non-blocking baseline warnings

- The existing admin analytics page reports a missing `loadAll` hook dependency.
- Browser compatibility metadata is outdated.
- A build with a placeholder database URL logs the existing public-site statistics fallback warning while still completing successfully.

## Production smoke test

Use a new test user and one existing user with resumes. Complete the Stage 1–4C smoke tests in the preceding release notes, then verify desktop and mobile widths for the Job list, Job detail, materials editor, application board/list, interview dialog, outcome dialog and review dashboard.
