'use client'

import { type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { FileUp, Loader2, Monitor, Wand2 } from 'lucide-react'
import { usePcGuideEntry } from './use-pc-guide-entry'

/**
 * Highlighted shortcuts for high-frequency mobile edit actions.
 */
interface QuickActionsProps {
  readonly resumeId: string | null
  readonly template?: string | null
}

export function QuickActions({ resumeId, template }: QuickActionsProps): ReactElement {
  const router = useRouter()
  const { openingPcGuide, openPcGuide } = usePcGuideEntry({
    resumeId,
    template,
    source: 'quick-actions',
  })

  return (
    <div className="mx-3 mt-3 grid grid-cols-3 gap-2">
      <button
        type="button"
        onClick={(): void => router.push('/m/edit/ai-generate')}
        className="rounded-[16px] border border-violet-200/70 bg-gradient-to-br from-indigo-50 to-violet-50 p-3 text-left transition-transform active:scale-[0.98]"
      >
        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-white">
          <Wand2 size={16} />
        </div>
        <div className="text-[13px] font-semibold leading-5 text-slate-900">AI 生成</div>
        <div className="mt-0.5 text-[10px] leading-4 text-slate-500">自动成稿</div>
      </button>
      <button
        type="button"
        onClick={(): void => router.push('/m/edit/import')}
        className="rounded-[16px] border border-amber-200/70 bg-gradient-to-br from-amber-50 to-orange-50 p-3 text-left transition-transform active:scale-[0.98]"
      >
        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white">
          <FileUp size={16} />
        </div>
        <div className="text-[13px] font-semibold leading-5 text-slate-900">导入简历</div>
        <div className="mt-0.5 text-[10px] leading-4 text-slate-500">文件/粘贴</div>
      </button>
      <button
        type="button"
        onClick={(): void => { void openPcGuide() }}
        disabled={openingPcGuide}
        className="rounded-[16px] border border-sky-200/80 bg-gradient-to-br from-sky-50 to-blue-50 p-3 text-left transition-transform active:scale-[0.98] disabled:opacity-70"
      >
        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-sky-600 text-white">
          {openingPcGuide ? <Loader2 size={16} className="animate-spin" /> : <Monitor size={16} />}
        </div>
        <div className="text-[13px] font-semibold leading-5 text-slate-900">
          {openingPcGuide ? '同步中' : '电脑编辑'}
        </div>
        <div className="mt-0.5 text-[10px] leading-4 text-slate-500">大屏排版</div>
      </button>
    </div>
  )
}
