'use client'

import { type ReactElement, type ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, FileText } from 'lucide-react'
import { setPlatformTitle } from '@/lib/platform/adapter'
import { getSafeReturnPath } from '@/lib/platform/route'
import { useInMiniProgram } from '../../_components/use-mini-program'

export interface HeaderResumeOption {
  readonly id: string
  readonly title: string
}

interface MobileToolHeaderProps {
  readonly title: string
  readonly subtitle?: string
  readonly returnTo?: string
  readonly onBack?: () => void
  readonly rightAction?: ReactNode
  readonly currentResumeTitle?: string
  readonly selectedResumeId?: string
  readonly resumeOptions?: readonly HeaderResumeOption[]
  readonly onSelectResume?: (resumeId: string) => void
}

export function MobileToolHeader({
  title,
  returnTo,
  onBack,
  rightAction,
  currentResumeTitle,
  selectedResumeId,
  resumeOptions = [],
  onSelectResume,
}: MobileToolHeaderProps): ReactElement {
  const router = useRouter()
  const inMiniProgram = useInMiniProgram()

  useEffect(() => {
    setPlatformTitle(title)
  }, [title])

  const handleBack = (): void => {
    if (onBack) {
      onBack()
      return
    }
    if (returnTo) {
      router.push(getSafeReturnPath(returnTo, '/m'))
      return
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/m')
    }
  }

  const resumeBadge = currentResumeTitle ? (
    <div className="relative flex items-center">
      {resumeOptions.length > 1 && onSelectResume ? (
        <>
          <select
            aria-label="切换简历"
            value={selectedResumeId}
            onChange={(e) => onSelectResume(e.target.value)}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          >
            {resumeOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.title}
              </option>
            ))}
          </select>
          <div className="flex max-w-[140px] items-center gap-1 rounded-full border border-violet-100 bg-violet-50/80 px-2.5 py-1 text-xs font-medium text-violet-700">
            <FileText size={12} className="shrink-0 text-violet-600" />
            <span className="truncate">{currentResumeTitle}</span>
            <ChevronDown size={12} className="shrink-0 text-violet-500" />
          </div>
        </>
      ) : (
        <div className="flex max-w-[140px] items-center gap-1 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
          <FileText size={12} className="shrink-0 text-violet-600" />
          <span className="truncate">{currentResumeTitle}</span>
        </div>
      )}
    </div>
  ) : null

  // Inside WeChat Mini Program web-view: native top bar already provides the `<` back button.
  // Render a single compact context row (no duplicate back arrow, no duplicate resume card).
  if (inMiniProgram) {
    return (
      <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-2 px-3.5 pt-3 pb-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-3.5 w-1 shrink-0 rounded-full bg-violet-600" />
          <h1 className="truncate text-[15px] font-bold text-slate-900">{title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {resumeBadge}
          {rightAction}
        </div>
      </div>
    )
  }

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-slate-200/80 bg-white/95 px-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 overflow-hidden">
        <button
          type="button"
          onClick={handleBack}
          aria-label="返回"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-700 active:bg-slate-100"
        >
          <ArrowLeft size={19} />
        </button>
        <h1 className="truncate text-sm font-bold text-slate-900">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {resumeBadge}
        {rightAction}
      </div>
    </header>
  )
}
