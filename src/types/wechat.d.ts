/**
 * WeChat JSSDK globals injected by the mini-program webview bridge.
 */

interface WxMiniProgram {
  postMessage(options: { data: Record<string, unknown> }): void
  navigateBack(options?: { delta?: number }): void
  navigateTo(options: { url: string }): void
  switchTab(options: { url: string }): void
  reLaunch(options: { url: string }): void
  redirectTo(options: { url: string }): void
}

interface WxBridge {
  miniProgram: WxMiniProgram
}

interface Window {
  wx?: WxBridge
}
