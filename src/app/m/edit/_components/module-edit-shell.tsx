'use client'

import { type ReactElement, type ReactNode, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { cn } from '@/lib/utils'

export interface ValidationResult {
  readonly ok: boolean
  /** User-facing message shown in a toast. */
  readonly message?: string
}

interface ModuleEditShellProps {
  readonly title: string
  readonly subtitle?: string
  readonly children: ReactNode
  readonly onBack?: () => void
  readonly footer?: ReactNode
  /**
   * Optional pre-save validation. Returning `{ ok: false, message }` aborts
   * the save and shows a toast. Pages declare their required-field rules here.
   */
  readonly validate?: () => ValidationResult
}

/**
 * Shared scaffolding for every module edit screen.
 *
 * Provides: sticky top bar with back + save, body scroll area, save-on-back UX,
 * and haptic feedback on save success.
 */
export function ModuleEditShell(props: ModuleEditShellProps): ReactElement {
  const { title, subtitle, children, onBack, footer, validate } = props
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

  const runValidation = (): boolean => {
    if (!validate) return true
    const result: ValidationResult = validate()
    if (!result.ok) {
      toast.error(result.message || '请先填写必填项')
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([30, 20, 30])
      }
      return false
    }
    return true
  }

  const handleSave = async (): Promise<void> => {
    if (!runValidation()) return
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
    if (!runValidation()) return
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
      {/* Minimal top bar: back + title only. Save action lives at the bottom. */}
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
        <div className="w-9" />
      </div>

      {/* Body — extra bottom padding to clear the fixed save bar. */}
      <div
        className="flex-1 px-4 py-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)' }}
      >
        <div className="flex flex-col gap-5">{children}</div>
      </div>

      {footer}

      {/* Bottom action bar — thumb-zone friendly primary save action. */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {dirtyCount > 0 ? (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span><span className="font-semibold text-slate-700">{dirtyCount}</span> 项未保存</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>已全部保存</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || dirtyCount === 0}
            className={cn(
              'ml-auto h-11 px-6 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all active:scale-[0.98]',
              dirtyCount > 0
                ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/30'
                : 'bg-slate-100 text-slate-400',
            )}
            aria-label="保存"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            <span>{isSaving ? '保存中…' : '保存'}</span>
          </button>
        </div>
      </div>

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
