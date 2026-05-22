'use client'

import { type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Mail, Phone, UserRound } from 'lucide-react'
import type { ResumeData } from '@/entities/resume/resume-data'
import { cn } from '@/lib/utils'
import { isMeaningfulText } from '@/features/edit/progress/meaningful-field'

interface ResumeProfileCardProps {
  readonly resume: ResumeData
  readonly progress: number
  readonly missingItems?: readonly string[]
}

/**
 * Dashboard profile card: identifies the current resume and surfaces its
 * completion state in one compact, professional block.
 */
export function ResumeProfileCard(
  { resume, progress, missingItems = [] }: ResumeProfileCardProps,
): ReactElement {
  const base = resume.baseInfo ?? {}
  const intention = resume.jobIntention ?? {}
  const name: string = isMeaningfulText(resume.name) ? resume.name.trim() : ''
  const jobPosition: string = isMeaningfulText(intention.position) ? intention.position!.trim() : ''
  const phone: string = isMeaningfulText(base.phone) ? base.phone!.trim() : ''
  const email: string = isMeaningfulText(base.email) ? base.email!.trim() : ''
  const avatarUrl: string = (base.avatarUrl ?? '').trim()
  const safeProgress: number = Math.max(0, Math.min(100, progress))
  const router = useRouter()

  return (
    <section className={cn(
      'mx-[18px] mt-2 rounded-[18px] border bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.045)]',
      !name ? 'border-violet-200 bg-violet-50/20' : 'border-[#edf0f5]',
    )}>
      <div className="flex items-center gap-3">
        {/* Avatar — tapping navigates to base-info edit */}
        <button
          type="button"
          onClick={(): void => router.push('/m/edit/base')}
          className="shrink-0 active:opacity-70"
          aria-label="编辑基础信息"
        >
          {avatarUrl ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100" style={{ width: 64, height: 84 }}>
              <img src={avatarUrl} alt={name || '头像'} className="h-full w-full object-cover object-top" />
            </div>
          ) : (
            <div className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-100 to-indigo-50 text-blue-600 flex items-center justify-center" style={{ width: 64, height: 84 }}>
              {name
                ? <span className="text-[24px] font-semibold text-blue-600">{name.slice(0, 1)}</span>
                : <UserRound size={32} strokeWidth={1.8} />}
            </div>
          )}
        </button>

        {/* Name + meta + contact */}
        <button
          type="button"
          onClick={(): void => router.push('/m/edit/base')}
          className="min-w-0 flex-1 text-left active:opacity-70"
        >
          <div className="flex items-center gap-1.5">
            <h1 className={cn('truncate text-[17px] font-semibold leading-6', name ? 'text-slate-950' : 'text-slate-400')}>
              {name || '未填写姓名'}
            </h1>
            <ChevronRight size={15} className="shrink-0 text-slate-300" />
          </div>
          <div className={cn('mt-0.5 text-[12px] leading-5 truncate', jobPosition ? 'text-slate-600' : 'text-slate-400')}>
            {jobPosition || '填写求职岗位'}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-slate-500">
            <span className={cn('inline-flex items-center gap-1', !phone && 'text-slate-400')}>
              <Phone size={11} />
              {phone || '手机号未填写'}
            </span>
            <span className={cn('inline-flex max-w-[160px] items-center gap-1 truncate', !email && 'text-slate-400')}>
              <Mail size={11} />
              {email || '邮箱未填写'}
            </span>
          </div>
        </button>

        {/* Progress ring — non-interactive */}
        <div className="shrink-0">
          <div
            className="h-[60px] w-[60px] rounded-full p-[5px]"
            style={{ background: `conic-gradient(#7c3aed 0 ${safeProgress}%, #eef2ff ${safeProgress}% 100%)` }}
          >
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white">
              <strong className="text-[16px] leading-5 font-semibold text-violet-700">{safeProgress}%</strong>
              <span className="text-[9px] text-slate-500">完整度</span>
            </div>
          </div>
        </div>
      </div>

      {missingItems.length > 0 && (
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] font-medium text-slate-700">{missingItems.length} 项待补充</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {missingItems.map((item) => (
              <span key={item} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-100">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

