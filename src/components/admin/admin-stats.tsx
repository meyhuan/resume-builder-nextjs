'use client'

import { useEffect, useState } from 'react'
import { adminErrorText, adminJava } from '@/lib/admin-java'

interface DashboardStats {
  totalActiveCodes?: number
  totalRedeemedCodes?: number
  totalVipConfigs?: number
}

export function AdminStats(): React.ReactElement {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    adminJava<DashboardStats>('/dashboard-stats')
      .then((data) => {
        if (!cancelled) setStats(data ?? {})
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(adminErrorText(cause, '统计加载失败'))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const cards = [
    { label: '兑换码总数', value: stats?.totalActiveCodes ?? 0 },
    { label: '已兑换记录', value: stats?.totalRedeemedCodes ?? 0 },
    { label: 'VIP 套餐', value: stats?.totalVipConfigs ?? 0 },
  ]

  return (
    <section>
      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-800">{card.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
