'use client'

import { useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, LayoutGrid } from 'lucide-react'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { ModuleManageSheet } from './module-manage-sheet'

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

  const handlePreview = (): void => {
    const currentTemplate = draftTemplateId || template
    const tpl = currentTemplate ? `&tpl=${encodeURIComponent(currentTemplate)}` : ''
    router.push(`/m/preview?id=${resumeId ?? ''}${tpl}`)
  }

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center gap-3 px-[18px] py-3">
          <button
            type="button"
            onClick={(): void => setSheetOpen(true)}
            className="flex h-[52px] w-[86px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl bg-white text-[11px] font-medium text-slate-600 active:scale-[0.98]"
          >
            <LayoutGrid size={18} />
            <span>模块管理</span>
          </button>
          <button
            type="button"
            onClick={handlePreview}
            className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-[14px] bg-violet-600 text-[15px] font-semibold text-white shadow-sm shadow-violet-600/20 transition-transform hover:bg-violet-700 active:scale-[0.98]"
          >
            <Eye size={18} />
            <span>预览简历</span>
          </button>
        </div>
      </div>

      <ModuleManageSheet open={sheetOpen} onClose={(): void => setSheetOpen(false)} />
    </>
  )
}
