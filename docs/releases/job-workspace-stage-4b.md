# Job workspace stage 4B release notes

## Scope

- Adds multiple application records per Job.
- Records submission channel, date, tailored resume, selected materials, recruiter contact, follow-up time and notes.
- Adds immutable status and follow-up activities for each application.
- Synchronizes the Job status with the highest active application stage.
- Supports editing, deleting and adding follow-up notes from the Job detail page.
- Adds a Dashboard application workspace with board and list views.
- Supports drag-and-drop stage changes with a select control as an accessible fallback.
- Preserves status history whenever a card is moved or a status is selected.

## Database deployment

Apply `prisma/manual-migrations/20260713_applications_and_timeline.sql` after the Job and JobMaterial migrations.

The migration is additive. Application rollback can keep the new tables in place.

## Staging smoke test

1. Create two application records under the same Job with different channels.
2. Verify the selected tailored resume and material IDs belong to the Job.
3. Update recruiter details, next follow-up and notes from Job detail.
4. Add a follow-up note and verify it appears in the immutable timeline.
5. Drag an application through applied, contacting and interviewing columns.
6. Verify every move creates a status activity and updates the Job badge.
7. Use the list-view status selector and verify the board reflects the new stage.
8. Delete one application and verify the Job derives its state from the remaining applications.
9. Archive and restore the Job and verify it returns to its latest application stage.

## Automated checks

```powershell
$env:DATABASE_URL='postgresql://...'
pnpm exec prisma validate
pnpm typecheck
pnpm exec eslint src/app/dashboard/applications src/app/dashboard/jobs src/app/next-api/applications src/app/next-api/jobs src/components/applications src/lib/applications
$env:NEXT_PUBLIC_JAVA_API_BASE_URL='https://...'
$env:DASHSCOPE_API_KEY='...'
pnpm build
```

