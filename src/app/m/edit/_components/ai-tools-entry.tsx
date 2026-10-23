'use client'

import { type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Target } from 'lucide-react'
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
    <section className="mx-3 mt-2">
      <button type="button" onClick={() => openTool('jd-match')} className="flex min-h-12 w-full items-center gap-2 rounded-xl bg-violet-50 px-3 text-left text-sm text-violet-800">
        <Target size={16} className="shrink-0" />
        <span className="flex-1">对照目标岗位，看看哪里还能完善</span>
        <ChevronRight size={16} className="shrink-0" />
      </button>
    </section>
  )
}
