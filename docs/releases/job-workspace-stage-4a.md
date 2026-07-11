# Job workspace stage 4A release notes

## Scope

- Adds one editable material per Job and material type.
- Supports self-introduction, cover letter, outreach messages, project story and interview preparation.
- Generates grounded Markdown drafts only from confirmed facts and the saved JD.
- Validates AI source-fact IDs before saving generated content.
- Supports editing, explicit saving, keyboard saving, plain preview, copying, regeneration and deletion.
- Requires explicit confirmation before regeneration overwrites a user-edited draft.
- Keeps every material under its Job workspace and deletes it with the Job.

## Database deployment

Apply `prisma/manual-migrations/20260712_job_materials.sql` after the stage 1 migration and before deploying this application build.

The migration is additive. The prior application build ignores `JobMaterial`, so application rollback does not require dropping the table.

## Staging smoke test

1. Open a Job with confirmed facts and visit its material package.
2. Generate all five material types with a staging AI account.
3. Verify generated text contains no invented facts and all stored `sourceFactIds` exist in the confirmed fact set.
4. Edit a material, save with the button and with Ctrl/Command+S, then reload.
5. Copy and preview the material.
6. Attempt regeneration and verify the overwrite confirmation appears.
7. Delete one material and verify it disappears from the package while the Job remains.
8. Delete a test Job and verify its materials are removed by cascade.

## Automated checks

```powershell
$env:DATABASE_URL='postgresql://...'
pnpm exec prisma validate
pnpm typecheck
pnpm exec eslint src/app/dashboard/jobs src/app/next-api/jobs src/components/jobs src/lib/jobs
$env:NEXT_PUBLIC_JAVA_API_BASE_URL='https://...'
$env:DASHSCOPE_API_KEY='...'
pnpm build
```

