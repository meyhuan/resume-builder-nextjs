/**
 * EditableFieldWrapper - A reusable wrapper for inline text field editing.
 * Handles field-level editing like company name, position, dates, etc.
 */
import { useState, useRef, useEffect, type ReactElement, type KeyboardEvent } from 'react'
import { useAppStore } from '@/state/store'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import { hasMeaningfulText } from '@/lib/resume-placeholders'

/**
 * Default placeholders derived from the `fieldName` of common resume block fields.
 * Callers can still pass an explicit `placeholder` to override.
 */
const FIELD_PLACEHOLDERS: Readonly<Record<string, string>> = {
  company: '公司名称',
  position: '职位名称',
  industry: '行业',
  name: '项目名称',
  role: '角色',
  school: '学校名称',
  major: '专业',
  degree: '学历',
  organization: '社团 / 活动',
  startDate: '开始时间',
  endDate: '结束时间',
}

function resolveFieldPlaceholder(fieldName: string, explicit?: string): string {
  if (explicit && explicit.length > 0) return explicit
  return FIELD_PLACEHOLDERS[fieldName] ?? '点击编辑'
}

interface EditableFieldWrapperProps {
  readonly blockId: string
  readonly fieldName: string
  readonly value: string | undefined
  readonly className?: string
  readonly placeholder?: string
  readonly emptyMode?: 'placeholder' | 'hover' | 'hidden'
  readonly title?: string
  readonly onUpdate: (value: string) => void
  readonly onEditingChange?: (isEditing: boolean) => void
}

/**
 * Wraps individual text fields with inline editing capability.
 * Provides click-to-edit functionality for short text fields.
 * 
 * @example
 * <EditableFieldWrapper
 *   blockId={block.id}
 *   fieldName="company"
 *   value={block.company}
 *   onUpdate={(value) => updateBlock({ company: value })}
 *   className="font-semibold"
 *   title="点击编辑公司名称"
 * >
 *   {block.company}
 * </EditableFieldWrapper>
 */
export default function EditableFieldWrapper(props: EditableFieldWrapperProps): ReactElement {
  const { onEditingChange } = props
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState(props.value || '')
  const inputRef = useRef<HTMLInputElement>(null)
  const setResume = useAppStore((s) => s.setResume)
  const readOnly = useAppStore((s) => s.readOnly)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    onEditingChange?.(isEditing)
  }, [isEditing, onEditingChange])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTempValue(props.value || '')
  }, [props.value])

  function startEditing(): void {
    setTempValue(props.value || '')
    setIsEditing(true)
  }

  function saveEdit(): void {
    if (tempValue.trim() !== (props.value || '')) {
      setResume((draft) => {
        for (const section of draft.sections) {
          for (let i = 0; i < section.blocks.length; i++) {
            const block: ResumeBlock = section.blocks[i]
            if (block.id === props.blockId) {
              section.blocks[i] = { ...block, [props.fieldName]: tempValue.trim() }
              return
            }
          }
        }
      })
    }
    setIsEditing(false)
  }

  function cancelEdit(): void {
    setTempValue(props.value || '')
    setIsEditing(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }

  const placeholder: string = resolveFieldPlaceholder(props.fieldName, props.placeholder)
  const emptyMode = props.emptyMode ?? 'placeholder'
  const hasValue = hasMeaningfulText(props.value)
  const displayValue = hasValue ? props.value : ''

  if (readOnly) {
    if (!hasValue && emptyMode !== 'placeholder') return <></>
    return (
      <span className={props.className} style={{ whiteSpace: 'pre-wrap' }}>
        {displayValue || ''}
      </span>
    )
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={tempValue}
        onChange={(e): void => setTempValue(e.target.value)}
        onBlur={saveEdit}
        onKeyDown={handleKeyDown}
        className={`${props.className || ''} bg-blue-50 text-slate-900 rounded px-1 leading-tight outline-none min-w-[50px] w-full ring-1 ring-blue-500`}
        placeholder={placeholder}
      />
    )
  }

  if (!hasValue && emptyMode === 'hidden') return <></>

  if (!hasValue && emptyMode === 'hover') {
    return (
      <span
        onClick={startEditing}
        className={`${props.className || ''} hidden cursor-text rounded border border-dashed border-slate-300 px-1 leading-tight text-slate-400 transition-colors hover:bg-gray-100 hover:!text-slate-900 group-hover/block:inline-flex group-hover/section:inline-flex group-hover/section-edit:inline-flex print:hidden`}
        title={props.title || `点击编辑${placeholder}`}
      >
        {placeholder}
      </span>
    )
  }

  return (
    <span
      onClick={startEditing}
      className={`${props.className || ''} cursor-text hover:bg-gray-100 hover:!text-slate-900 rounded px-1 leading-tight transition-colors border border-transparent`}
      title={props.title || `点击编辑${placeholder}`}
    >
      {displayValue || placeholder}
    </span>
  )
}
