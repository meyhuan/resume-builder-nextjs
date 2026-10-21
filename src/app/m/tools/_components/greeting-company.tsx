'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export function GreetingCompany({ text, company, onChange }: {
  text: string
  company: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  return <>
    {text.split('贵司').map((part, index) => <span key={index}>
      {index > 0 && <button type="button" aria-label="填写公司名称" className="border-b border-dashed border-violet-400 bg-violet-50 px-1 text-violet-700"
        onClick={() => { setDraft(company); setOpen(true) }}>{company || '贵司'}</button>}
      {part}
    </span>)}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogTitle>填写公司名称</DialogTitle>
        <DialogDescription>所有打招呼风格会使用这个名称，复制时同步替换。</DialogDescription>
        <form onSubmit={e => { e.preventDefault(); if (draft.trim()) { onChange(draft.trim()); setOpen(false) } }} className="space-y-4">
          <label className="block text-sm">公司名称
            <input autoFocus maxLength={40} value={draft} onChange={e => setDraft(e.target.value)} placeholder="例如：智简科技" className="mt-2 min-h-12 w-full rounded-[10px] border border-slate-200 px-3 text-base focus:outline-violet-500" />
          </label>
          <button type="submit" disabled={!draft.trim()} className="min-h-12 w-full rounded-xl bg-violet-600 text-sm font-semibold text-white disabled:opacity-50">确认替换</button>
        </form>
      </DialogContent>
    </Dialog>
  </>
}
