import { useState, useRef, useLayoutEffect } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { useAppStore } from '@/state/store'

type TagName = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div'

/**
 * Unstyled inline-editable text primitive.
 *
 * Behavior only: click-to-edit, Enter/blur to commit, Esc to cancel.
 * The template controls the tag (`as`) and all styling via `className` / `style`.
 * Omit `onCommit` to disable editing.
 */
export interface EditableTextProps {
  readonly value: string
  readonly onCommit?: (next: string) => void
  readonly as?: TagName
  readonly className?: string
  readonly style?: CSSProperties
  readonly placeholder?: string
  /** Optional class applied to the <input> during edit (defaults to className). */
  readonly editClassName?: string
}

export function EditableText(props: EditableTextProps): ReactElement {
  const {
    value, onCommit, as = 'span',
    className, style, placeholder, editClassName,
  } = props
  const [editing, setEditing] = useState<boolean>(false)
  const [draft, setDraft] = useState<string>(value)
  const fieldRef = useRef<HTMLElement>(null)
  const composing = useRef(false)
  const finished = useRef(false)
  const returnFocus = useRef(false)
  const readOnly = useAppStore((s) => s.readOnly)
  const isEditable: boolean = Boolean(onCommit) && !readOnly

  useLayoutEffect(() => {
    if (!editing && returnFocus.current) {
      returnFocus.current = false
      fieldRef.current?.focus({ preventScroll: true })
    }
  }, [editing])

  function startEditing(): void {
    finished.current = false
    composing.current = false
    setDraft(value)
    setEditing(true)
  }

  function commit(): void {
    if (finished.current) return
    finished.current = true
    if (draft !== value) onCommit?.(draft)
    setEditing(false)
  }

  if (editing && isEditable) {
    return (
      <input
        data-resume-edit-field="true"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onCompositionStart={() => { composing.current = true }}
        onCompositionEnd={() => { composing.current = false }}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (composing.current || e.nativeEvent.isComposing || e.keyCode === 229) return
          if (e.key === 'Enter') { e.preventDefault(); returnFocus.current = true; commit() }
          if (e.key === 'Escape') { e.preventDefault(); finished.current = true; returnFocus.current = true; setDraft(value); setEditing(false) }
        }}
        onClick={(e) => e.stopPropagation()}
        className={editClassName ?? className}
        style={{ background: 'transparent', outline: 'none', border: 'none', ...style }}
        placeholder={placeholder}
      />
    )
  }

  const Tag = as
  return <Tag
      className={className}
      ref={(node: HTMLElement | null) => { fieldRef.current = node }}
      data-resume-edit-field={isEditable ? 'true' : undefined}
      tabIndex={isEditable ? 0 : undefined}
      onKeyDown={isEditable ? (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          event.stopPropagation()
          startEditing()
        }
      } : undefined}
      style={{ ...(isEditable ? { cursor: 'text' } : null), ...style }}
      onClick={isEditable
        ? (e: React.MouseEvent<HTMLElement>): void => {
            e.stopPropagation()
            startEditing()
          }
        : undefined}
    >{value || placeholder || ''}</Tag>
}
