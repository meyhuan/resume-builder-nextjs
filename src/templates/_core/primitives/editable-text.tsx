import { useState, createElement } from 'react'
import type { CSSProperties, ReactElement } from 'react'

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
  const isEditable: boolean = Boolean(onCommit)

  if (editing && isEditable) {
    return (
      <input
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
