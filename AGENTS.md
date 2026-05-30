# Project Context for AI Assistant

## Project Overview

**AI简历构建器（aijianli.cn）** — An AI-powered online resume builder targeting Chinese job seekers.
Users can create, edit, import, and export professional resumes with the help of AI parsing and generation.

**Tech Stack:**
- Next.js 15 + React 19 + TypeScript
- TailwindCSS v4 (theme tokens in `src/styles/tailwind.css`)
- Radix UI primitives + shadcn/ui patterns
- Framer Motion for animations
- Lexical rich text editor
- @dnd-kit for drag-and-drop
- Zustand for state management
- Prisma + Supabase (PostgreSQL)
- Aliyun OSS, DocMind SDK, DashScope (Qwen LLM)

**Color Palette (primary theme):**
- Primary: `#7c3aed` (violet-600)
- Secondary: `#d946ef` (fuchsia-500)
- Accent: `#8b5cf6` (violet-500)
- Background: `#ffffff`
- Foreground: `#0f172a` (slate-900)
- Muted: `#f5f3ff` (violet-50)
- Border: `#e5e7eb` (gray-200)
- Border radius: `0.75rem`

**Fonts:** Inter (UI), Noto Sans SC (Chinese content)

---

## Design Context

### Users
Chinese job seekers of all types — fresh graduates, mid-career changers, and experienced professionals.
They want to quickly produce a polished, professional resume with minimal effort.
Context: often time-pressured before an interview or application deadline.
Job to be done: go from raw experience → impressive resume in under 10 minutes.

### Brand Personality
**智能 · 专业 · 高效** (Intelligent · Professional · Efficient)

- Voice: confident, concise, encouraging — like a senior HR consultant helping you
- Tone: authoritative but approachable; never condescending
- Emotional goal: users should feel **capable and prepared**, not overwhelmed

### Aesthetic Direction
- **Visual tone:** Modern tech product — clean, minimal, purposeful
- **Theme:** Light mode primary; violet/fuchsia gradient accent conveys AI/intelligence
- **Motion:** Subtle, purposeful animations (framer-motion already in use); no gratuitous effects
- **Density:** Medium — enough breathing room to feel premium, not so sparse it feels empty
- **Anti-references:** Avoid cluttered government-style UI, overly playful toy-like aesthetics, or dark hacker themes

### Design Principles

1. **Clarity over cleverness** — Every UI element should have an obvious purpose. No mystery meat navigation, no hidden affordances.

2. **AI feels like a superpower, not a black box** — When AI is working, show meaningful progress. When it fails, explain clearly and give next steps. Users should always feel in control.

3. **Chinese-first typography** — Noto Sans SC for all resume content. Adequate line-height (1.6–1.8) and letter-spacing for Chinese characters. Never truncate Chinese text unexpectedly.

4. **Efficiency is respect** — Minimize clicks to core tasks (create, import, edit, export). Defaults should be sensible. Forms should auto-focus. Errors should be inline, not modal-blocking.

5. **Premium without being cold** — Use violet/fuchsia accents sparingly as signals of AI-powered features. Backgrounds stay white/light-gray. Cards have subtle shadows. Interactions have gentle feedback (hover states, micro-animations).

---

## Resume Template Creation Workflow

When asked to create a resume template from a reference image and/or HTML, follow the project workflow in `docs/template-creation-workflow.md`.

Key rule: never implement a resume template as static HTML only. New templates must preserve the editor's existing behaviors: editable base info, avatar upload, editable job intention, editable sections, drag-and-drop, block add/delete/reorder, AI polish/generate actions, mobile preview, print/export rendering, theme controls, and one-page/layout controls where applicable.
