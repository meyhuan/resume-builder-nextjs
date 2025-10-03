/**
 * Shared editor styles for content blocks.
 */

/**
 * Base content styles for editable content blocks.
 * Includes text styling, list styling, and interaction states.
 */
export const CONTENT_BASE_STYLES = 'leading-relaxed text-gray-800'

/**
 * List styles for ul/ol elements.
 */
export const LIST_STYLES = '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_li]:ml-0'

/**
 * Interactive styles for clickable content (hover, cursor).
 */
export const INTERACTIVE_STYLES = 'cursor-text hover:bg-gray-50 rounded p-1 transition-colors'

/**
 * Editing state styles (border, background).
 */
export const EDITING_STYLES = 'relative rounded p-1 border border-blue-500 bg-white'

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
