'use client'

import { useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Monitor, SlidersHorizontal } from 'lucide-react'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { miniProgramRuntime } from '../../_components/mini-program-runtime'
import { ModuleManageSheet } from './module-manage-sheet'
import { usePcGuideEntry } from './use-pc-guide-entry'

interface HomeActionBarProps {
  readonly resumeId: string | null
  readonly template?: string | null
}

/**
 * Fixed bottom action bar for the mobile edit home.
 * "模块管理" opens a bottom sheet; "预览简历" navigates to the preview page.
 */
export function HomeActionBar(props: HomeActionBarProps): ReactElement {
  const { resumeId, template } = props
  const router = useRouter()
  const draftTemplateId = useDraftStore((s): string => s.templateId)
  const [sheetOpen, setSheetOpen] = useState<boolean>(false)
  const { openingPcGuide, openPcGuide } = usePcGuideEntry({
    resumeId,
    template,
    source: 'home-action-bar',
  })

  const handlePreview = (): void => {
    const currentTemplate = draftTemplateId || template
    const tpl = currentTemplate ? `&tpl=${encodeURIComponent(currentTemplate)}` : ''
    const miniVersion = miniProgramRuntime.readMiniVersion()
    const miniVersionParam = miniVersion ? `&miniVersion=${encodeURIComponent(miniVersion)}` : ''
    router.push(`/m/preview?id=${resumeId ?? ''}${tpl}${miniVersionParam}`)
  }

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 shadow-[0_-4px_16px_rgba(15,23,42,0.05)] backdrop-blur"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
      >
        <div className="grid grid-cols-[88px_96px_minmax(0,1fr)] items-center gap-2.5 px-3.5 py-2.5">
          <button
            type="button"
            onClick={(): void => { void openPcGuide() }}
            disabled={openingPcGuide}
            className="flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-2 text-slate-700 transition-colors active:scale-[0.98] disabled:opacity-70"
          >
            {openingPcGuide ? <Loader2 size={17} className="animate-spin" /> : <Monitor size={18} strokeWidth={2.1} />}
            <span className="whitespace-nowrap text-[12px] font-semibold leading-none">{openingPcGuide ? '同步中' : '电脑编辑'}</span>
          </button>
          <button
            type="button"
            onClick={(): void => setSheetOpen(true)}
            className="flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-2 text-slate-800 transition-colors active:scale-[0.98]"
          >
            <SlidersHorizontal size={18} strokeWidth={2.1} />
            <span className="whitespace-nowrap text-[12px] font-semibold leading-none">模块管理</span>
          </button>
          <button
            type="button"
            onClick={handlePreview}
            className="flex h-12 min-w-0 items-center justify-center rounded-2xl bg-violet-600 px-3 text-[15px] font-semibold text-white shadow-[0_8px_18px_rgba(124,58,237,0.22)] transition-colors hover:bg-violet-700 active:scale-[0.98]"
          >
            <span>预览简历</span>
          </button>
        </div>
      </div>

      <ModuleManageSheet open={sheetOpen} onClose={(): void => setSheetOpen(false)} />
    </>
  )
}
