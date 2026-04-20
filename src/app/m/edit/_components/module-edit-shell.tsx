'use client'

import { type ReactElement, type ReactNode, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { cn } from '@/lib/utils'

interface ModuleEditShellProps {
  readonly title: string
  readonly subtitle?: string
  readonly children: ReactNode
  readonly onBack?: () => void
  readonly footer?: ReactNode
}

/**
 * Shared scaffolding for every module edit screen.
 *
 * Provides: sticky top bar with back + save, body scroll area, save-on-back UX,
 * and haptic feedback on save success.
 */
export function ModuleEditShell(props: ModuleEditShellProps): ReactElement {
  const { title, subtitle, children, onBack, footer } = props
  const router = useRouter()
  const dirtyCount = useDraftStore((s) => s.dirtyPaths.length)
  const isSaving = useDraftStore((s) => s.isSaving)
  const saveAll = useDraftStore((s) => s.saveAll)
  const discardAll = useDraftStore((s) => s.discardAll)
  const [confirmBack, setConfirmBack] = useState<boolean>(false)

  const doBack = (): void => {
    if (onBack) onBack()
    else router.back()
  }

  const handleBack = (): void => {
    if (dirtyCount > 0) {
      setConfirmBack(true)
      return
    }
    doBack()
  }

  const handleSave = async (): Promise<void> => {
    const res = await saveAll()
    if (res.ok) {
      toast.success('已保存 ✓')
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(12)
      }
    } else {
      toast.error(res.error || '保存失败')
    }
  }

  const handleSaveAndBack = async (): Promise<void> => {
    const res = await saveAll()
    if (res.ok) {
      setConfirmBack(false)
      doBack()
    } else {
      toast.error(res.error || '保存失败')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-3 h-12 bg-white/90 backdrop-blur border-b border-slate-200">
        <button
          type="button"
          className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100"
          onClick={handleBack}
          aria-label="返回"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex flex-col items-center">
          <div className="text-sm font-semibold text-slate-800">{title}</div>
          {subtitle && <div className="text-[10px] text-slate-400">{subtitle}</div>}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || dirtyCount === 0}
          className={cn(
            'h-9 px-3 rounded-lg flex items-center gap-1 text-sm font-medium transition-all',
            dirtyCount > 0
              ? 'bg-violet-600 text-white active:scale-95'
              : 'text-slate-400',
          )}
          aria-label="保存"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          保存
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-5 pb-24">
        <div className="flex flex-col gap-5">{children}</div>
      </div>

      {footer}

      {/* Confirm back dialog */}
      {confirmBack && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={(): void => setConfirmBack(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-50 rounded-2xl bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-semibold text-slate-900">还有未保存的修改</h3>
            <p className="mt-1.5 text-sm text-slate-500">要保存后再离开吗？</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={(): void => {
                  discardAll()
                  setConfirmBack(false)
                  doBack()
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm active:scale-95 transition-transform"
              >
                放弃
              </button>
              <button
                type="button"
                onClick={handleSaveAndBack}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium active:scale-95 transition-transform disabled:opacity-60"
              >
                {isSaving ? '保存中…' : '保存并离开'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
