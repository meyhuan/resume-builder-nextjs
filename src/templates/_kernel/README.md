# Resume Template Kernel

A config-driven scaffold for building new resume templates with **zero handwritten orchestration**.

## Why

Existing templates (`simple`, `elegant`, `warm`, `timeline`) each have ~300 lines of nearly-identical boilerplate:
- DnD wiring
- Section + block lifecycle (add/delete/move/polish/generate)
- Avatar upload + crop + edit modal
- Section header delete dialog
- `jobIntentionVisible` / `showAvatar` handling
- Theme token propagation (font size, color, line height, padding)

The kernel extracts all of this behind a single `defineTemplate(config)` factory so new templates are **just visual configuration**.

## Add a template in ~30 lines

```tsx
// src/templates/my-template/index.tsx
import { defineTemplate } from '@/templates/_kernel/define-template'

export default defineTemplate({
  id: 'my-template',
  name: '我的模板',
  description: '...',
  layout: 'single-column',
  accents: { primary: '#3aa89f' },
  header: {
    variant: 'avatar-left-inline',
    avatarShape: 'circle',
    separator: '|',
  },
  sectionHeader: {
    variant: 'ribbon-banner',
    from: '#3aa89f',
    to: '#b8e0db',
  },
  block: { variant: 'default' },
})
```

Then register it in `src/templates/template-loader.ts`:

```ts
'my-template': {
  id: 'my-template', name: '我的模板', description: '...',
  component: lazy(() => import('@/templates/my-template')),
},
```

That's it. DnD, avatar upload, AI polish/generate, theme tokens, `jobIntentionVisible`, section rename / delete — all wired automatically.

## What's covered out of the box

| Concern | Mechanism |
|---|---|
| Font size / line height / color / family | `theme.fontSize`, `theme.lineHeight`, `theme.textColor`, `theme.fontFamily` |
| Page padding | `theme.pagePadding{Vertical,Horizontal}` or `page.paddingOverride` |
| Theme primary color | `theme.primaryColor`, with fallback via `accents.primary` when user sticks to default dark |
| Avatar visibility | `baseInfo.showAvatar === false` hides avatar across all variants |
| Job intention visibility | `resume.jobIntentionVisible` toggles the whole block |
| Job intention placement | `jobIntention.placement`: `'header-row' \| 'body-top' \| 'sidebar' \| 'hidden'` (推荐 `body-top`，与 `simple`/`timeline`/`elegant` 一致) |
| Job intention look | `jobIntention.styles` 透传给 v2 `JobIntentionSection`（支持 `layout: 'ribbon'` 旗帜样式、字段网格、图标颜色等） |
| Section reorder (DnD) | Auto (reuses `DragDropProvider` / `TwoColumnDndProvider`) |
| Cross-column drag (two-column) | Auto — text-only sections can move between sidebar and main |
| Block add / delete / up / down / AI polish / AI generate | Auto via existing `BlockWrapper` |
| Section title rename / delete | Auto via `KernelSectionHeader` |
| Avatar upload + crop modal | Auto via `useHeaderState` |
| Export pagination | Nothing extra required — the DOM structure is identical to existing templates |

## Schema (condensed)

See [`types.ts`](./types.ts) for the authoritative source.

```ts
interface KernelTemplateConfig {
  id: string
  name: string
  description: string
  layout: 'single-column' | 'two-column'
  sidebar?: SidebarSpec              // required when layout === 'two-column'
  header: HeaderSpec                 // 5 variants today
  sectionHeader: SectionHeaderSpec   // 5 variants today
  block: BlockSpec                   // 3 variants today
  jobIntention?: { placement: ... }
  accents?: { primary?: string }
  page?: { backgroundColor?, mainBackgroundColor?, bleed?, paddingOverride? }
}
```

### Header variants

| Variant | Looks like | Typical use |
|---|---|---|
| `avatar-left-inline` | Circle/rounded avatar + name + inline fields with `\|` separators | Clean résumés |
| `banner-gradient` | Color-gradient banner with avatar overlapping the left edge | Modern bold |
| `dark-bar` | Dark solid banner with accent stripe | Formal |
| `sidebar-avatar` | Avatar lives in the sidebar column; creative decor supported | Two-column creative |
| `centered` | Stacked avatar → name → fields | Minimal |

### Section-header variants

| Variant | Looks like |
|---|---|
| `underline` | Bold title with colored underline |
| `left-bar` | Left colored bar + optional gradient fade |
| `ribbon-banner` | Colored ribbon with angled tail (Image 2) |
| `dot-before` | Small colored dot before title |
| `plain-bold` | Just bold text |

### Block variants

| Variant | Layout |
|---|---|
| `default` | Title / subtitle / date in a row, content below |
| `timeline-left-date` | Date in a left column, dot on axis, content right (Image 3) |
| `compact` | Tight spacing |

## Extending the kernel

1. **New header variant** — add a case to `HeaderSpec` in `types.ts` and a branch in `headers.tsx`.
2. **New section-header variant** — same in `section-headers.tsx`.
3. **New block layout** — same in `block-views.tsx`.
4. **New decoration** (skill bars / rings / dot pattern) — add a component under `_kernel/decorations/` and reference it through `SidebarSpec.skillStyle`.

## Demo

`src/templates/ribbon-teal/index.tsx` is a production-ready template built 100% through config — reproduces Image 2 (teal ribbon banners).
