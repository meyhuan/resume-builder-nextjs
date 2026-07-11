# Job workspace stage 2 release notes

## Scope

- Extracts reusable, deterministic facts from education, work, project, campus, text and list blocks.
- Excludes personal-information sections and redacts common email, phone, ID-card and contact-account patterns.
- Hashes normalized fact JSON so style-only changes do not make a fact set stale.
- Detects base-resume fact changes and supports explicit resynchronization.
- Lets users confirm facts by section before those facts can be used for analysis.
- Runs deterministic JD keyword analysis only against confirmed facts.
- Adds fact-confirmation and analysis-result pages with complete empty, stale, loading and failure states.

## Manual verification

1. Create a Job from a populated base resume.
2. Verify the fact page groups education, work and project blocks correctly.
3. Confirm that base-info fields, email and phone values are absent or redacted.
4. Deselect one fact, confirm and run analysis.
5. Verify the analysis page shows score, covered keywords, missing keywords and section suggestions.
6. Change only the base resume template and verify facts do not become stale.
7. Change a base resume experience and verify the fact page requires synchronization.
8. Synchronize, confirm the revision increments and old confirmations are cleared.

## Automated release checks

```powershell
pnpm typecheck
pnpm exec eslint src/app/dashboard/jobs src/app/next-api/jobs src/components/jobs src/lib/jobs
$env:DATABASE_URL='postgresql://...'
$env:NEXT_PUBLIC_JAVA_API_BASE_URL='https://...'
pnpm build
```

