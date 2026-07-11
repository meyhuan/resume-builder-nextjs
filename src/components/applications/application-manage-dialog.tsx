'use client'

import type { FormEvent, ReactElement } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { APPLICATION_STATUSES, APPLICATION_STATUS_META } from '@/lib/applications/application-contracts'

interface ApplicationManageDialogProps {
  readonly application: {
    readonly id: string
    readonly status: string
    readonly channel: string
    readonly contactName: string | null
    readonly contactInfo: string | null
    readonly nextActionAt: string | null
    readonly note: string | null
  }
}

function toLocalValue(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export function ApplicationManageDialog({ application }: ApplicationManageDialogProps): ReactElement {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setBusy(true)
    const form = new FormData(event.currentTarget)
    const nextActionRaw = String(form.get('nextActionAt') || '')
    const timelineNote = String(form.get('timelineNote') || '').trim()
    const payload = {
      status: String(form.get('status')),
      channel: String(form.get('channel')),
      contactName: String(form.get('contactName') || '') || null,
      contactInfo: String(form.get('contactInfo') || '') || null,
      nextActionAt: nextActionRaw ? new Date(nextActionRaw).toISOString() : null,
      note: String(form.get('note') || '') || null,
    }
    try {
      const response = await fetch(`/next-api/applications/${application.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error || '更新失败')
      if (timelineNote) {
        const activityResponse = await fetch(`/next-api/applications/${application.id}/activities`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'FOLLOW_UP', note: timelineNote }) })
        const activityData = await activityResponse.json() as { error?: string }
        if (!activityResponse.ok) throw new Error(activityData.error || '状态已更新，但跟进记录保存失败')
      }
      toast.success('投递记录已更新')
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新失败')
    } finally {
      setBusy(false)
    }
  }

  async function remove(): Promise<void> {
    setBusy(true)
    try {
      const response = await fetch(`/next-api/applications/${application.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('删除失败')
      toast.success('投递记录已删除')
      setConfirmDelete(false)
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm" variant="outline" className="border-slate-200 bg-white"><Pencil />管理</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-[600px]"><DialogHeader><DialogTitle>管理投递记录</DialogTitle><DialogDescription>更新阶段、联系人、跟进时间，并向时间线添加记录。</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">当前阶段<select name="status" defaultValue={application.status} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal">{APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{APPLICATION_STATUS_META[status].label}</option>)}</select></label><label className="text-sm font-medium text-slate-700">投递渠道<input name="channel" defaultValue={application.channel} required maxLength={80} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal" /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">联系人<input name="contactName" defaultValue={application.contactName ?? ''} maxLength={80} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal" /></label><label className="text-sm font-medium text-slate-700">联系方式<input name="contactInfo" defaultValue={application.contactInfo ?? ''} maxLength={160} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal" /></label></div><label className="block text-sm font-medium text-slate-700">下次跟进时间<input name="nextActionAt" type="datetime-local" defaultValue={toLocalValue(application.nextActionAt)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal" /></label><label className="block text-sm font-medium text-slate-700">投递备注<textarea name="note" defaultValue={application.note ?? ''} rows={3} maxLength={4000} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal leading-6" /></label><label className="block text-sm font-medium text-slate-700">新增时间线记录<textarea name="timelineNote" rows={3} maxLength={4000} placeholder="例如：HR 已读，约定周五前回复" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal leading-6" /></label><DialogFooter className="sm:justify-between"><Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"><Trash2 />删除记录</Button><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button><Button type="submit" disabled={busy} className="bg-violet-600 text-white hover:bg-violet-700">{busy && <Loader2 className="animate-spin" />}保存更新</Button></div></DialogFooter></form></DialogContent></Dialog>
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="删除这条投递记录？" description="相关状态时间线也会删除，但岗位、简历和求职材料会保留。" confirmText="确认删除" cancelText="取消" variant="destructive" onConfirm={remove} loading={busy} />
    </>
  )
}

