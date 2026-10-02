'use client'

import { useId, useRef, useState, useLayoutEffect, type ReactElement } from 'react'
import type { EditableTextProps } from '@/templates/_core/primitives/editable-text'
import { validateSectionDisplayTitle } from '@/entities/resume/section-display-title'
import { useAppStore } from '@/state/store'

/** Section-only editor: business titles never pass through this component's writer. */
export function SectionTitleText({ value, onCommit, as = 'h2', className, style, editClassName }: EditableTextProps): ReactElement {
  const readOnly = useAppStore((s) => s.readOnly)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState<string>()
  const composing = useRef(false)
  const cancelled = useRef(false)
  const errorId = useId()
  const titleRef = useRef<HTMLElement>(null)
  const returnFocus = useRef(false)
  useLayoutEffect(() => {
    if (!editing && returnFocus.current) {
      returnFocus.current = false
      titleRef.current?.focus({ preventScroll: true })
    }
  }, [editing])
  const canEdit = Boolean(onCommit) && !readOnly
  const Tag = as
  const text = <Tag
    ref={(node: HTMLElement | null) => { titleRef.current = node }}
    className={className}
    data-section-display-title="true"
    data-section-title-editable={canEdit ? 'true' : undefined}
    data-resume-edit-field={canEdit ? 'true' : undefined}
    tabIndex={canEdit && !editing ? 0 : undefined}
    title={canEdit ? '点击编辑模块名称' : undefined}
    onKeyDown={canEdit && !editing ? (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        event.stopPropagation()
        setDraft(value)
        setError(undefined)
        setEditing(true)
      }
    } : undefined}
    onPointerDown={canEdit ? (event: React.PointerEvent) => event.stopPropagation() : undefined}
    onMouseDown={canEdit ? (event: React.MouseEvent) => event.stopPropagation() : undefined}
    onTouchStart={canEdit ? (event: React.TouchEvent) => event.stopPropagation() : undefined}
    style={{ minWidth: 0, ...(canEdit ? { cursor: 'text' } : {}), ...style, maxWidth: '100%', overflowWrap: 'anywhere', whiteSpace: 'normal' }}
    onClick={canEdit ? (event: React.MouseEvent) => {
      event.stopPropagation()
      setDraft(value)
      setError(undefined)
      setEditing(true)
    } : undefined}
  >{value}</Tag>

  function commit(): void {
    if (cancelled.current || composing.current) return
    const message = validateSectionDisplayTitle(draft)
    setError(message)
    if (message) { returnFocus.current = false; return }
    if (draft.trim() !== value) onCommit?.(draft.trim())
    setEditing(false)
  }

  if (!editing || !canEdit) return text
  return <div className="relative min-w-0 max-w-full">
    {text}
    <div className="absolute inset-x-0 top-0 z-20 min-w-0 max-w-full rounded bg-white shadow-sm print:hidden" data-export-hide="true">
      <input
        autoFocus
        aria-label="模块名称"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        value={draft}
        onFocus={(event) => { cancelled.current = false; event.currentTarget.select() }}
        onChange={(event) => { setDraft(event.target.value); setError(undefined) }}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData('text')
          if (/[\r\n\u2028\u2029]/u.test(pasted)) {
            event.preventDefault()
            setDraft(pasted)
            setError('模块名称不能包含换行')
          }
        }}
        onCompositionStart={() => { composing.current = true }}
        onCompositionEnd={() => { composing.current = false }}
        onBlur={commit}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) return
          if (event.key === 'Enter') { event.preventDefault(); returnFocus.current = true; commit() }
          if (event.key === 'Escape') { event.preventDefault(); cancelled.current = true; returnFocus.current = true; setEditing(false) }
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        className={editClassName ?? className}
        style={{ outline: 'none', border: 'none', ...style, background: '#fff', color: '#0f172a', width: '100%', minWidth: 0, maxWidth: '100%' }}
      />
      {error && <span id={errorId} role="alert" className="block text-xs font-normal tracking-normal text-red-600">{error}</span>}
    </div>
  </div>
}
