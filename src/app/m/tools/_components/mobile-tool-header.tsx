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
          <div className="flex max-w-[230px] items-center gap-1 rounded-lg px-1 py-1.5 text-xs font-medium text-violet-700">
            <FileText size={12} className="shrink-0 text-violet-600" />
            <span className="truncate">{currentResumeTitle}</span>
            <ChevronDown size={12} className="shrink-0 text-violet-500" />
          </div>
        </>
      ) : (
        <div className="flex max-w-[230px] items-center gap-1 rounded-lg px-1 py-1.5 text-xs font-medium text-slate-600">
          <FileText size={12} className="shrink-0 text-violet-600" />
          <span className="truncate">{currentResumeTitle}</span>
        </div>
      )}
    </div>
  ) : null

  return (
    <header className="mx-auto w-full max-w-lg px-4 pt-2">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {!inMiniProgram && <button type="button" onClick={handleBack} aria-label="返回" className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg text-slate-700 active:bg-slate-100"><ArrowLeft size={20} /></button>}
          <h1 className="text-base font-semibold text-slate-900">{title}</h1>
        </div>
        <div className="shrink-0">{rightAction}</div>
      </div>
      <div className="flex items-center gap-1 text-xs text-slate-500"><span>当前简历</span>{resumeBadge}</div>
    </header>
  )
}
