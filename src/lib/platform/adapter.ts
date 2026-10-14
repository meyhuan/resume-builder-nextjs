export type PlatformKind = 'web' | 'mini_program_webview'

export type NativeAction =
  | 'setTitle'
  | 'downloadPdf'
  | 'openDocument'
  | 'share'
  | 'chooseFile'

export interface PlatformMessage {
  readonly action: NativeAction
  readonly [key: string]: unknown
}

export interface PlatformCapabilities {
  readonly share: boolean
  readonly chooseFile: boolean
  readonly openDocument: boolean
  readonly downloadPdf: boolean
}

interface MiniProgramApi {
  readonly postMessage?: (payload: { data: PlatformMessage }) => void
}

function getMiniProgramApi(): MiniProgramApi | null {
  if (typeof window === 'undefined') return null
  const runtime = window as unknown as { wx?: { miniProgram?: MiniProgramApi } }
  return runtime.wx?.miniProgram ?? null
}

export function isMiniProgramWebView(): boolean {
  if (typeof window === 'undefined') return false
  const runtime = window as unknown as { __wxjs_environment?: string }
  return runtime.__wxjs_environment === 'miniprogram' || Boolean(getMiniProgramApi())
}

export function getPlatformKind(): PlatformKind {
  return isMiniProgramWebView() ? 'mini_program_webview' : 'web'
}

export function postPlatformMessage(message: PlatformMessage): boolean {
  const miniProgram = getMiniProgramApi()
  if (!miniProgram?.postMessage) return false
  miniProgram.postMessage({ data: message })
  return true
}

export function setPlatformTitle(title: string): void {
  if (isMiniProgramWebView()) {
    postPlatformMessage({ action: 'setTitle', title })
  }
  if (typeof document !== 'undefined') document.title = title
}

export function requestPlatformAction(
  action: Exclude<NativeAction, 'setTitle'>,
  payload: Record<string, unknown> = {},
): boolean {
  return postPlatformMessage({ action, ...payload })
}

export function getPlatformCapabilities(): PlatformCapabilities {
  if (!isMiniProgramWebView()) {
    return { share: false, chooseFile: false, openDocument: false, downloadPdf: false }
  }
  return { share: false, chooseFile: false, openDocument: true, downloadPdf: true }
}

export const platformAdapter = {
  get kind(): PlatformKind {
    return getPlatformKind()
  },
  isMiniProgram: isMiniProgramWebView,
  get capabilities(): PlatformCapabilities {
    return getPlatformCapabilities()
  },
  postMessage: postPlatformMessage,
  request: requestPlatformAction,
  setTitle: setPlatformTitle,
}
