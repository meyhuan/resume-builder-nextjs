'use client'

import type { ReactElement } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function ReanalyzeButton({ jobId }: { readonly jobId: string }): ReactElement {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function analyze(): Promise<void> {
    setBusy(true)
    try {
      const response = await fetch(`/next-api/jobs/${jobId}/analyze`, { method: 'POST' })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error || '分析失败')
      toast.success('岗位匹配分析已更新')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '分析失败')
    } finally {
      setBusy(false)
    }
  }
  return <Button onClick={analyze} disabled={busy} variant="outline" className="rounded-lg border-slate-200 bg-white">{busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}重新分析</Button>
}

