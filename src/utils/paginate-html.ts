import { PRINT_PAGINATION_CSS } from '@/lib/print-pagination'

/**
 * Backwards-compatible name for callers that still prepare standalone HTML.
 * Pagination itself is delegated to Chromium's print fragmentation engine;
 * this helper only injects the shared print contract.
 */
export function paginateHtml(html: string): string {
  const style = `<style data-print-pagination="true">${PRINT_PAGINATION_CSS}</style>`
  if (html.includes('</head>')) return html.replace('</head>', `${style}</head>`)
  if (html.includes('<body')) return html.replace('<body', `${style}<body`)
  return `${style}${html}`
}

/**
 * Kept for source compatibility with older integrations. The previous
 * implementation mutated block styles after layout, which could disagree
 * with print preview. Native CSS fragmentation must remain the only writer.
 */
export function getClientPaginationScript(): string {
  return 'void 0'
}

export default paginateHtml
