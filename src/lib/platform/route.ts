export type MobileTool = 'assistant' | 'translate'
export type RouteSource = 'web' | 'mini'

export interface MobileToolRouteOptions {
  readonly resumeId: string
  readonly tool: MobileTool
  readonly source?: RouteSource
  readonly returnTo?: string
}

export function createMobileToolPath(options: MobileToolRouteOptions): string {
  const params = new URLSearchParams()
  params.set('id', options.resumeId)
  params.set('tool', options.tool)
  if (options.source) params.set('source', options.source)
  if (options.returnTo) params.set('returnTo', options.returnTo)
  return `/m/edit/tools?${params.toString()}`
}

export function createMobileEditPath(resumeId: string): string {
  return `/m/edit?id=${encodeURIComponent(resumeId)}`
}

export function getSafeReturnPath(value: string | undefined, fallback: string): string {
  if (!value) return fallback
  try {
    const decoded = decodeURIComponent(value)
    if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('://')) return fallback
    return decoded
  } catch {
    return fallback
  }
}

export function replaceResumeId(path: string, resumeId: string): string {
  try {
    const url = new URL(path, 'https://aijianli.local')
    url.searchParams.set('id', resumeId)
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return createMobileEditPath(resumeId)
  }
}
