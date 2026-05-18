'use client'

import { type ReactElement } from 'react'

interface GreetingBannerProps {
  readonly name?: string
}

/**
 * Professional page intro for the mobile edit workspace.
 */
export function GreetingBanner({ name }: GreetingBannerProps): ReactElement {
  const displayName: string = name?.trim() || '未命名简历'
  return (
    <div className="px-4 pt-4 pb-2">
      <div className="text-[11px] font-medium text-slate-500">编辑工作台</div>
      <h1 className="mt-1 text-[22px] font-semibold text-slate-950 leading-snug tracking-normal">
        {displayName}
      </h1>
      <p className="mt-1 text-[13px] leading-5 text-slate-500">
        按模块完善内容，保持简历清晰、专业、可投递。
      </p>
    </div>
  )
}
