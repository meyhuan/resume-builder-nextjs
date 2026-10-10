'use client'

import { useId, useRef, useState, type ReactElement } from 'react'
import type { Section } from '@/entities/resume/section'
import { getSectionDisplayTitle, validateSectionDisplayTitle } from '@/entities/resume/section-display-title'

export function SectionNameEditor({ section, fallback, onChange, readOnly = false }: {
  section: Section
  fallback?: string
  onChange: (sectionId: string, value: string | undefined) => void
  readOnly?: boolean
}): ReactElement {
  const title = getSectionDisplayTitle(section, fallback)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const [error, setError] = useState<string>()
  const composing = useRef(false)
  const id = useId()
  function save(): void {
    const message = validateSectionDisplayTitle(draft)
    setError(message)
    if (message) return
    onChange(section.id, draft.trim())
    setEditing(false)
  }
  return <div className="min-w-0 flex-1">
    {editing && !readOnly ? <div className="print:hidden" data-export-hide="true" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
      <input id={id} aria-label="模块名称" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} autoFocus value={draft}
        className="w-full min-w-0 rounded-md border border-violet-300 bg-white px-2 py-1 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-violet-200"
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => { setDraft(e.target.value); setError(undefined) }}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData('text')
          if (/[\r\n\u2028\u2029]/u.test(pasted)) {
            e.preventDefault()
            setDraft(pasted)
            setError('模块名称不能包含换行')
          }
        }}
        onCompositionStart={() => { composing.current = true }} onCompositionEnd={() => { composing.current = false }}
        onKeyDown={(e) => {
          if (composing.current || e.nativeEvent.isComposing || e.keyCode === 229) return
          if (e.key === 'Enter') { e.preventDefault(); save() }
          if (e.key === 'Escape') { e.preventDefault(); setEditing(false) }
        }} />
      {error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
      <div className="mt-1 flex gap-3 text-xs">
        <button type="button" className="py-1 text-violet-700" onClick={save}>确定</button>
        <button type="button" className="py-1 text-slate-500" onClick={() => setEditing(false)}>取消</button>
      </div>
    </div> : <span className="block break-words text-sm font-medium text-slate-700" style={{ overflowWrap: 'anywhere' }}>{title}</span>}
    {!readOnly && !editing && <div className="flex flex-wrap gap-3 text-xs print:hidden" data-export-hide="true" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
      <button type="button" aria-label={`修改${title}名称`} className="py-1 text-violet-700" onClick={() => { setDraft(title); setError(undefined); setEditing(true) }}>修改模块名称</button>
      {section.displayTitle !== undefined && <button type="button" className="py-1 text-slate-500" onClick={() => onChange(section.id, undefined)}>恢复默认名称</button>}
    </div>}
  </div>
}
