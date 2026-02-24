/**
 * Shared editor styles for content blocks.
 */

/**
 * Base content styles for editable content blocks.
 * Includes text styling, list styling, and interaction states.
 * Note: line-height is inherited from parent theme settings.
 */
export const CONTENT_BASE_STYLES = 'text-gray-800'

/**
 * List styles for ul/ol elements.
 */
export const LIST_STYLES = '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_li]:ml-0'

/**
 * Interactive styles for clickable content (hover, cursor).
 */
export const INTERACTIVE_STYLES = 'cursor-text hover:bg-gray-100 rounded p-1 transition-colors'

/**
 * Editing state styles (non-intrusive highlight).
 * Use ring instead of border to avoid layout shift when toggling edit mode.
 */
export const EDITING_STYLES = 'relative rounded p-1 ring-1 ring-[var(--color-ring)] bg-white rb-editing'

/**
 * Complete style for content display mode (inherits parent font size).
 */
export const CONTENT_DISPLAY_STYLES_XS = `${CONTENT_BASE_STYLES} ${INTERACTIVE_STYLES} ${LIST_STYLES}`

/**
 * Complete style for content editing mode (inherits parent font size).
 */
export const CONTENT_EDITING_STYLES_XS = `${EDITING_STYLES} ${CONTENT_BASE_STYLES} ${LIST_STYLES}`

/**
 * Complete style for content display mode (inherits parent font size).
 */
export const CONTENT_DISPLAY_STYLES_SM = `${CONTENT_BASE_STYLES} ${INTERACTIVE_STYLES} ${LIST_STYLES}`

/**
 * Complete style for content editing mode (inherits parent font size).
 */
export const CONTENT_EDITING_STYLES_SM = `${EDITING_STYLES} ${CONTENT_BASE_STYLES} ${LIST_STYLES}`
