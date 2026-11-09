'use client'
import type { ExportRetention } from '@/hooks/use-export-retention'

export function ExportRetentionCard({ retention }: { retention: ExportRetention }) {
  if (!retention.enabled || retention.status !== 'visible' || !retention.monthly) return null
  return <div data-export-retention className="text-xs leading-5 text-slate-600">
    <div className="flex flex-wrap items-center justify-between gap-x-2">
      <strong className="font-medium text-slate-800">短期求职，月会员就够用</strong>
      <span className="flex shrink-0 gap-3">
        <button type="button" className="font-medium text-violet-600" onClick={() => { void retention.viewMonthly() }}>查看月会员</button>
        <button type="button" className="text-slate-500" onClick={retention.dismiss}>暂不需要</button>
      </span>
    </div>
    <p>¥{retention.monthly.price} / {retention.monthly.duration}天，会员期内不限次导出。</p>
  </div>
}
