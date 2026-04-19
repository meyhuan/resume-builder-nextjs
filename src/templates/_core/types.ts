/**
 * Public surface types used by headless templates.
 *
 * The `_core/` layer is the *stable* contract that flagship, hand-crafted
 * templates consume. Its shape is narrower and more opinionated than the
 * `_kernel/` config types — templates pull behavior from hooks and use
 * unstyled primitives to compose their own JSX freely.
 */
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'

/** Props passed from the template host into every template. */
export interface TemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  /** Optional: sidebar section ids (only relevant for two-column layouts). */
  readonly sidebarSectionIds?: readonly string[]
  readonly onSidebarSectionIdsChange?: (ids: readonly string[]) => void
}

/** DnD handle props surfaced to template JSX (from SortableSection). */
export interface DragHandleProps {
  readonly attributes: unknown
  readonly listeners: unknown
  readonly ref: (el: HTMLElement | null) => void
}
