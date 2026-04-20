'use client'

import { useState, type ReactElement } from 'react'
import { Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { toast } from 'sonner'

/**
 * Sticky save bar at the bottom of the edit home. Appears only when there
 * are unsaved changes.
 */
export function SaveBar(): ReactElement | null {
  const dirtyCount = useDraftStore((s) => s.dirtyPaths.length)
  const isSaving = useDraftStore((s) => s.isSaving)
  const saveAll = useDraftStore((s) => s.saveAll)
  const discardAll = useDraftStore((s) => s.discardAll)
  const [justSaved, setJustSaved] = useState<boolean>(false)

  if (dirtyCount === 0 && !justSaved) return null

  const handleSave = async (): Promise<void> => {
    const res = await saveAll()
    if (res.ok) {
      setJustSaved(true)
      toast.success('已保存 ✓')
      setTimeout((): void => setJustSaved(false), 1600)
    } else {
      toast.error(res.error || '保存失败')
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4 pt-2 pointer-events-none">
      <div
        className={cn(
          'mx-auto max-w-md rounded-2xl bg-white shadow-xl border border-slate-200',
          'flex items-center justify-between px-4 py-3 pointer-events-auto',
          'animate-in slide-in-from-bottom-4 fade-in duration-300',
        )}
      >
        <div className="flex items-center gap-2">
          {justSaved ? (
            <>
              <span className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <Check size={14} strokeWidth={3} />
              </span>
              <span className="text-sm text-emerald-600 font-medium">已保存</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-sm text-slate-700">
                <span className="font-semibold">{dirtyCount}</span> 项未保存
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dirtyCount > 0 && (
            <button
              type="button"
              onClick={discardAll}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50"
            >
              撤销
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || dirtyCount === 0}
            className={cn(
              'px-4 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-medium',
              'hover:bg-violet-700 active:scale-95 transition-all',
              'disabled:bg-slate-200 disabled:text-slate-400',
              'flex items-center gap-1.5',
            )}
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            {isSaving ? '保存中' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
