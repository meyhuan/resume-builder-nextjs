'use client'

import { type ReactElement } from 'react'
import { CheckCircle2, CircleAlert } from 'lucide-react'

interface ProgressCardProps {
  readonly progress: number
  readonly missingItems?: readonly string[]
}

/**
 * Compact resume readiness card. It favors task clarity over decorative AI
 * styling so users know exactly what to fix next.
 */
export function ProgressCard({ progress, missingItems = [] }: ProgressCardProps): ReactElement {
  const safeProgress: number = Math.max(0, Math.min(100, progress))
  const ready: boolean = safeProgress >= 80 && missingItems.length === 0

  return (
    <section className="mx-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700">
            {ready ? (
              <CheckCircle2 size={15} className="text-emerald-600" />
            ) : (
              <CircleAlert size={15} className="text-violet-600" />
            )}
            <span>{ready ? '简历已基本完善' : '继续完善简历'}</span>
          </div>
          <p className="mt-1 text-[12px] leading-5 text-slate-500">
            {ready ? '可以预览排版并导出投递。' : '优先补齐关键信息，提升简历完整度。'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-semibold leading-none text-slate-950">{safeProgress}%</div>
          <div className="mt-1 text-[11px] text-slate-400">完成度</div>
        </div>
      </div>

      <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-violet-600 transition-all duration-700 ease-out"
          style={{ width: `${safeProgress}%` }}
        />
      </div>

      {missingItems.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {missingItems.map((item) => (
            <span
              key={item}
              className="rounded-full border border-violet-100 bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700"
            >
              待完善：{item}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
