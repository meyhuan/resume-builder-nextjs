'use client'

import { useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useDraftStore } from '@/features/edit/draft/draft-store'

interface HomeActionBarProps {
  readonly resumeId: string | null
}

/**
 * Fixed bottom action bar for the mobile edit home.
 *
 * Thumb-zone friendly primary actions:
 * - Left: navigate to preview
 * - Right: save (shows unsaved count, disabled when clean)
 *
 * Replaces the previous floating SaveBar with a permanent bar that keeps
 * primary actions reachable without scrolling.
 */
export function HomeActionBar(props: HomeActionBarProps): ReactElement {
  const { resumeId } = props
  const router = useRouter()
  const dirtyCount = useDraftStore((s) => s.dirtyPaths.length)
  const isSaving = useDraftStore((s) => s.isSaving)
  const saveAll = useDraftStore((s) => s.saveAll)
  const [justSaved, setJustSaved] = useState<boolean>(false)

  const handleSave = async (): Promise<void> => {
    const res = await saveAll()
    if (res.ok) {
      setJustSaved(true)
      toast.success('已保存 ✓')
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(12)
      }
      setTimeout((): void => setJustSaved(false), 1600)
    } else {
      toast.error(res.error || '保存失败')
    }
  }

  const handlePreview = (): void => {
    router.push(`/m/preview?id=${resumeId ?? ''}`)
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={handlePreview}
          className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm active:scale-[0.98] transition-transform"
        >
          <Eye size={18} />
          <span>预览</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || dirtyCount === 0}
          className={cn(
            'flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-transform active:scale-[0.98]',
            dirtyCount > 0
              ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/30'
              : justSaved
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-slate-100 text-slate-400',
          )}
          aria-label="保存"
        >
          {isSaving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>保存中…</span>
            </>
          ) : dirtyCount > 0 ? (
            <>
              <Check size={16} />
              <span>保存 · {dirtyCount}</span>
            </>
          ) : justSaved ? (
            <>
              <Check size={16} />
              <span>已保存</span>
            </>
          ) : (
            <>
              <Check size={16} />
              <span>保存</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
