'use client'

import type { ReactElement } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface JobActionsProps {
  readonly jobId: string
  readonly archived: boolean
}

export function JobActions({ jobId, archived }: JobActionsProps): ReactElement {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function setArchived(nextArchived: boolean): Promise<void> {
    setBusy(true)
    try {
      const response = await fetch(`/next-api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: nextArchived }),
      })
      if (!response.ok) throw new Error('岗位状态更新失败')
      toast.success(nextArchived ? '岗位已归档' : '岗位已恢复')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  async function deleteJob(): Promise<void> {
    setBusy(true)
    try {
      const response = await fetch(`/next-api/jobs/${jobId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('删除岗位失败')
      toast.success('岗位和岗位简历已删除')
      router.push('/dashboard/jobs')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="outline" disabled={busy} onClick={() => setArchived(!archived)} className="rounded-lg border-slate-200 bg-white text-slate-600">
        {busy ? <Loader2 className="animate-spin" /> : archived ? <ArchiveRestore /> : <Archive />}{archived ? '恢复岗位' : '归档岗位'}
      </Button>
      <Button variant="outline" disabled={busy} onClick={() => setConfirmDelete(true)} className="rounded-lg border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700"><Trash2 />删除</Button>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="删除这个目标岗位？"
        description="岗位信息和对应的岗位简历会一起删除，此操作无法撤销。母版简历不会受到影响。"
        confirmText="确认删除"
        cancelText="取消"
        variant="destructive"
        onConfirm={deleteJob}
      />
    </>
  )
}

