'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { MessageCircle, Sparkles } from 'lucide-react'
import { track } from '@/lib/analytics'

interface JobSprintOfferProps {
  readonly entry: 'membership' | 'export-result' | 'pay-success'
  readonly compact?: boolean
}

const WECHAT_ID = 'kkyycc01'

export default function JobSprintOffer({ entry, compact = false }: JobSprintOfferProps): ReactElement {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    track('job_sprint_offer_view', {
      entry,
      packageName: 'job_sprint_pack',
      price: 99,
    })
  }, [entry])

  async function handleClick(): Promise<void> {
    track('job_sprint_offer_click', {
      entry,
      packageName: 'job_sprint_pack',
      price: 99,
    })
    try {
      await navigator.clipboard.writeText(WECHAT_ID)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      setCopied(true)
    }
  }

  return (
    <div className={`rounded-2xl border border-amber-200 bg-amber-50 ${compact ? 'p-4' : 'px-6 py-5'}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">求职冲刺包</h3>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-amber-700">99 元实验价</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            永久会员 + AI 深度优化协助，适合近期投递、面试前集中打磨简历。
          </p>
          <button
            type="button"
            onClick={() => { void handleClick() }}
            className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {copied ? `已复制微信 ${WECHAT_ID}` : '咨询冲刺包'}
          </button>
        </div>
      </div>
    </div>
  )
}
