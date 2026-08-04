'use client'

import { useEffect, useState, type ReactElement } from 'react'
import Link from 'next/link'
import { Check, X } from 'lucide-react'
import { track } from '@/lib/analytics'

export default function JobFitEditorNotice({ taskId }: { readonly taskId: string }): ReactElement | null {
  const key = `job-fit-editor-notice:${taskId}`
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (window.sessionStorage.getItem(key) !== 'seen') setOpen(true)
    }, 0)
    track('job_fit_editor_open', { taskId })
    return () => window.clearTimeout(timer)
  }, [key, taskId])
  if (!open) return null
  return <div className="fixed left-1/2 top-16 z-[100] flex w-[min(92vw,560px)] -translate-x-1/2 items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-lg"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">这是岗位定制版本，原简历未被修改</p><Link href={`/dashboard/job-fit/${taskId}/result`} className="text-xs text-violet-600 hover:underline">返回查看 AI 改动和评分</Link></div><button onClick={() => { window.sessionStorage.setItem(key, 'seen'); setOpen(false) }} aria-label="关闭提示" className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button></div>
}
