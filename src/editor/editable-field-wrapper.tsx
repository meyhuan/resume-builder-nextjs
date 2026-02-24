/**
 * EditableFieldWrapper - A reusable wrapper for inline text field editing.
 * Handles field-level editing like company name, position, dates, etc.
 */
import { useState, useRef, useEffect, type ReactElement, type KeyboardEvent } from 'react'
import { useAppStore } from '@/state/store'
import type { ResumeBlock } from '@/entities/blocks/resume-block'

interface EditableFieldWrapperProps {
  readonly blockId: string
  readonly fieldName: string
  readonly value: string | undefined
  readonly className?: string
  readonly placeholder?: string
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

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={tempValue}
        onChange={(e): void => setTempValue(e.target.value)}
        onBlur={saveEdit}
        onKeyDown={handleKeyDown}
        className={`${props.className || ''} bg-blue-50 rounded px-1 leading-tight outline-none min-w-[50px] w-full text-right ring-1 ring-blue-500`}
        placeholder={props.placeholder}
      />
    )
  }

  return (
    <span
      onClick={startEditing}
      className={`${props.className || ''} cursor-text hover:bg-gray-100 rounded px-1 leading-tight transition-colors border border-transparent`}
      title={props.title || '点击编辑'}
    >
      {props.value || props.placeholder || '点击编辑'}
    </span>
  )
}
