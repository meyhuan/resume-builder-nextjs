'use client'

import { Languages, MessageSquare, Sparkles, Target } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ReactElement } from 'react'
import { track } from '@/lib/analytics'
import { createMobileToolPath, type MobileTool } from '@/lib/platform/route'
import { useInMiniProgram } from '../../_components/use-mini-program'

interface AiToolsEntryProps {
  readonly resumeId: string
  readonly onOpenAssistant?: () => void
}

/** 4-item AI career tools matrix for mobile edit home. */
export function AiToolsEntry({ resumeId, onOpenAssistant }: AiToolsEntryProps): ReactElement {
  const router = useRouter()
  const inMiniProgram = useInMiniProgram()

  const openTool = (tool: MobileTool): void => {
    track('ai_tool_open', {
      tool,
      resumeId,
      source: inMiniProgram ? 'mini' : 'mobile_web',
      entry: 'mobile_edit_home',
    })

    if (tool === 'assistant' && onOpenAssistant) {
      onOpenAssistant()
      return
    }

    router.push(
      createMobileToolPath({
        resumeId,
        tool,
        source: inMiniProgram ? 'mini' : 'web',
        returnTo: `/m/edit?id=${encodeURIComponent(resumeId)}`,
      }),
    )
  }

  return (
    <section className="mx-3 mt-3 rounded-2xl border border-violet-100 bg-white p-3 shadow-xs">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles size={16} className="text-violet-600" />
          <span className="text-sm font-semibold text-slate-800">AI 求职加速工具</span>
        </div>
        <span className="text-[11px] font-medium text-violet-600">针对岗位量身优化</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => openTool('assistant')}
          className="flex h-11 items-center justify-start gap-2 rounded-xl bg-violet-600 px-3 text-xs font-semibold text-white active:scale-[0.98]"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/20">
            <Sparkles size={13} />
          </div>
          <div className="flex flex-col text-left">
            <span>AI 对话助手</span>
            <span className="text-[10px] text-violet-100 font-normal">全文润色 & 诊断</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openTool('interview-prep')}
          className="flex h-11 items-center justify-start gap-2 rounded-xl bg-purple-50 px-3 text-xs font-semibold text-purple-700 active:scale-[0.98] border border-purple-100"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
            <MessageSquare size={13} />
          </div>
          <div className="flex flex-col text-left">
            <span>打招呼 & 面试</span>
            <span className="text-[10px] text-purple-500 font-normal">开场白与高频题</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openTool('jd-match')}
          className="flex h-11 items-center justify-start gap-2 rounded-xl bg-sky-50 px-3 text-xs font-semibold text-sky-700 active:scale-[0.98] border border-sky-100"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
            <Target size={13} />
          </div>
          <div className="flex flex-col text-left">
            <span>JD 岗位匹配</span>
            <span className="text-[10px] text-sky-500 font-normal">测契合度补关键词</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => openTool('translate')}
          className="flex h-11 items-center justify-start gap-2 rounded-xl bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 active:scale-[0.98] border border-emerald-100"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <Languages size={13} />
          </div>
          <div className="flex flex-col text-left">
            <span>简历双语翻译</span>
            <span className="text-[10px] text-emerald-500 font-normal">生成独立英文版</span>
          </div>
        </button>
      </div>
    </section>
  )
}
