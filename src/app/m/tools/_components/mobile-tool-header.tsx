'use client'

import { type ReactElement, type ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { setPlatformTitle } from '@/lib/platform/adapter'
import { getSafeReturnPath } from '@/lib/platform/route'

interface MobileToolHeaderProps {
  readonly title: string
  readonly subtitle?: string
  readonly returnTo?: string
  readonly onBack?: () => void
  readonly rightAction?: ReactNode
}

export function MobileToolHeader({
  title,
  subtitle,
  returnTo,
  onBack,
  rightAction,
}: MobileToolHeaderProps): ReactElement {
  const router = useRouter()

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

  return (
    <header className="sticky top-0 z-30 flex h-13 items-center justify-between border-b border-slate-200/80 bg-white/95 px-3 backdrop-blur-sm">
      <div className="flex items-center gap-2 overflow-hidden">
        <button
          type="button"
          onClick={handleBack}
          aria-label="返回"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-700 active:bg-slate-100"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-sm font-bold text-slate-900">{title}</span>
          {subtitle ? (
            <span className="truncate text-xs text-slate-400">{subtitle}</span>
          ) : null}
        </div>
      </div>
      {rightAction ? (
        <div className="flex shrink-0 items-center gap-1.5">{rightAction}</div>
      ) : null}
    </header>
  )
}
