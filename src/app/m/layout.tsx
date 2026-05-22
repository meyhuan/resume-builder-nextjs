import { type ReactElement, type ReactNode } from 'react'
import type { Metadata } from 'next'
import MobileDebugTools from './_components/mobile-debug-tools'
import WechatJssdkLoader from './_components/wechat-jssdk-loader'

export const metadata: Metadata = {
  title: {
    default: '智简简历',
    template: '%s',
  },
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
      {children}
    </>
  )
}
