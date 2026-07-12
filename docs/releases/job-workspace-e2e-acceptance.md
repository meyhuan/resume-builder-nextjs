# Job workspace browser acceptance report

Date: 2026-07-12  
Branch: `feature/job-search-workspace`  
Test identity: isolated local E2E user `codex_job_workspace_e2e`  
Synthetic Job: `云帆智能 · AI 产品经理`

## Browser scenarios

| Scenario | Evidence | Result |
| --- | --- | --- |
| Create a Job from a base resume | Job detail showed copied resume, 3 extracted facts and original base resume | Pass |
| Invalid short JD | Native form validation kept the user on the new-Job page | Pass |
| Fact privacy and selection | Contact phone/email were absent; 3 facts could be toggled and confirmed | Pass |
| Deterministic JD analysis | Coverage score, covered terms, missing terms and section guidance rendered | Pass |
| Grounded tailoring | Unsafe generated claims were rejected; deterministic fallback produced 2 source-linked, fact-preserving suggestions | Pass after fix |
| Apply one suggestion | Editor opened the Job resume and displayed the accepted emphasis without changing the base resume | Pass |
| Five Job materials | Self intro, cover letter, outreach, project story and interview prep all reached editable saved state | Pass after fix |
| Material editing | Title/body edit, save, preview and clipboard copy verified | Pass |
| Material deletion | Confirmation dialog deleted project story; regeneration restored it | Pass |
| Create application | Channel, timestamp, resume, material, contact, follow-up and note saved | Pass |
| Application board | Accessible status selector moved the card Offer → Contacting → Offer | Pass |
| Interview round | Schedule, interviewer, questions, answers, review, next actions and Passed result saved | Pass |
| Outcome feedback | Reply, interview count and Offer outcome updated Application and Job timelines | Pass |
| Review dashboard | Application/reply/interview/Offer totals were 1; channel, gaps and confirmed facts rendered | Pass |
| Archive and restore | Archived state rendered; restore recovered the highest application stage (Offer) | Pass |
| Cross-user isolation | A second local E2E identity received the 404 page for the first user's Job | Pass |
| Mobile layout | At a 390 px viewport, document scroll width matched client width after responsive navigation fix | Pass after fix |
| Editor cookie session | Job editor opened without an erroneous forced login dialog | Pass after fix |
| PDF preview and export | Preview rendered, one synthetic export record was created, and the Offer Job retained its status and received `lastExportedAt` | Pass after fix |

## Defects found and fixed

1. Local E2E cookie users were logged out by VIP polling before they could submit forms.
2. Successful tailoring/material generation left `busy` true and disabled subsequent actions.
3. The model invented user identities, counts, percentages and team roles despite a strict prompt.
4. Applying suggestions downgraded a Job from Offer to Ready.
5. Terminal applications were still counted as overdue follow-ups.
6. Dashboard's fixed desktop sidebar caused horizontal overflow on mobile.
7. Interview headings rendered awkwardly as `第 一面 轮面试`.
8. The editor forced a login dialog when a valid cookie existed but the local token store was empty.
9. Concurrent PDF modules reused one Chrome profile and failed before preview generation.

## Grounding policy verified

- Generated suggestion prose is accepted only when its factual text is identical to the confirmed source; otherwise a deterministic source-linked emphasis is used.
- Candidate-facing materials publish deterministic renderings of confirmed facts with explicit placeholders, not unverified model assertions.
- The original model draft is treated as untrusted and is never published when claim-level truth cannot be proven.

## Remaining release checks

- Prisma validation, TypeScript, affected-directory ESLint and a clean production build must pass after the browser fixes.
