# Job workspace stage 1 release notes

## Scope

- Adds `Job` and `ResumeFactSet` persistence.
- Adds the optional one-to-one `Resume.jobId` link for tailored resumes.
- Adds authenticated Job list/create/read/update/delete APIs.
- Adds Dashboard navigation, Job list, Job creation and Job detail pages.
- Keeps tailored resumes out of ordinary desktop, H5 and mini-program resume lists.
- Creates a tailored resume by copying the selected base resume without modifying it.

Fact extraction, JD analysis, AI suggestions and application tracking are intentionally not exposed as working actions in this stage. They will attach to the persisted workspace in later stages.

## Deployment order

1. Back up the PostgreSQL database.
2. Apply `prisma/manual-migrations/20260711_job_workspace_foundation.sql` in a low-traffic window.
3. Verify the new tables, indexes and nullable `Resume.jobId` column.
4. Deploy the application build.
5. Sign in with an internal account and create one test Job from an existing base resume.
6. Confirm the tailored resume opens in the existing editor and remains absent from ordinary resume lists.
7. Archive, restore and delete the test Job.

## Compatibility and rollback

- The database migration is additive. Existing Resume rows receive `jobId = NULL` and retain their old behavior.
- The previous application build ignores the new nullable column and tables, so application rollback does not require dropping schema objects.
- Do not drop the new tables during an application rollback; retained Job data can be used when the release is redeployed.

## Release checks

```powershell
$env:DATABASE_URL='postgresql://...'
$env:NEXT_PUBLIC_JAVA_API_BASE_URL='https://...'
pnpm exec prisma validate
pnpm typecheck
pnpm build
```

Expected known repository warnings:

- The existing analytics page has a `react-hooks/exhaustive-deps` warning.
- Browser compatibility metadata is outdated.
- Static public-site statistics log a handled database connection warning when a dummy build-only database URL is used.

