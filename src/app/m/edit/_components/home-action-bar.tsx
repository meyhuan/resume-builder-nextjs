'use client'

import { useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Monitor } from 'lucide-react'
import { toast } from 'sonner'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { createLogger } from '@/lib/logger'
import { ModuleManageSheet } from './module-manage-sheet'

interface HomeActionBarProps {
  readonly resumeId: string | null
  readonly template?: string | null
}

/**
 * Fixed bottom action bar for the mobile edit home.
 * "模块管理" opens a bottom sheet; "预览简历" navigates to the preview page.
 */
const log = createLogger('m/edit/home-action-bar')

export function HomeActionBar(props: HomeActionBarProps): ReactElement {
  const { resumeId, template } = props
  const router = useRouter()
  const draftTemplateId = useDraftStore((s): string => s.templateId)
  const dirtyCount = useDraftStore((s): number => s.dirtyPaths.length)
  const saveAll = useDraftStore((s): typeof s.saveAll => s.saveAll)
  const [sheetOpen, setSheetOpen] = useState<boolean>(false)
  const [openingPcGuide, setOpeningPcGuide] = useState<boolean>(false)

  const buildPcGuideUrl = (): string => {
    const params = new URLSearchParams()
    if (resumeId) params.set('id', resumeId)
    const currentTemplate = draftTemplateId || template
    if (currentTemplate) params.set('tpl', currentTemplate)
    const query = params.toString()
    return query ? `/m/edit/pc?${query}` : '/m/edit/pc'
  }

  const handlePreview = (): void => {
    const currentTemplate = draftTemplateId || template
    const tpl = currentTemplate ? `&tpl=${encodeURIComponent(currentTemplate)}` : ''
    router.push(`/m/preview?id=${resumeId ?? ''}${tpl}`)
  }

  const handleOpenPcGuide = async (): Promise<void> => {
    if (openingPcGuide) return
    log.info('open pc guide requested', { resumeId, dirtyCount })
    setOpeningPcGuide(true)
    try {
      if (dirtyCount > 0) {
        const result = await saveAll()
        if (!result.ok) {
          log.warn('save before pc guide failed', { error: result.error })
          toast.error(result.error || '保存失败，暂时无法同步到电脑端')
          return
        }
        toast.success('已同步最新内容')
      }
      router.push(buildPcGuideUrl())
    } finally {
      setOpeningPcGuide(false)
    }
  }

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 shadow-[0_-4px_16px_rgba(15,23,42,0.05)] backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid grid-cols-[60px_88px_minmax(0,1fr)] items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={(): void => { void handleOpenPcGuide() }}
            disabled={openingPcGuide}
            className="flex h-[46px] min-w-0 flex-col items-center justify-center gap-0 rounded-xl bg-white text-slate-700 transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            {openingPcGuide ? <Loader2 size={20} className="animate-spin" /> : <Monitor size={22} strokeWidth={2.1} />}
            <span className="text-[11px] font-medium leading-none">{openingPcGuide ? '同步中' : '电脑编辑'}</span>
          </button>
          <button
            type="button"
            onClick={(): void => setSheetOpen(true)}
            className="flex h-[46px] min-w-0 items-center justify-center rounded-[22px] bg-slate-100 px-2 text-[14px] font-semibold text-slate-900 transition-transform active:scale-[0.98]"
          >
            <span>模块管理</span>
          </button>
          <button
            type="button"
            onClick={handlePreview}
            className="flex h-[48px] min-w-0 items-center justify-center rounded-[22px] bg-violet-600 px-3 text-[15px] font-semibold text-white shadow-md shadow-violet-600/20 transition-transform hover:bg-violet-700 active:scale-[0.98]"
          >
            <span>预览简历</span>
          </button>
        </div>
      </div>

      <ModuleManageSheet open={sheetOpen} onClose={(): void => setSheetOpen(false)} />
    </>
  )
}
