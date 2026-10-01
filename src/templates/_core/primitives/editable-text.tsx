import { useState, createElement } from 'react'
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
  const readOnly = useAppStore((s) => s.readOnly)
  const isEditable: boolean = Boolean(onCommit) && !readOnly

  if (editing && isEditable) {
    return (
      <input
        data-resume-edit-field="true"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          onCommit?.(draft)
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
        onClick={(e) => e.stopPropagation()}
        className={editClassName ?? className}
        style={{ background: 'transparent', outline: 'none', border: 'none', ...style }}
        placeholder={placeholder}
      />
    )
  }

  return createElement(
    as,
    {
      className,
      'data-resume-edit-field': isEditable ? 'true' : undefined,
      tabIndex: isEditable ? 0 : undefined,
      onKeyDown: isEditable ? (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          event.stopPropagation()
          setDraft(value)
          setEditing(true)
        }
      } : undefined,
      style: { ...(isEditable ? { cursor: 'text' } : null), ...style },
      onClick: isEditable
        ? (e: React.MouseEvent<HTMLElement>): void => {
            e.stopPropagation()
            setDraft(value)
            setEditing(true)
          }
        : undefined,
    },
    value || placeholder || '',
  )
}
