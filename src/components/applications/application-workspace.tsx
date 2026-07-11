'use client'

import type { CSSProperties, ReactElement } from 'react'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Building2, CalendarClock, GripVertical, LayoutGrid, List, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { APPLICATION_STATUSES, APPLICATION_STATUS_META, type ApplicationStatus } from '@/lib/applications/application-contracts'

export interface ApplicationWorkspaceItem {
  readonly id: string
  readonly status: string
  readonly channel: string
  readonly appliedAt: string
  readonly nextActionAt: string | null
  readonly contactName: string | null
  readonly note: string | null
  readonly job: { readonly id: string; readonly company: string | null; readonly role: string }
}

function ApplicationCard({ item, onStatusChange }: { readonly item: ApplicationWorkspaceItem; readonly onStatusChange: (status: ApplicationStatus) => void }): ReactElement {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })
  const style: CSSProperties = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.55 : 1, zIndex: isDragging ? 20 : undefined }
  return (
    <article ref={setNodeRef} style={style} className="mb-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-start gap-2"><button type="button" {...listeners} {...attributes} className="mt-0.5 cursor-grab text-slate-300 hover:text-slate-500" aria-label="拖动投递卡片"><GripVertical className="h-4 w-4" /></button><Link href={`/dashboard/jobs/${item.job.id}`} className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold text-slate-800 hover:text-violet-700">{item.job.role}</h3><p className="mt-1 truncate text-xs text-slate-500">{item.job.company || '未填写公司'} · {item.channel}</p></Link></div>
      {item.nextActionAt && <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-700"><CalendarClock className="h-3.5 w-3.5" />跟进：{new Date(item.nextActionAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
      <select value={item.status} onChange={(event) => onStatusChange(event.target.value as ApplicationStatus)} className="mt-3 h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-600" aria-label="更新投递状态">{APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{APPLICATION_STATUS_META[status].label}</option>)}</select>
    </article>
  )
}

function StatusColumn({ status, items, onStatusChange }: { readonly status: ApplicationStatus; readonly items: readonly ApplicationWorkspaceItem[]; readonly onStatusChange: (id: string, status: ApplicationStatus) => void }): ReactElement {
  const { isOver, setNodeRef } = useDroppable({ id: status })
  return <section ref={setNodeRef} className={`min-h-[560px] min-w-[220px] rounded-xl border p-3 transition ${isOver ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-slate-50/80'}`}><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-700">{APPLICATION_STATUS_META[status].label}</h2><span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">{items.length}</span></div>{items.map((item) => <ApplicationCard key={item.id} item={item} onStatusChange={(next) => onStatusChange(item.id, next)} />)}</section>
}

export function ApplicationWorkspace({ initialItems }: { readonly initialItems: readonly ApplicationWorkspaceItem[] }): ReactElement {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [items, setItems] = useState([...initialItems])
  const [view, setView] = useState<'board' | 'list'>('board')
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => items.filter((item) => `${item.job.company ?? ''} ${item.job.role} ${item.channel}`.toLowerCase().includes(query.toLowerCase())), [items, query])

  async function updateStatus(id: string, status: ApplicationStatus): Promise<void> {
    const previous = items
    setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item))
    try {
      const response = await fetch(`/next-api/applications/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error || '状态更新失败')
      toast.success(`已移动到“${APPLICATION_STATUS_META[status].label}”`)
    } catch (error) {
      setItems(previous)
      toast.error(error instanceof Error ? error.message : '状态更新失败')
    }
  }

  function handleDragEnd(event: DragEndEvent): void {
    const status = event.over?.id
    if (typeof status !== 'string' || !APPLICATION_STATUSES.includes(status as ApplicationStatus)) return
    const item = items.find((candidate) => candidate.id === event.active.id)
    if (item && item.status !== status) void updateStatus(item.id, status as ApplicationStatus)
  }

  return (
    <div className="space-y-4"><div className="flex flex-col gap-3 rounded-xl border border-white bg-white/85 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索公司、职位或渠道" className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-violet-400 sm:w-72" /></div><div className="flex gap-2"><Button size="sm" variant={view === 'board' ? 'default' : 'ghost'} onClick={() => setView('board')} className={view === 'board' ? 'bg-violet-600 text-white' : ''}><LayoutGrid />阶段看板</Button><Button size="sm" variant={view === 'list' ? 'default' : 'ghost'} onClick={() => setView('list')} className={view === 'list' ? 'bg-violet-600 text-white' : ''}><List />列表</Button></div></div>
      {filtered.length === 0 ? <div className="rounded-2xl border border-white bg-white/85 py-20 text-center shadow-sm"><Building2 className="mx-auto h-10 w-10 text-violet-300" /><h2 className="mt-4 font-semibold text-slate-800">暂无投递记录</h2><p className="mt-2 text-sm text-slate-500">从目标岗位详情页记录第一次投递。</p></div> : view === 'board' ? <DndContext sensors={sensors} onDragEnd={handleDragEnd}><div className="grid gap-3 overflow-x-auto pb-3 xl:grid-cols-6">{APPLICATION_STATUSES.map((status) => <StatusColumn key={status} status={status} items={filtered.filter((item) => item.status === status)} onStatusChange={updateStatus} />)}</div></DndContext> : <div className="overflow-hidden rounded-2xl border border-white bg-white/90 shadow-sm"><div className="divide-y divide-slate-100">{filtered.map((item) => <div key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_130px_140px_170px] md:items-center"><Link href={`/dashboard/jobs/${item.job.id}`}><h2 className="font-medium text-slate-800 hover:text-violet-700">{item.job.role}</h2><p className="text-sm text-slate-500">{item.job.company || '未填写公司'}</p></Link><span className="text-sm text-slate-500">{item.channel}</span><span className="text-sm text-slate-500">{new Date(item.appliedAt).toLocaleDateString('zh-CN')}</span><select value={item.status} onChange={(event) => updateStatus(item.id, event.target.value as ApplicationStatus)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm">{APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{APPLICATION_STATUS_META[status].label}</option>)}</select></div>)}</div></div>}
    </div>
  )
}

