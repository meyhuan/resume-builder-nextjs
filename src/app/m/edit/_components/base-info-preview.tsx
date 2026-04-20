'use client'

import { type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Mail, MapPin, ChevronRight, User2 } from 'lucide-react'
import type { ResumeData } from '@/entities/resume/resume-data'
import { cn } from '@/lib/utils'

interface BaseInfoPreviewProps {
  readonly resume: ResumeData
}

/**
 * Home-page preview of the base-info module. Tapping anywhere opens the
 * base-info edit page.
 */
export function BaseInfoPreview({ resume }: BaseInfoPreviewProps): ReactElement {
  const router = useRouter()
  const name: string = resume.name?.trim() || ''
  const base = resume.baseInfo ?? {}
  const title: string = (base.title ?? '').trim()
  const phone: string = (base.phone ?? '').trim()
  const email: string = (base.email ?? '').trim()
  const location: string = (base.location ?? '').trim()
  const gender: string = (base.gender ?? '').trim()
  const age: number | undefined = typeof base.age === 'number' ? base.age : undefined
  const empty: boolean = !name && !phone && !email && !title

  return (
    <button
      type="button"
      onClick={(): void => router.push('/m/edit/base')}
      className={cn(
        'group w-full text-left rounded-2xl bg-white border border-slate-200',
        'px-4 py-4 active:scale-[0.99] active:bg-slate-50 transition-all',
        empty && 'border-dashed border-rose-200 bg-rose-50/30',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center text-lg font-semibold shrink-0">
          {name ? name.slice(0, 1) : <User2 size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-semibold text-slate-900 truncate">
              {name || '点我填写姓名'}
            </span>
            {empty && (
              <span className="text-[10px] text-rose-500 bg-rose-100 px-1.5 py-0.5 rounded">必填</span>
            )}
          </div>
          {title && <div className="mt-0.5 text-sm text-slate-600 truncate">{title}</div>}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            {phone && (
              <span className="inline-flex items-center gap-1">
                <Phone size={11} /> {phone}
              </span>
            )}
            {email && (
              <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                <Mail size={11} /> {email}
              </span>
            )}
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} /> {location}
              </span>
            )}
            {(gender || age !== undefined) && (
              <span>{[gender, age !== undefined ? `${age}岁` : ''].filter(Boolean).join(' · ')}</span>
            )}
          </div>
        </div>
        <ChevronRight size={16} className="text-slate-300 mt-2 shrink-0 group-hover:text-violet-500" />
      </div>
    </button>
  )
}
