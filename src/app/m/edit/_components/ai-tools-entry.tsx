'use client'

import { Languages, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ReactElement } from 'react'
import { track } from '@/lib/analytics'
import { createMobileToolPath } from '@/lib/platform/route'
import { useInMiniProgram } from '../../_components/use-mini-program'

interface AiToolsEntryProps {
  readonly resumeId: string
}

/** Compact entry shared by the mobile web editor and the mini-program web-view. */
export function AiToolsEntry({ resumeId }: AiToolsEntryProps): ReactElement {
  const router = useRouter()
  const inMiniProgram = useInMiniProgram()
  const openTool = (tool: 'assistant' | 'translate'): void => {
    track('ai_tool_open', {
      tool,
      resumeId,
      source: inMiniProgram ? 'mini' : 'mobile_web',
      entry: 'mobile_edit_home',
    })
    router.push(createMobileToolPath({
      resumeId,
      tool,
      source: inMiniProgram ? 'mini' : 'web',
      returnTo: `/m/edit?id=${encodeURIComponent(resumeId)}`,
    }))
  }
  return (
    <section className="mx-3 mt-3 rounded-2xl border border-violet-100 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles size={16} className="text-violet-600" />
        <span className="text-sm font-semibold text-slate-800">AI 简历助手</span>
        <span className="text-xs text-slate-400">编辑中可随时使用</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => openTool('assistant')}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-violet-600 text-sm font-semibold text-white active:scale-[0.98]"
        >
          <Sparkles size={15} /> AI 助手
        </button>
        <button
          type="button"
          onClick={() => openTool('translate')}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-violet-50 text-sm font-semibold text-violet-700 active:scale-[0.98]"
        >
          <Languages size={15} /> 翻译简历
        </button>
      </div>
    </section>
  )
}
