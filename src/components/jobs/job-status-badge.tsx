import type { ReactElement } from 'react'
import { cn } from '@/lib/utils'
import { isJobStatus, JOB_STATUS_META } from '@/lib/jobs/job-contracts'

interface JobStatusBadgeProps {
  readonly status: string
}

export function JobStatusBadge({ status }: JobStatusBadgeProps): ReactElement {
  const meta = isJobStatus(status)
    ? JOB_STATUS_META[status]
    : { label: status, className: 'border-slate-200 bg-slate-100 text-slate-600' }

  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium', meta.className)}>
      {meta.label}
    </span>
  )
}

