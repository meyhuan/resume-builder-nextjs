"use client"

import { useState } from 'react'
import { useAppStore } from '@/state/store'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { EditableHeader } from '@/templates/_core'
import { readSavedMetrics, writeSavedMetrics } from '@/templates/_originals/saved-metrics'

/** Compatibility only: show previously saved facts, never generate any fallback facts. */
export function SavedFacts({ header }: { readonly header: EditableHeader }) {
  const readOnly = useAppStore((s) => s.readOnly)
  const updateBaseInfo = useAppStore((s) => s.updateBaseInfo)
  const [editing, setEditing] = useState<'业绩' | '亮点' | null>(null)
  const [draft, setDraft] = useState<string[][]>([])
  const groups = (['业绩', '亮点'] as const).map((prefix) => ({ prefix, items: readSavedMetrics(header.baseInfo, prefix) }))
  return <>
    {groups.map(({ prefix, items }) => items.some(([value]) => value.trim()) ? <div key={prefix} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', marginBottom: 16 }}>
      {items.filter(([value]) => value.trim()).map(([value, label], index) => <button key={index} type="button" disabled={readOnly} className="text-left" onClick={() => { setDraft(items.map((item) => [...item])); setEditing(prefix) }} style={{ borderLeft: '2px solid var(--canva-accent)', paddingLeft: 10, fontSize: '.9em' }}><strong>{value}</strong>{label ? <span style={{ display: 'block', fontSize: '.8em' }}>{label}</span> : null}</button>)}
    </div> : null)}
    {editing ? <Dialog open onOpenChange={(open) => { if (!open) setEditing(null) }}><DialogContent><DialogHeader><DialogTitle>编辑已保存的{editing}</DialogTitle></DialogHeader>
      {draft.map(([value, label], index) => <div key={index} className="grid grid-cols-2 gap-3"><Input aria-label={`${editing}${index + 1}数值`} value={value} onChange={(event) => setDraft((current) => current.map((item, i) => i === index ? [event.target.value, item[1]] : item))} /><Input aria-label={`${editing}${index + 1}说明`} value={label} onChange={(event) => setDraft((current) => current.map((item, i) => i === index ? [item[0], event.target.value] : item))} /></div>)}
      <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>取消</Button><Button onClick={() => { updateBaseInfo(writeSavedMetrics(header.baseInfo, editing, draft), header.name); setEditing(null) }}>保存</Button></DialogFooter>
    </DialogContent></Dialog> : null}
  </>
}
