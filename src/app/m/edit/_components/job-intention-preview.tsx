'use client'

import { type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Target, ChevronRight } from 'lucide-react'
import type { ResumeData } from '@/entities/resume/resume-data'
import { cn } from '@/lib/utils'

interface JobIntentionPreviewProps {
  readonly resume: ResumeData
}

/**
 * Home-page preview of the job-intention module.
 */
export function JobIntentionPreview({ resume }: JobIntentionPreviewProps): ReactElement {
  const router = useRouter()
  const ji = resume.jobIntention ?? {}
  const position: string = (ji.position ?? '').trim()
  const city: string = (ji.city ?? '').trim()
  const salary: string = (ji.salary ?? '').trim()
  const type: string = (ji.type ?? '').trim()
  const industry: string = (ji.industry ?? '').trim()
  const status: string = (ji.currentStatus ?? '').trim()
  const tags: readonly string[] = [city, salary, type, industry, status].filter(Boolean)
  const empty: boolean = !position && tags.length === 0

  return (
    <button
      type="button"
      onClick={(): void => router.push('/m/edit/intention')}
      className={cn(
        'group w-full text-left rounded-2xl bg-white border border-slate-200',
        'px-4 py-4 active:scale-[0.99] active:bg-slate-50 transition-all',
        empty && 'border-dashed border-rose-200 bg-rose-50/30',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center shrink-0">
          <Target size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">求职意向</span>
            {empty && (
              <span className="text-[10px] text-rose-500 bg-rose-100 px-1.5 py-0.5 rounded">必填</span>
            )}
          </div>
          <div className="mt-0.5 text-[15px] font-semibold text-slate-900 truncate">
            {position || '点我填写意向岗位'}
          </div>
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <ChevronRight size={16} className="text-slate-300 mt-1 shrink-0 group-hover:text-violet-500" />
      </div>
    </button>
  )
}
