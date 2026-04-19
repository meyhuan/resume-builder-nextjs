import type { ReactElement, ReactNode, CSSProperties } from 'react'
import { XCircle } from 'lucide-react'
import type { BaseInfoFieldDef } from '@/templates/_kernel/shared'
import type { EditableHeader } from '../hooks/use-editable-header'

/**
 * Unstyled single-field chip with hover-to-delete affordance.
 *
 * Template decides layout, icon placement, colors. This component only
 * wires the hover tracking and delete button. Children override default text.
 */
export interface FieldChipProps {
  readonly field: BaseInfoFieldDef
  readonly header: EditableHeader
  readonly className?: string
  readonly style?: CSSProperties
  readonly children?: ReactNode
  /** Small visual icon on top-right of the delete button. Defaults to XCircle. */
  readonly deleteIcon?: ReactNode
  /** Optional CSS color for the delete icon. */
  readonly deleteColor?: string
}

export function FieldChip(props: FieldChipProps): ReactElement {
  const { field, header, className, style, children, deleteIcon, deleteColor } = props
  const { hoveredField, setHoveredField, deleteField } = header
  const isHovered: boolean = hoveredField === field.key
  return (
    <span
      className={`relative inline-flex items-center ${className ?? ''}`}
      style={style}
      onMouseEnter={() => setHoveredField(field.key)}
      onMouseLeave={() => setHoveredField(null)}
    >
      {children ?? field.value}
      {isHovered && (
        <button
          type="button"
          className="absolute -right-2 -top-2 bg-white rounded-full print:hidden transition-colors z-10"
          style={{ color: deleteColor ?? '#ef4444' }}
          onClick={(e) => { e.stopPropagation(); deleteField(field.key) }}
          aria-label={`删除 ${field.label}`}
        >
          {deleteIcon ?? <XCircle size={14} />}
        </button>
      )}
    </span>
  )
}
