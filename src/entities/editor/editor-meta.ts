/**
 * Editor metadata persisted alongside resume content in the DB.
 * Stored under the `__editorMeta` key inside the `content` JSON column.
 */
import type { ThemeTokens } from '@/entities/theme/theme-tokens'

/** Subset of ThemeTokens that one-page mode may adjust and later restore. */
export interface AdjustableTokens {
  readonly lineHeight: number
  readonly spacingScale: number
  readonly fontSize: number
}

/**
 * Per-resume editor state that is saved/loaded together with resume data.
 */
export interface EditorMeta {
  /** Theme overrides keyed by template ID (e.g. "simple"). */
  readonly themes: Record<string, ThemeTokens>
  /** Whether one-page mode is currently active. */
  readonly onePageMode: boolean
  /** Theme values captured right before one-page mode was enabled. */
  readonly onePageSnapshot: AdjustableTokens | null
  /** Section IDs placed in the sidebar column (used by two-column templates like warm). */
  readonly sidebarSectionIds?: readonly string[]
}

/** Sensible defaults when no persisted meta exists (e.g. new resume). */
export const DEFAULT_EDITOR_META: EditorMeta = {
  themes: {},
  onePageMode: false,
  onePageSnapshot: null,
  sidebarSectionIds: undefined,
}

/**
 * Extract `__editorMeta` from a raw DB content object.
 * Returns the meta and a cleaned content object without the meta key.
 */
export function extractEditorMeta(raw: Record<string, unknown>): {
  content: Record<string, unknown>
  meta: EditorMeta
} {
  const { __editorMeta, ...content } = raw
  const meta: EditorMeta = isEditorMeta(__editorMeta)
    ? __editorMeta
    : DEFAULT_EDITOR_META
  return { content, meta }
}

/**
 * Merge editor meta back into a content object for DB persistence.
 */
export function embedEditorMeta(
  content: Record<string, unknown>,
  meta: EditorMeta,
): Record<string, unknown> {
  return { ...content, __editorMeta: meta }
}

/** Runtime type guard. */
function isEditorMeta(value: unknown): value is EditorMeta {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.onePageMode === 'boolean' &&
    (v.onePageSnapshot === null || typeof v.onePageSnapshot === 'object') &&
    typeof v.themes === 'object' &&
    v.themes !== null
  )
}
