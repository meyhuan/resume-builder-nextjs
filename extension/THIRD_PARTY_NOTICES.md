# OpenJobAutofill integration

Source: https://github.com/Br1an67/OpenJobAutofill

Pinned revision: `005eda98841b3671ead615ebfde5922f0dfd7c36` (MIT).

`lib/page-scanner.ts` adapts `getTextWithoutControls`, `findFieldContainer`
and `getNearbyText` from upstream `src/content.js`. Section/record grouping
and `lib/fill-executor.ts` generic choice interactions build on the same
module's approach, with locally scoped options and post-fill verification.

Our implementation preserves explicit site rules, adds record-index mapping,
skips unrelated people, avoids auto-save/submit and rejects search-only success.
Generic repeater discovery and analytics integration are project additions.
This is a targeted port, not the complete upstream extension or its AI module.

Full MIT copyright and permission notice ships in
`public/THIRD_PARTY_NOTICES.txt`, copied into every built extension and ZIP.

For upstream updates: review changes against the pinned revision, port only
relevant functions, update this notice, then run `pnpm --dir extension test`,
`pnpm --dir extension typecheck` and `pnpm --dir extension build`.
