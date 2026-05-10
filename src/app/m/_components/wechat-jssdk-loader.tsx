'use client'

import { type ReactElement } from 'react'
import Script from 'next/script'
import { createLogger } from '@/lib/logger'

const log = createLogger('m/wechat-jssdk')
const WECHAT_JSSDK_URL = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js'

export default function WechatJssdkLoader(): ReactElement {
  return (
    <Script
      src={WECHAT_JSSDK_URL}
      strategy="beforeInteractive"
      onLoad={(): void => {
        const wxReady: boolean = typeof window !== 'undefined' && !!window.wx
        const miniProgramReady: boolean = !!window.wx?.miniProgram
        const environment: string | undefined = (window as unknown as { __wxjs_environment?: string }).__wxjs_environment
        log.info('JSSDK loaded', { wxReady, miniProgramReady, environment })
      }}
      onError={(error: Error): void => {
        log.error('JSSDK load failed', { src: WECHAT_JSSDK_URL, error: error.message })
      }}
    />
  )
}
