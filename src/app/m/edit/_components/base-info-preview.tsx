'use client'

import { type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Mail, MapPin, Phone, User2 } from 'lucide-react'
import type { ResumeData } from '@/entities/resume/resume-data'
import { cn } from '@/lib/utils'
import { isMeaningfulText } from '@/features/edit/progress/meaningful-field'

interface BaseInfoPreviewProps {
  readonly resume: ResumeData
}

/**
 * Home-page preview of the base-info module. Tapping anywhere opens the
 * base-info edit page.
 */
export function BaseInfoPreview({ resume }: BaseInfoPreviewProps): ReactElement {
  const router = useRouter()
  const rawName: string = resume.name?.trim() || ''
  const name: string = isMeaningfulText(rawName) ? rawName : ''
  const base = resume.baseInfo ?? {}
  const rawTitle: string = (base.title ?? '').trim()
  const rawPhone: string = (base.phone ?? '').trim()
  const rawEmail: string = (base.email ?? '').trim()
  const rawLocation: string = (base.location ?? '').trim()
  const rawGender: string = (base.gender ?? '').trim()
  const title: string = isMeaningfulText(rawTitle) ? rawTitle : ''
  const phone: string = isMeaningfulText(rawPhone) ? rawPhone : ''
  const email: string = isMeaningfulText(rawEmail) ? rawEmail : ''
  const location: string = isMeaningfulText(rawLocation) ? rawLocation : ''
  const gender: string = isMeaningfulText(rawGender) ? rawGender : ''
  const age: number | undefined = typeof base.age === 'number' ? base.age : undefined
  const avatarUrl: string = (base.avatarUrl ?? '').trim()
  const missing: string[] = []
  if (!name) missing.push('姓名')
  if (!phone) missing.push('手机号')
  if (!email) missing.push('邮箱')
  const empty: boolean = missing.length === 3 && !title

  return (
    <button
      type="button"
      onClick={(): void => router.push('/m/edit/base')}
      className={cn(
        'group w-full text-left rounded-2xl bg-white border border-slate-200',
        'px-4 py-4 shadow-sm active:scale-[0.99] active:bg-slate-50 transition-all',
        empty && 'border-violet-200 bg-violet-50/30',
      )}
    >
      <div className="flex items-start gap-3">
        {avatarUrl ? (
          <div
            className="overflow-hidden rounded-xl shrink-0 bg-slate-100 border border-slate-200"
            style={{ width: 44, height: 58 }}
          >
            <img src={avatarUrl} alt={name || '证件照'} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="h-11 w-11 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center shrink-0">
            {name ? <span className="text-base font-semibold text-slate-700">{name.slice(0, 1)}</span> : <User2 size={19} />}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('text-base font-semibold truncate', name ? 'text-slate-950' : 'text-slate-400')}>
              {name || '填写姓名'}
            </span>
            {missing.length > 0 && (
              <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                待完善
              </span>
            )}
          </div>
          <div className={cn('mt-0.5 text-sm truncate', title ? 'text-slate-600' : 'text-slate-400')}>
            {title || '填写求职岗位'}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <InfoItem icon={<Phone size={11} />} text={phone || '手机号'} muted={!phone} />
            <InfoItem icon={<Mail size={11} />} text={email || '邮箱'} muted={!email} className="max-w-[180px]" />
            {location && <InfoItem icon={<MapPin size={11} />} text={location} />}
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

function InfoItem(
  { icon, text, muted = false, className }: {
    readonly icon: ReactElement
    readonly text: string
    readonly muted?: boolean
    readonly className?: string
  },
): ReactElement {
  return (
    <span className={cn('inline-flex items-center gap-1 truncate', muted && 'text-slate-400', className)}>
      {icon}
      {text}
    </span>
  )
}
