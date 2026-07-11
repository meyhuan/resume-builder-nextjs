# Job workspace stage 3 release notes

## Scope

- Generates structured, job-specific suggestions from confirmed facts and the saved JD.
- Enforces realistic-mode prompts and validates every returned block and source fact server-side.
- Sanitizes generated HTML to a small allowlist before persistence or display.
- Reuses cached suggestions for identical inputs and only checks quota for a new generation.
- Lets users review original text, proposed text, reason, keywords and fact sources before applying.
- Applies selected suggestions atomically and rejects stale or conflicting resume content.
- Recalculates the deterministic match score after application and marks the Job `READY`.
- Shows Job context in the existing editor and returns to the Job detail page.
- Updates the Job to `EXPORTED` only after the PDF export record is persisted successfully.

## Required environment

- `DASHSCOPE_API_KEY`
- Existing PostgreSQL, Java API and OSS production settings

The first implementation uses the existing `ai:optimize-resume` quota so current membership behavior remains compatible. A dedicated `ai:job-tailor` entitlement can be introduced with the product catalog work without changing persisted suggestion sets.

## Staging smoke test

1. Use a non-production staging account with remaining AI quota.
2. Create a Job, confirm facts and complete JD analysis.
3. Generate suggestions and verify each suggestion cites facts from the same resume block.
4. Confirm unknown tags and HTML attributes are absent from the stored suggestion set.
5. Apply a subset and verify only selected blocks change.
6. Modify a block manually before application and verify the request returns a stale/conflict response.
7. Open the Job resume in the editor and verify the Job badge and back navigation.
8. Export PDF and verify `lastExportedAt` and Job status update only after the export record succeeds.

## Automated release checks

```powershell
pnpm typecheck
pnpm exec eslint src/app/dashboard/jobs src/app/next-api/jobs src/components/jobs src/lib/jobs src/components/ResumeEditor.tsx src/app/next-api/exports/pc/route.ts
$env:DATABASE_URL='postgresql://...'
$env:NEXT_PUBLIC_JAVA_API_BASE_URL='https://...'
$env:DASHSCOPE_API_KEY='...'
pnpm build
```

