# Job workspace stage 4C release notes

## Scope

- Adds structured interview rounds with schedule, interviewer, questions, answers, review, next actions and result.
- Adds application outcome feedback for replies, interview count, offer state, reason codes and notes.
- Synchronizes interview and final outcome changes to Application and Job status timelines.
- Adds an authenticated review dashboard for descriptive funnel totals, channels, recurring JD gaps, frequently used confirmed facts and overdue follow-ups.
- Labels review insights as historical correlation rather than causal prediction.

## Database deployment

Apply `prisma/manual-migrations/20260714_interviews_and_outcomes.sql` after the Stage 4B application migration.

The migration is additive. Application rollback can leave the Interview and Outcome tables in place.

## Staging smoke test

1. Add two interview rounds to an application and edit the first round.
2. Verify interview creation moves the application and Job to interviewing and creates an activity.
3. Record a passed and failed interview and verify both remain visible on the Job timeline.
4. Save OFFER, REJECTED, WITHDRAWN and NO_RESPONSE outcomes on separate applications.
5. Verify final outcomes update both application and Job badges and create activities.
6. Open `/dashboard/review` and verify totals, channel ranking, confirmed facts and missing keywords use only the signed-in user's records.
7. Set a past next-action date and verify it appears under overdue follow-ups.
8. Verify the empty state when an account has no applications.

## Automated checks

```powershell
$env:DATABASE_URL='postgresql://...'
pnpm prisma validate
pnpm exec tsc --noEmit
pnpm exec eslint "src/app/dashboard/jobs/[id]/page.tsx" "src/app/dashboard/review/page.tsx" "src/components/interviews/*.tsx" "src/lib/interviews/*.ts" "src/app/next-api/applications/[id]/interviews/route.ts" "src/app/next-api/applications/[id]/outcome/route.ts" "src/app/next-api/interviews/[id]/route.ts" "src/components/dashboard/dashboard-sidebar.tsx"
$env:NEXT_PUBLIC_JAVA_API_BASE_URL='https://...'
$env:DASHSCOPE_API_KEY='...'
pnpm build
```
