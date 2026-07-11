import type { ReactElement } from 'react'
import { cn } from '@/lib/utils'
import { APPLICATION_STATUS_META, isApplicationStatus } from '@/lib/applications/application-contracts'

export function ApplicationStatusBadge({ status }: { readonly status: string }): ReactElement {
  const meta = isApplicationStatus(status) ? APPLICATION_STATUS_META[status] : { label: status, className: 'border-slate-200 bg-slate-100 text-slate-600' }
  return <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-medium', meta.className)}>{meta.label}</span>
}

