'use client'

import type { KeyboardEvent, ReactElement } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clipboard, FilePenLine, Loader2, RefreshCw, Save, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { JobMaterialType } from '@/lib/jobs/job-material-contracts'

interface MaterialDraft {
  readonly id: string
  readonly title: string
  readonly text: string
  readonly updatedAt: string
}

interface JobMaterialEditorProps {
  readonly jobId: string
  readonly type: JobMaterialType
  readonly label: string
  readonly description: string
  readonly initialMaterial: MaterialDraft | null
}

interface ApiResponse { readonly error?: string }

export function JobMaterialEditor(props: JobMaterialEditorProps): ReactElement {
  const router = useRouter()
  const [title, setTitle] = useState(props.initialMaterial?.title ?? props.label)
  const [text, setText] = useState(props.initialMaterial?.text ?? '')
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [preview, setPreview] = useState(false)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setTitle(props.initialMaterial?.title ?? props.label)
    setText(props.initialMaterial?.text ?? '')
    setDirty(false)
  }, [props.initialMaterial, props.label])

  async function generate(regenerate: boolean): Promise<void> {
    setBusy(true)
    try {
      const response = await fetch(`/next-api/jobs/${props.jobId}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: props.type, regenerate }),
      })
      const data = await response.json() as ApiResponse
      if (!response.ok) throw new Error(data.error || '生成材料失败')
      toast.success(regenerate ? '材料已重新生成' : '材料草稿已生成')
      setConfirmRegenerate(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成材料失败')
      setBusy(false)
    }
  }

  async function save(): Promise<void> {
    if (!props.initialMaterial || busy || !dirty) return
    setBusy(true)
    try {
      const response = await fetch(`/next-api/jobs/${props.jobId}/materials/${props.initialMaterial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, text }),
      })
      const data = await response.json() as ApiResponse
      if (!response.ok) throw new Error(data.error || '保存失败')
      setDirty(false)
      toast.success('材料已保存')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  async function copyText(): Promise<void> {
    await navigator.clipboard.writeText(text)
    toast.success('材料已复制')
  }

  async function deleteMaterial(): Promise<void> {
    if (!props.initialMaterial) return
    setBusy(true)
    try {
      const response = await fetch(`/next-api/jobs/${props.jobId}/materials/${props.initialMaterial.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('删除失败')
      toast.success('材料已删除')
      router.push(`/dashboard/jobs/${props.jobId}/materials`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
      setBusy(false)
    }
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      void save()
    }
  }

  if (!props.initialMaterial) {
    return (
      <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-white via-violet-50/60 to-fuchsia-50/60 p-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm"><Sparkles className="h-8 w-8" /></div>
        <h2 className="mt-5 text-xl font-semibold text-slate-800">创建{props.label}</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">{props.description} AI 只使用你已确认的事实，生成后可以自由修改。</p>
        <Button onClick={() => generate(false)} disabled={busy} className="mt-6 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-500 px-7 text-white hover:from-violet-700 hover:to-fuchsia-600">{busy ? <Loader2 className="animate-spin" /> : <Sparkles />}{busy ? '正在生成草稿…' : `生成${props.label}`}</Button>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-white bg-white/90 shadow-sm backdrop-blur-md">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3"><FilePenLine className="h-5 w-5 shrink-0 text-violet-500" /><input value={title} onChange={(event) => { setTitle(event.target.value); setDirty(true) }} maxLength={120} aria-label="材料标题" className="min-w-0 flex-1 border-0 bg-transparent font-semibold text-slate-800 outline-none" /><span className={`shrink-0 text-xs ${dirty ? 'text-amber-500' : 'text-emerald-600'}`}>{dirty ? '未保存' : '已保存'}</span></div>
          <div className="flex flex-wrap gap-2"><Button size="sm" variant={!preview ? 'default' : 'ghost'} onClick={() => setPreview(false)} className={!preview ? 'bg-violet-600 text-white' : ''}>编辑</Button><Button size="sm" variant={preview ? 'default' : 'ghost'} onClick={() => setPreview(true)} className={preview ? 'bg-violet-600 text-white' : ''}>预览</Button></div>
        </div>
        {preview ? <div className="min-h-[560px] whitespace-pre-wrap px-7 py-6 text-sm leading-8 text-slate-700">{text || '暂无内容'}</div> : <textarea value={text} onChange={(event) => { setText(event.target.value); setDirty(true) }} onKeyDown={handleEditorKeyDown} maxLength={20000} aria-label="材料正文" className="min-h-[560px] w-full resize-y border-0 bg-transparent px-7 py-6 text-sm leading-8 text-slate-700 outline-none" />}
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-400">{text.length}/20000 字 · Ctrl/⌘ + S 保存</p><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={copyText}><Clipboard />复制</Button><Button variant="outline" size="sm" onClick={() => setConfirmRegenerate(true)} disabled={busy}><RefreshCw />重新生成</Button><Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)} disabled={busy} className="border-rose-200 text-rose-600 hover:bg-rose-50"><Trash2 />删除</Button><Button size="sm" onClick={save} disabled={busy || !dirty} className="bg-violet-600 text-white hover:bg-violet-700">{busy ? <Loader2 className="animate-spin" /> : <Save />}保存</Button></div></div>
      </section>
      <Button asChild variant="ghost"><Link href={`/dashboard/jobs/${props.jobId}/materials`}><ArrowLeft />返回材料包</Link></Button>
      <ConfirmDialog open={confirmRegenerate} onOpenChange={setConfirmRegenerate} title={`重新生成${props.label}？`} description="当前内容会被新的 AI 草稿替换。建议先复制需要保留的内容。" confirmText="重新生成" cancelText="取消" variant="warning" onConfirm={() => generate(true)} loading={busy} />
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title={`删除${props.label}？`} description="删除后无法恢复，但之后可以重新生成一份草稿。" confirmText="确认删除" cancelText="取消" variant="destructive" onConfirm={deleteMaterial} loading={busy} />
    </div>
  )
}

