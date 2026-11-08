/* Hallmark · component: resume loading · theme: existing violet/slate
 * Pre-emit critique: P4 H4 E4 S5 R5 V4. Noninteractive loading state.
 */
import { cn } from '@/lib/utils'

interface ResumeLoadingProps {
  title?: string
  description?: string
  className?: string
  fullPage?: boolean
  compact?: boolean
}

/** A neutral document silhouette, not a prediction of the selected template. */
export function ResumeLoading({
  title = '正在打开你的简历',
  description = '正在准备内容与排版，请稍候',
  className,
  fullPage = false,
  compact = false,
}: ResumeLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={title}
      className={cn('flex min-w-0 flex-col items-center justify-center gap-5 p-5 sm:p-7', compact && 'gap-3 p-3 sm:p-3 md:gap-5 md:p-7', fullPage && 'min-h-dvh bg-slate-50', className)}
    >
      <div aria-hidden="true" className={cn('relative w-full max-w-[340px] shrink-0 overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm', compact && 'max-w-[140px] md:max-w-[340px]')}>
        <svg viewBox="0 0 420 594" fill="currentColor" className="block aspect-[210/297] w-full text-slate-100 motion-safe:animate-pulse">
          <rect x="36" y="42" width="110" height="16" rx="3" className="text-slate-300" />
          <rect x="36" y="70" width="164" height="7" rx="2" className="text-violet-200" />
          <rect x="36" y="91" width="110" height="5" rx="2" className="text-slate-200" />
          <rect x="158" y="91" width="83" height="5" rx="2" className="text-slate-200" />
          <rect x="322" y="38" width="62" height="76" rx="4" />
          <path d="M36 134H384" stroke="currentColor" className="text-slate-200" />
          {[158, 278, 398].map((y, index) => (
            <g key={y}>
              <rect x="36" y={y} width="3" height="12" rx="1" className="text-violet-300" />
              <rect x="47" y={y + 1} width={index === 2 ? 64 : 82} height="10" rx="2" className="text-slate-300" />
              <rect x="36" y={y + 30} width="124" height="7" rx="2" className="text-slate-200" />
              <rect x="317" y={y + 31} width="67" height="5" rx="2" />
              <rect x="36" y={y + 50} width="348" height="5" rx="2" />
              <rect x="36" y={y + 64} width="322" height="5" rx="2" />
              <rect x="36" y={y + 78} width={index === 1 ? 270 : 298} height="5" rx="2" />
            </g>
          ))}
          <rect x="36" y="528" width="52" height="17" rx="3" />
          <rect x="96" y="528" width="68" height="17" rx="3" />
          <rect x="172" y="528" width="44" height="17" rx="3" />
        </svg>
      </div>
      <div className="max-w-sm text-center">
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <p className="mt-1.5 text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  )
}
