# Resume Template Creation Workflow

Use this workflow whenever a user provides a reference image and/or HTML and asks for a matching resume template under `src/templates/`.

## Goal

Create a new visual template that matches the reference while preserving all existing editor, mobile preview, and export functionality.

Do not copy the reference as static HTML. Implement the template using the project's editable/headless primitives and existing resume data model.

## Required Inputs

- Reference image or screenshot.
- Reference HTML/CSS when provided.
- Desired template id/name if the user provides one. If not, choose a concise semantic id.
- A real editor URL for verification when available, for example `/editor/<resumeId>`.

If the reference screenshot is only provided in chat, save it to a local file when possible and pass that file to `--reference-image`. Without a filesystem path, the QA report can still include implementation screenshots, but it cannot embed the original reference image.

## Measurement And Scaling

1. Read the reference HTML/CSS first.
2. Extract the design canvas width/height, page padding, header height, avatar size, section gaps, title sizes, body font size, line-height, columns, decorative line positions, and colors.
3. Convert reference px values to the editor A4 width before implementing.
   - The PC editor A4 page is about `794px` wide.
   - If the reference HTML uses a different width, scale values by `794 / referenceWidth`.
   - Example: a `1228px` wide reference should use a scale of about `0.647`.
4. Keep user-adjustable theme controls functional. Avoid hardcoding values that should follow `theme.fontSize`, `theme.lineHeight`, `theme.spacingScale`, or `theme.primaryColor`.
   - If the visual design needs a default multiplier, derive from the theme, e.g. `theme.lineHeight * 1.26`, not a fixed `lineHeight: 1.9`.

## Implementation Rules

Use existing primitives wherever possible:

- `ResumeFrame` for the root wrapper and drag/drop context.
- `useEditableHeader` for name, base info, avatar upload, field delete, and base-info modal.
- `AvatarSlot` for avatar rendering.
- `FieldChip` for editable/deletable base info fields.
- `useEditableJobIntention` for job intention rendering, field delete, and modal.
- `SortableSection` and `useEditableSection` for section drag, title editing, add block, and delete.
- `BlockWrapper` around each resume block to preserve add/delete/move/AI actions.
- `EditableFieldWrapper` for structured block fields.
- `EditableDateField` for date fields.
- `EditableBlockWrapper` for rich text fields.

Do not bypass these primitives unless there is a clear reason and you recreate the same behavior.

## Data Mapping

- Header name: `resume.name` through `useEditableHeader`.
- Header subtitle/role: prefer `baseInfo.title`, then fallback to `resume.jobIntention?.position`.
- Base info: render visible fields in the order implied by the reference when possible, but keep editing/deletion through `FieldChip`.
- Job intention:
  - If the reference omits it, still consider adding a visual-compatible optional section.
  - Render only when `resume.jobIntentionVisible ?? fields.length > 0` is true and fields exist.
  - Put it where it makes sense for the design, usually before normal sections.
- Normal sections: render `resume.sections` in order.
- Text-only/custom sections must still support editable custom titles and rich text.
- Structured blocks must support their own field editing and rich text editing.

## Registration Checklist

For a new template `<id>`:

1. Add `src/templates/<id>/index.tsx`.
2. Register it in `src/templates/template-loader.ts`.
3. If public/template gallery data is separate, register it in `src/lib/templates/template-catalog.ts`.
4. Add or generate a thumbnail under `public/thumbnails/`.
5. Use a real rendered resume thumbnail in `.webp` format for new production templates. Do not hand-draw an SVG thumbnail unless it is a temporary placeholder while the template is still being designed.
6. If the template has a full-bleed header or special top layout, add the id to `BLEED_TEMPLATE_IDS` in `src/app/print/[id]/page.tsx`.

## Thumbnail Generation

After registering the template and before final QA, generate the template cover from the actual rendered resume:

```bash
corepack pnpm template:thumbs <id> --base-url http://127.0.0.1:3000
```

If multiple newly changed templates need covers, pass multiple ids:

```bash
corepack pnpm template:thumbs <id-1> <id-2> --base-url http://127.0.0.1:3000
```

If no template id is passed, the script regenerates all currently registered templates whose `preview` still points to `public/thumbnails/template_<id>.svg`.

To regenerate all registered template covers, use:

```bash
corepack pnpm template:thumbs --all --base-url http://127.0.0.1:3000
```

The thumbnail script:

- Loads `/dev/scenario-loader?tpl=<id>` with the standard example resume data.
- Injects `public/avatar.jpg` into the scenario resume by default when that file exists, so covers show the same certificate photo users see in templates.
- Captures the actual A4 resume preview area, not the whole browser page.
- Resizes/crops the image to `420x594`, matching the existing A4 thumbnail ratio.
- Converts the result to `public/thumbnails/template_<id>.webp`.

After generation:

1. Update `src/templates/template-loader.ts` to point `preview` to `/thumbnails/template_<id>.webp`.
2. Update `src/lib/templates/template-catalog.ts` if the template is listed there.
3. Delete the old `template_<id>.svg` placeholder if it exists.
4. Visually inspect at least one generated cover to confirm it is not blank, cropped incorrectly, or showing the scenario-loader chrome.

## Verification Checklist

Always run the fixed automated checks before reporting a template as done.

If the dev server is not running, start it first:

```bash
corepack pnpm dev
```

For every changed template `<id>`, run:

```bash
corepack pnpm template:thumbs <id> --base-url http://127.0.0.1:3000
corepack pnpm template:qa <id> --local --base-url http://localhost:3000 --scenario-loader-url "http://localhost:3000/dev/scenario-loader?tpl=<id>" --report --reference-image <reference-image-path>
corepack pnpm exec tsc --noEmit
corepack pnpm exec eslint <changed files>
```

If `localhost` returns a connection error or an empty 503 while the dev server is running, retry with `127.0.0.1` and the active port, for example `http://127.0.0.1:3001/dev/scenario-loader?tpl=<id>`.

What these checks must cover:

- Template registration, lazy import, thumbnail asset, and theme contract.
- Generated `.webp` cover exists, has A4 thumbnail dimensions, and is referenced by both template registries when applicable.
- Local PC rendering, mobile rendering, sparse data, long content, and rich text.
- Theme controls: font size, line height, spacing, title scale, page padding, and primary color when not intentionally locked.
- One-click realistic resume data fill through the scenario loader.
- Rendered output after one-click fill, including base info, job intention, long company/project text, salary, and custom fields.

When multiple templates changed, run the local check for each template. The scenario loader check can run once for the primary template being verified unless the one-click fill behavior is template-specific.

The scenario loader exists because authenticated editor routes can redirect to login in headless browser tests. It must reuse the same right-sidebar scenario loading action and the same app store path as the real editor, so it verifies the core flow: user action -> store update -> template preview render.

Then verify in a browser using a real editor route when available:

1. Open the provided editor URL.
2. Switch to the new template.
3. Confirm first-screen visual match against the reference.
4. Confirm computed dimensions are scaled correctly for the A4 page:
   - page width around `794px`
   - header height and major text sizes proportional to the reference
   - decorative elements aligned with section headings
5. Test or inspect that these still exist:
   - base info edit modal
   - avatar upload overlay
   - job intention edit modal if rendered
   - section drag handle
   - section delete
   - block add/delete/move
   - AI polish/generate actions for supported blocks
   - rich text editing
6. Change theme controls that the template should honor:
   - font size
   - line height
   - spacing scale
   - title scale
   - primary color unless intentionally locked
7. Check print/export behavior if the template uses bleed/full-width header styling.

## Test Report Requirement

After automated testing, always include a concise report in the assistant response. Do not just say "tested".

Also write a Markdown report file under `test-artifacts/reports/`. The template QA script can do this automatically with `--report`, for example:

```text
test-artifacts/reports/template-qa-<id>-YYYY-MM-DD-HHMMSS.md
```

`test-artifacts/` is intentionally git-ignored, so this report is a local QA artifact for the user to inspect after the run. Report filenames include time to preserve repeated QA runs during iteration instead of overwriting earlier evidence.

Use this format:

```text
测试对象：
执行命令：
覆盖范围：
通过项：
失败项：
截图/产物：
仍需人工确认：
结论：
```

Report rules:

- List the exact commands that were run.
- State whether each command passed or failed.
- Mention generated screenshots or artifacts, for example `test-artifacts/templates/<id>/`.
- Embed the most important screenshots directly in the Markdown report with relative image links, usually the long-content screenshot and the scenario-loader screenshot.
- When a reference screenshot exists, pass it through `--reference-image <path>` so the report includes a side-by-side section for reference vs implementation. Use this section to manually compare the header/base-info area, avatar, module heading style, main color, borders, spacing, and information density.
- Complete the visual comparison checklist in the report before calling the template done. The checklist is intentionally human-facing: it verifies design similarity that automated assertions cannot fully prove.
- If a real editor URL could not be tested because of authentication, say so and explain that `/dev/scenario-loader` covered the same scenario-loading store/render path.
- If anything failed or was skipped, state the impact and the next step.
- Keep the report short enough for quick review, but specific enough that the user can trust what was actually checked.

## Common Pitfalls

- Reference HTML px values are usually too large for the editor A4 width. Scale them.
- Do not hardcode body line-height or spacing if the right-side layout controls should affect them.
- Do not hide job intention permanently unless the user explicitly asks for that.
- Do not put interactive action buttons in printed output; use `print:hidden`.
- Avoid decorative elements that only align in one sample resume; inspect actual editor data.
- Avoid `rgba(...)` backgrounds for print-sensitive template accents when color fidelity matters; use opaque blended colors if needed.
- If browser screenshots fail, still inspect DOM layout and computed styles through browser automation, but state the limitation clearly.
- In Next dev, newly added dynamic templates can occasionally hit stale chunk errors such as `Cannot read properties of undefined (reading 'call')`. If this happens after editing a template, stop the dev server, remove `.next/`, restart the dev server, and rerun the same QA command.
