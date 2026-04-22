'use client'

import { type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Eye } from 'lucide-react'

interface HomeActionBarProps {
  readonly resumeId: string | null
}

/**
 * Fixed bottom action bar for the mobile edit home.
 *
 * Only shows the preview button since all editing & saving happens
 * in secondary pages that handle save on exit.
 */
export function HomeActionBar(props: HomeActionBarProps): ReactElement {
  const { resumeId } = props
  const router = useRouter()

  const handlePreview = (): void => {
    router.push(`/m/preview?id=${resumeId ?? ''}`)
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="px-4 py-3">
        <button
          type="button"
          onClick={handlePreview}
          className="w-full h-11 rounded-xl flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm shadow-md shadow-violet-600/30 active:scale-[0.98] transition-transform"
        >
          <Eye size={18} />
          <span>预览简历</span>
        </button>
      </div>
    </div>
  )
}
