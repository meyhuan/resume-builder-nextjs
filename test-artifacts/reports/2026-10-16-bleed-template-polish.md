# Multi-page bleed template polish QA

## Scope

- Template: `warm` (two-column bleed template)
- Change: print-only continuation rail, squared continuation edge, and consistent top breathing room for fragmented right-column content.
- Export path: Chromium PDF generation through `/next-api/generate-pdf`.

## Verification

- `pnpm exec tsc --noEmit` — passed.
- `pnpm build` with `NEXT_PUBLIC_JAVA_API_BASE_URL=http://127.0.0.1:8080` — passed; existing Prisma warning is unrelated to this change.
- `node scripts/verify-template-controls.mjs --base-url http://127.0.0.1:3012 --ids warm --concurrency 1 --scope all` — passed: 24 spacing cases and 6 one-page cases, 0 failures.
- Exported PDF: `test-artifacts/template-controls/2026-10-16T00-47-43-188Z/warm/pc-long-one-page.pdf` — 2 A4 pages.
- Rendered review images: `tmp/pdfs/review5/warm-pc-long-1.png` and `tmp/pdfs/review5/warm-pc-long-2.png`.

## Visual result

Page 1 keeps the original two-column composition. The continuation page begins with a stable inset for the right column and retains the warm template's pale left rail cue, so the page transition reads as an intentional continuation instead of a clipped sidebar or accidental blank gutter. Native Chromium fragmentation remains responsible for the actual split.
