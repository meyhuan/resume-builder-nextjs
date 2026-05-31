# Template verification

Use this checklist whenever a new resume template is added or an existing template changes.

## Static gate

Run:

```bash
pnpm verify:template <template-id> --typecheck
```

For a full registry sweep:

```bash
pnpm verify:template --all --typecheck
```

This checks:

- `TEMPLATE_REGISTRY` contains the template.
- Registry metadata is complete: `id`, `name`, `description`, `tags`, `preview`, `component`.
- The lazy import points to `@/templates/<template-id>`.
- The preview thumbnail exists under `public/`.
- Locked-color templates also define `recommendedPrimaryColor`.
- `src/templates/<template-id>/index.tsx` exists and default-exports a component.
- The template has basic `resume` and `theme` integration signals.
- The full TypeScript project still typechecks.

Any `FAIL` result blocks merge or deployment. `WARN` results should be reviewed before release.

## Runtime gate

For template development, prefer the local fixture gate. It does not read the
database and does not require a print token.

Start the app first, then run:

```bash
pnpm verify:template <template-id> --local --base-url http://localhost:3000
```

For all registered templates:

```bash
pnpm verify:template --all --local --base-url http://localhost:3000
```

The local gate opens `/dev/template-lab` with mock resume fixtures and checks:

- PC rendering with full data.
- Mobile rendering without document-level horizontal overflow.
- Sparse data rendering.
- Long data rendering.
- Rich text rendering for strong text, lists, and links.
- Theme settings for font size, line height, padding, title scale, and paragraph indent.
- Primary color behavior for configurable templates.
- Locked primary-color behavior for flagship templates.
- Screenshots under `test-artifacts/templates/<template-id>/`.

The database/export gate is optional and should be used only when you want to
verify the real saved-resume and print/export path:

```bash
pnpm verify:template <template-id> \
  --base-url http://localhost:3000 \
  --resume-id <resume-id> \
  --print-token-secret <PRINT_TOKEN_SECRET>
```

The runtime gate checks:

- `/next-api/templates` exposes the template metadata.
- Mobile H5 preview loads at `/m/preview?id=<resume-id>&tpl=<template-id>`.
- The mobile viewport does not have document-level horizontal overflow.
- The print/export page loads at `/print/<resume-id>?tpl=<template-id>&token=...`.
- The print page reaches `data-print-ready="1"` and carries the expected `data-print-template`.
- Screenshots are written to `test-artifacts/templates/<template-id>/`.

For authenticated PC editor coverage, pass an explicit URL after logging in:

```bash
pnpm verify:template <template-id> \
  --pc-url http://localhost:3000/dashboard/resumes/<resume-id>/edit
```

If a route needs a custom URL, use `--mobile-url` or `--print-url` to override the generated URL.

## Release expectation

A template is acceptable only when the static gate passes and the runtime gate has been exercised against representative resume data:

- sparse resume data
- normal one-page resume data
- long multi-page resume data
- PC web editor path
- mobile H5 preview path
- print/export path
