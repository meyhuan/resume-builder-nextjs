'use client'

import { useEffect, useRef, useState } from 'react'
import { Clipboard, ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Shot = { file: File; text?: string; error?: string }
export function JdInput({ value, onChange, maxLength, optional = false }: {
  value: string; onChange: (value: string) => void; maxLength: number; optional?: boolean
}) {
  const picker = useRef<HTMLInputElement>(null)
  const active = useRef<AbortController | null>(null)
  const [shots, setShots] = useState<Shot[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  useEffect(() => () => active.current?.abort(), [])
  const recognize = async (items: Shot[]) => {
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    setBusy(true)
    const next = [...items]
    setShots(next)
    try {
      for (let i = 0; i < next.length; i++) {
        if (next[i].text) continue
        setProgress(`正在识别 ${i + 1} / ${next.length} 张`)
        try {
          const body = new FormData()
          body.append('file', next[i].file)
          const response = await fetch('/next-api/ai/parse-jd-image', { method: 'POST', body, signal: controller.signal })
          const data = await response.json()
          if (!response.ok || typeof data.text !== 'string' || !data.text.trim()) throw new Error(data.error || '未识别到文字，请换一张截图')
          next[i] = { file: next[i].file, text: data.text.trim() }
        } catch (error) {
          if (controller.signal.aborted) return
          next[i] = { file: next[i].file, error: error instanceof Error ? error.message : '识别失败，请重试' }
        }
        if (controller.signal.aborted) return
        setShots([...next])
      }
    } finally { if (!controller.signal.aborted) setBusy(false) }
  }
  const apply = (append: boolean) => {
    const text = shots.map(s => s.text || '').filter(Boolean).join('\n\n')
    const combined = append && value.trim() ? `${value}\n\n${text}` : text
    if (combined.length > maxLength) { toast.error(`合并后超过 ${maxLength} 字，请减少截图或先精简原文`); return }
    onChange(combined)
    setShots([])
    toast.success('已填入 JD，请核对识别文字后再生成')
  }
  return <div className="space-y-2">
    <div className="flex items-center justify-between gap-1">
      <label htmlFor="career-jd" className="text-sm font-semibold text-slate-900">目标岗位 JD <span className="text-xs font-normal text-slate-400">{optional ? '（选填）' : '（必填）'}</span></label>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={async () => {
          try { const text = await navigator.clipboard.readText(); const combined = value.trim() ? `${value}\n\n${text}` : text; if (combined.length > maxLength) { toast.error(`最多支持 ${maxLength} 字`); return }; if (text.trim()) onChange(combined) }
          catch { toast.info('请长按输入框粘贴文字') }
        }} className="flex min-h-9 items-center gap-1 px-1 text-xs text-violet-700"><Clipboard size={13} />粘贴</button>
        <button type="button" disabled={busy} onClick={() => picker.current?.click()} className="flex min-h-9 items-center gap-1 px-1 text-xs text-violet-700 disabled:opacity-50"><ImagePlus size={13} />图片识别</button>
      </div>
    </div>
    <input ref={picker} type="file" multiple accept="image/png,image/jpeg,image/webp" aria-label="选择岗位截图" className="hidden" onChange={e => {
      const files = Array.from(e.target.files || [])
      e.target.value = ''
      if (!files.length) return
      if (files.length > 3) { toast.error('每次最多选择 3 张截图'); return }
      if (files.some(f => f.size > 5 * 1024 * 1024 || !/\.(png|jpe?g|webp)$/i.test(f.name))) { toast.error('请选择每张不超过 5MB 的 PNG、JPG 或 WebP 图片'); return }
      void recognize(files.map(file => ({ file })))
    }} />
    <div className="relative">
      <textarea id="career-jd" aria-label="目标岗位职位描述" value={value} onChange={e => onChange(e.target.value.slice(0, maxLength))} placeholder="粘贴岗位职责与要求，或从截图识别文字" className="block h-28 w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 px-3 pt-2 pb-8 text-sm leading-5 placeholder:text-slate-400 focus:border-violet-500 focus:outline-hidden" />
      <button type="button" disabled={!value} onClick={() => onChange('')} className="absolute bottom-0 left-2 min-h-8 px-1 text-xs text-slate-400 disabled:opacity-40">清空</button>
      <span className="absolute bottom-2 right-3 text-[11px] text-slate-400">{value.length}/{maxLength}</span>
    </div>
    {shots.length > 0 && <div className="rounded-xl bg-violet-50/60 p-3 text-xs leading-5 text-slate-600">
      <p role="status" className="flex items-center gap-1 font-medium text-violet-800">{busy && <Loader2 size={13} className="animate-spin" />}{busy ? progress : '识别完成，请核对后填入'}</p>
      <p className="text-[11px] text-slate-500">每次最多 3 张，每张 ≤5MB；不扣 AI 生成次数，使用独立识别限额。</p>
      {shots.map((shot, i) => <div key={i} className="mt-2">
        <p className="truncate">{i + 1}. {shot.file.name}</p>
        {shot.error ? <p className="text-rose-600">{shot.error}</p> : shot.text ? <p className="max-h-24 overflow-auto whitespace-pre-wrap">{shot.text}</p> : null}
      </div>)}
      {!busy && <div className="mt-2 flex flex-wrap gap-2">
        {shots.some(s => s.error) && <button type="button" className="min-h-9 px-2 text-violet-700" onClick={() => void recognize(shots)}>重试失败图片</button>}
        {shots.some(s => s.text) && <>
          <button type="button" className="min-h-9 rounded-lg bg-violet-600 px-3 text-white" onClick={() => apply(false)}>{value.trim() ? '替换原文' : '填入 JD'}</button>
          {value.trim() && <button type="button" className="min-h-9 px-2 text-violet-700" onClick={() => apply(true)}>追加到原文</button>}
        </>}
        <button type="button" className="min-h-9 px-2" onClick={() => setShots([])}>放弃识别结果</button>
      </div>}
    </div>}
  </div>
}
