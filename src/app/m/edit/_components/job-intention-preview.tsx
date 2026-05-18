'use client'

import { type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Target } from 'lucide-react'
import type { ResumeData } from '@/entities/resume/resume-data'
import { cn } from '@/lib/utils'
import { isMeaningfulText } from '@/features/edit/progress/meaningful-field'

interface JobIntentionPreviewProps {
  readonly resume: ResumeData
}

/**
 * Job intention displayed as the first standard dashboard module.
 */
export function JobIntentionPreview({ resume }: JobIntentionPreviewProps): ReactElement {
  const router = useRouter()
  const ji = resume.jobIntention ?? {}
  const position: string = isMeaningfulText(ji.position) ? ji.position!.trim() : ''
  const city: string = isMeaningfulText(ji.city) ? ji.city!.trim() : ''
  const salary: string = isMeaningfulText(ji.salary) ? ji.salary!.trim() : ''
  const type: string = isMeaningfulText(ji.type) ? ji.type!.trim() : ''
  const status: string = isMeaningfulText(ji.currentStatus) ? ji.currentStatus!.trim() : ''
  const missing: string[] = []
  if (!position) missing.push('目标岗位')
  if (!city) missing.push('期望城市')
  const empty: boolean = !position && !city && !salary && !type && !status

  return (
    <button
      type="button"
      onClick={(): void => router.push('/m/edit/intention')}
      className={cn(
        'group w-full rounded-[18px] border border-[#edf0f5] bg-white p-3.5 text-left',
        'shadow-[0_8px_24px_rgba(15,23,42,0.045)] transition-all active:scale-[0.99] active:bg-slate-50',
      )}
    >
      <div className="grid grid-cols-[36px_1fr_auto_16px] items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f1efff] text-[#6c47ff]">
          <Target size={20} strokeWidth={2.1} />
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold leading-5 text-slate-950">求职意向</div>
          <div className="mt-0.5 truncate text-[12px] leading-4 text-slate-500">
            {[position || '目标岗位未填写', city || '期望城市未填写', salary].filter(Boolean).join(' / ')}
          </div>
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-medium',
            missing.length > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700',
          )}
        >
          {missing.length > 0 ? '待完善' : '已完善'}
        </span>
        <ChevronRight size={16} className="text-slate-300" />
      </div>

      <div className="mt-3 text-[13px] leading-6 text-slate-600">
        {empty ? (
          <p className="text-slate-500">
            请填写目标岗位、期望城市和期望薪资。求职意向会影响 AI 优化建议和简历关键词。
          </p>
        ) : (
          <p>
            目标岗位：{position || '未填写'}；期望城市：{city || '未填写'}；期望薪资：{salary || '未填写'}
            {type ? `；求职类型：${type}` : ''}
            {status ? `；当前状态：${status}` : ''}。
          </p>
        )}
      </div>
    </button>
  )
}
