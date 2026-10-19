'use client'

import { type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Languages, MessageSquare, Sparkles, Target } from 'lucide-react'
import { track } from '@/lib/analytics'
import { createMobileToolPath, type MobileTool } from '@/lib/platform/route'
import { useInMiniProgram } from '../../_components/use-mini-program'

interface AiToolsEntryProps {
  readonly resumeId: string
  readonly onOpenAssistant?: () => void
}

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
    <section className="mx-3 mt-2 rounded-[18px] border border-[#edf0f5] bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.045)] space-y-2.5">
      {/* Primary In-Editor Action: AI Resume Assistant Drawer */}
      <button
        type="button"
        onClick={() => openTool('assistant')}
        className="flex w-full items-center justify-between gap-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2.5 text-left text-white shadow-xs transition active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <Sparkles size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-semibold leading-5">AI 简历助手</span>
              <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-medium leading-none">
                实时润色
              </span>
            </div>
            <p className="truncate text-[11px] text-violet-100 mt-0.5">
              全文诊断、经历量化润色，一键采纳直接同步草稿
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-white/15 px-2 py-1 text-[11px] font-semibold">
          <span>唤起</span>
          <ChevronRight size={13} />
        </div>
      </button>

      {/* Secondary Career Tools: Unified 1x3 Brand-Violet Bar */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => openTool('interview-prep')}
          className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-violet-100/90 bg-[#f8f7ff] px-2 text-[12px] font-semibold text-violet-700 transition active:scale-[0.98] active:bg-violet-100/70"
        >
          <MessageSquare size={14} className="text-violet-600 shrink-0" />
          <span className="truncate">打招呼/面试</span>
        </button>

        <button
          type="button"
          onClick={() => openTool('jd-match')}
          className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-violet-100/90 bg-[#f8f7ff] px-2 text-[12px] font-semibold text-violet-700 transition active:scale-[0.98] active:bg-violet-100/70"
        >
          <Target size={14} className="text-violet-600 shrink-0" />
          <span className="truncate">JD 岗位匹配</span>
        </button>

        <button
          type="button"
          onClick={() => openTool('translate')}
          className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-violet-100/90 bg-[#f8f7ff] px-2 text-[12px] font-semibold text-violet-700 transition active:scale-[0.98] active:bg-violet-100/70"
        >
          <Languages size={14} className="text-violet-600 shrink-0" />
          <span className="truncate">双语简历</span>
        </button>
      </div>
    </section>
  )
}
