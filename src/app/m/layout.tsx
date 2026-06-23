import { type ReactElement, type ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import MobileDebugTools from './_components/mobile-debug-tools'
import WechatJssdkLoader from './_components/wechat-jssdk-loader'
import MobilePageTransition from './_components/mobile-page-transition'

export const metadata: Metadata = {
  title: {
    default: '智简简历',
    template: '%s',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

/**
 * Root layout for all mobile (/m/*) pages. Ships the on-device debug panel
 * (vConsole) conditionally; see MobileDebugTools for activation rules.
 * Also injects WeChat JSSDK so wx.miniProgram API is available in webview.
 */
export default function MobileRootLayout(
  { children }: { readonly children: ReactNode },
): ReactElement {
  return (
    <>
      <WechatJssdkLoader />
      <MobileDebugTools />
      <MobilePageTransition>{children}</MobilePageTransition>
    </>
  )
}
