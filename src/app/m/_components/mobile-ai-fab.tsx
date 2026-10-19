'use client'

import { type ReactElement } from 'react'
import { Sparkles } from 'lucide-react'
import { track } from '@/lib/analytics'

interface MobileAiFabProps {
  readonly onClick: () => void
  readonly resumeId?: string
}

export function MobileAiFab({ onClick, resumeId }: MobileAiFabProps): ReactElement {
  const handleClick = (): void => {
    track('ai_tool_open', {
      tool: 'assistant',
      resumeId: resumeId || '',
      source: 'fab',
      entry: 'mobile_edit_home',
    })
    onClick()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="打开 AI 简历助手"
      className="fixed bottom-24 right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-500 text-white shadow-lg shadow-violet-500/35 transition-transform active:scale-95"
    >
      <div className="relative flex items-center justify-center">
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-pink-500" />
        </span>
        <Sparkles size={24} className="animate-pulse" />
      </div>
    </button>
  )
}
