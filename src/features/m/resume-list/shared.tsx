'use client'

/**
 * Shared pieces for mobile resume-list UIs (home preview + full /m/resumes page).
 *
 * Extracted from `src/app/m/home-client.tsx` so the dedicated all-resumes page
 * can reuse the exact same cards, action sheet and rename dialog without
 * duplicating 200+ lines.
 */

import { useEffect, useState, type ReactElement } from 'react'
import { cn } from '@/lib/utils'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Edit3, Pencil, Copy, Trash2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResumeListItem {
  readonly id: string
  readonly title: string
  readonly updatedAt: string
  readonly template?: string
  readonly thumbnail?: string | null
}

export type ResumeAction = 'edit' | 'rename' | 'duplicate' | 'delete'

// ---------------------------------------------------------------------------
// Session cache — avoids the "list disappears then reappears" flicker every
// time the user navigates back to a page that shows resumes.
// ---------------------------------------------------------------------------

const RESUME_LIST_CACHE_KEY = 'm_resume_list_v1'

/**
 * Reads the cached resume list from sessionStorage.
 * Returns `null` on SSR, cache miss, or parse error.
 */
export function readResumeListCache(): readonly ResumeListItem[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw: string | null = sessionStorage.getItem(RESUME_LIST_CACHE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed as readonly ResumeListItem[]
  } catch {
    return null
  }
}

/** Persists the resume list into sessionStorage. No-op on SSR. */
export function writeResumeListCache(list: readonly ResumeListItem[]): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(RESUME_LIST_CACHE_KEY, JSON.stringify(list))
  } catch {
    // Quota exceeded or disabled — silently ignore; cache is best-effort.
  }
}

/** Clears the cached resume list, e.g. on logout. */
export function clearResumeListCache(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(RESUME_LIST_CACHE_KEY)
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Format an ISO timestamp as "YYYY-MM-DD HH:mm" in local time.
 * Falls back to the raw string on parse failure.
 */
export function formatUpdateTime(iso: string): string {
  const d: Date = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ---------------------------------------------------------------------------
// Resume SVG placeholder (used when a resume has no thumbnail)
// ---------------------------------------------------------------------------

export function ResumeSvgPlaceholder(): ReactElement {
  return (
    <svg viewBox="0 0 200 280" className="w-full h-full">
      <rect x="0" y="0" width="200" height="280" fill="#ffffff" />
      <rect x="20" y="20" width="160" height="24" rx="2" fill="#f1f5f9" />
      <rect x="20" y="56" width="100" height="12" rx="2" fill="#e2e8f0" />
      <rect x="20" y="76" width="140" height="8" rx="2" fill="#f1f5f9" />
      <rect x="20" y="90" width="120" height="8" rx="2" fill="#f1f5f9" />
      <rect x="20" y="120" width="60" height="10" rx="2" fill="#e2e8f0" />
      <rect x="20" y="138" width="160" height="6" rx="2" fill="#f1f5f9" />
      <rect x="20" y="148" width="140" height="6" rx="2" fill="#f1f5f9" />
      <rect x="20" y="158" width="150" height="6" rx="2" fill="#f1f5f9" />
      <rect x="20" y="180" width="60" height="10" rx="2" fill="#e2e8f0" />
      <rect x="20" y="198" width="160" height="6" rx="2" fill="#f1f5f9" />
      <rect x="20" y="208" width="130" height="6" rx="2" fill="#f1f5f9" />
      <rect x="20" y="230" width="60" height="10" rx="2" fill="#e2e8f0" />
      <rect x="20" y="248" width="150" height="6" rx="2" fill="#f1f5f9" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Action sheet
// ---------------------------------------------------------------------------

interface ActionItem {
  readonly key: ResumeAction
  readonly label: string
  readonly icon: ReactElement
  readonly danger?: boolean
}

const RESUME_ACTIONS: readonly ActionItem[] = [
  { key: 'edit', label: '编辑', icon: <Edit3 size={18} /> },
  { key: 'rename', label: '重命名', icon: <Pencil size={18} /> },
  { key: 'duplicate', label: '复制', icon: <Copy size={18} /> },
  { key: 'delete', label: '删除', icon: <Trash2 size={18} />, danger: true },
]

/**
 * Bottom action sheet for a resume card.
 */
export function ResumeActionSheet({
  target,
  onClose,
  onSelect,
}: {
  readonly target: ResumeListItem | null
  readonly onClose: () => void
  readonly onSelect: (action: ResumeAction) => void | Promise<void>
}): ReactElement {
  const open: boolean = Boolean(target)
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={target?.title || '简历操作'}
      height="auto"
      showHandle
      showCloseButton={false}
      contentClassName="py-2"
    >
      <ul className="flex flex-col">
        {RESUME_ACTIONS.map((item): ReactElement => (
          <li key={item.key}>
            <button
              type="button"
              onClick={(): void => {
                void onSelect(item.key)
              }}
              className={cn(
                'w-full flex items-center gap-3 px-2 py-3.5 rounded-lg',
                'active:bg-slate-100 transition-colors text-left',
                item.danger ? 'text-rose-600' : 'text-slate-800',
              )}
            >
              <span
                className={cn(
                  'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                  item.danger ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600',
                )}
              >
                {item.icon}
              </span>
              <span className="text-[15px] font-medium">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full py-3 rounded-xl bg-slate-100 text-slate-600 text-[14px] font-medium active:bg-slate-200 transition-colors"
      >
        取消
      </button>
    </BottomSheet>
  )
}

// ---------------------------------------------------------------------------
// Rename dialog
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Confirm dialog — mobile-native centered modal used in place of the native
// `window.confirm()` (which looks foreign and blocks the JS thread on iOS).
// ---------------------------------------------------------------------------

/**
 * Centered confirmation dialog with cancel + confirm actions. `danger`
 * turns the confirm button red to signal destructive operations.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '确定',
  cancelLabel = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: {
  readonly open: boolean
  readonly title: string
  readonly message: string
  readonly confirmLabel?: string
  readonly cancelLabel?: string
  readonly danger?: boolean
  readonly onConfirm: () => void | Promise<void>
  readonly onCancel: () => void
}): ReactElement | null {
  const [submitting, setSubmitting] = useState<boolean>(false)

  useEffect((): void => {
    if (open) setSubmitting(false)
  }, [open])

  if (!open) return null

  const handleConfirm = async (): Promise<void> => {
    if (submitting) return
    setSubmitting(true)
    try {
      await onConfirm()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-[320px] rounded-2xl bg-white shadow-2xl">
        <div className="px-5 pt-5 pb-4">
          <h3 className="text-[16px] font-semibold text-slate-900">{title}</h3>
          <p className="mt-2 text-[13px] text-slate-600 leading-relaxed">{message}</p>
        </div>
        <div className="flex border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-3 text-[14px] text-slate-600 active:bg-slate-50 transition-colors rounded-bl-2xl disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <div className="w-px bg-slate-100" />
          <button
            type="button"
            onClick={(): void => {
              void handleConfirm()
            }}
            disabled={submitting}
            className={cn(
              'flex-1 py-3 text-[14px] font-semibold transition-colors rounded-br-2xl disabled:opacity-50',
              danger
                ? 'text-rose-600 active:bg-rose-50'
                : 'text-violet-600 active:bg-violet-50',
            )}
          >
            {submitting ? '处理中…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Lightweight centered dialog for renaming a resume.
 */
export function RenameDialog({
  target,
  onClose,
  onSubmit,
}: {
  readonly target: ResumeListItem | null
  readonly onClose: () => void
  readonly onSubmit: (nextTitle: string) => void | Promise<void>
}): ReactElement | null {
  const [value, setValue] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)

  useEffect((): void => {
    if (target) {
      setValue(target.title ?? '')
      setSubmitting(false)
    }
  }, [target])

  if (!target) return null

  const handleConfirm = async (): Promise<void> => {
    if (submitting) return
    setSubmitting(true)
    try {
      await onSubmit(value)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-[320px] rounded-2xl bg-white shadow-2xl">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-[16px] font-semibold text-slate-900">重命名简历</h3>
          <input
            type="text"
            value={value}
            autoFocus
            onChange={(e): void => setValue(e.target.value)}
            onKeyDown={(e): void => {
              if (e.key === 'Enter') void handleConfirm()
            }}
            placeholder="请输入简历名称"
            className={cn(
              'mt-3 w-full px-3 py-2.5 rounded-lg border border-slate-200',
              'text-[14px] text-slate-900 placeholder:text-slate-400',
              'focus:border-violet-500 focus:ring-4 focus:ring-violet-100 outline-none',
            )}
            maxLength={40}
          />
        </div>
        <div className="flex border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 text-[14px] text-slate-600 active:bg-slate-50 transition-colors rounded-bl-2xl"
          >
            取消
          </button>
          <div className="w-px bg-slate-100" />
          <button
            type="button"
            onClick={(): void => {
              void handleConfirm()
            }}
            disabled={submitting}
            className="flex-1 py-3 text-[14px] font-semibold text-violet-600 active:bg-violet-50 transition-colors rounded-br-2xl disabled:opacity-50"
          >
            {submitting ? '保存中…' : '确定'}
          </button>
        </div>
      </div>
    </div>
  )
}
