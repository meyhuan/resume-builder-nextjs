/**
 * EditableBlockWrapper - A reusable wrapper that adds editing capabilities to any block component.
 * This separates editing logic from display logic, making it easy to create multiple templates.
 */
import { useState, useEffect, type ReactElement, type ReactNode, type CSSProperties } from 'react'
import InlineEditor from '@/editor/inline-editor'
import { useAppStore } from '@/state/store'
import { CONTENT_DISPLAY_STYLES_XS, CONTENT_EDITING_STYLES_XS } from '@/editor/editor-styles'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import { hasMeaningfulHtml } from '@/lib/resume-placeholders'

interface EditableBlockWrapperProps {
  readonly blockId: string
  readonly contentField: 'contentHtml' | 'courseHtml' | 'html'
  readonly contentSize?: 'xs' | 'sm'
  readonly className?: string
  readonly editingStyle?: CSSProperties
  readonly emptyMode?: 'placeholder' | 'hover' | 'hidden'
  readonly placeholder?: string
  readonly onEditingChange?: (isEditing: boolean) => void
  readonly children?: (props: {
    isEditing: boolean
    onStartEdit: () => void
  }) => ReactNode
}

/**
 * Wraps content blocks with editing functionality.
 * Handles edit state management and provides editing UI.
 * 
 * @example
 * <EditableBlockWrapper blockId={block.id} contentField="contentHtml">
 *   {({ isEditing, onStartEdit }) => (
 *     isEditing ? <EditView /> : <DisplayView onClick={onStartEdit} />
 *   )}
 * </EditableBlockWrapper>
 */
export default function EditableBlockWrapper(props: EditableBlockWrapperProps): ReactElement {
  const { onEditingChange, className } = props
  const [isEditing, setIsEditing] = useState(false)
  const setResume = useAppStore((s) => s.setResume)
  const resume = useAppStore((s) => s.resume)
  const readOnly = useAppStore((s) => s.readOnly)

  useEffect(() => {
    onEditingChange?.(isEditing)
  }, [isEditing, onEditingChange])

  const contentSize = props.contentSize || 'xs'
  const displayStyles = contentSize === 'xs' ? CONTENT_DISPLAY_STYLES_XS : CONTENT_DISPLAY_STYLES_XS
  const editingStyles = contentSize === 'xs' ? CONTENT_EDITING_STYLES_XS : CONTENT_EDITING_STYLES_XS
  const emptyMode = props.emptyMode ?? 'placeholder'

  function findBlockContent(): string {
    for (const section of resume.sections) {
      for (const block of section.blocks) {
        if (block.id === props.blockId) {
          if (props.contentField === 'contentHtml' && 'contentHtml' in block) {
            return block.contentHtml || ''
          }
          if (props.contentField === 'courseHtml' && 'courseHtml' in block) {
            return block.courseHtml || ''
          }
          if (props.contentField === 'html' && 'html' in block) {
            return block.html || ''
          }
        }
      }
    }
    return ''
  }

  function handleContentChange(html: string): void {
    setResume((draft) => {
      for (const section of draft.sections) {
        for (let i = 0; i < section.blocks.length; i++) {
          const block: ResumeBlock = section.blocks[i]
          if (block.id === props.blockId) {
            if (props.contentField === 'contentHtml' && 'contentHtml' in block) {
              section.blocks[i] = { ...block, contentHtml: html }
            } else if (props.contentField === 'courseHtml' && 'courseHtml' in block) {
              section.blocks[i] = { ...block, courseHtml: html }
            } else if (props.contentField === 'html' && 'html' in block) {
              section.blocks[i] = { ...block, html: html }
            }
            return
          }
        }
      }
    })
  }

  const content = findBlockContent()
  const hasContent = hasMeaningfulHtml(content)
  const editableContent = hasContent ? content : ''

  if (!hasContent && props.children) {
    return <>{props.children({ isEditing: false, onStartEdit: () => {} })}</>
  }

  if (readOnly) {
    if (!hasContent && emptyMode !== 'placeholder') return <></>
    return (
      <div
        className={`${displayStyles} ${className || ''}`.trim()}
        dangerouslySetInnerHTML={{ __html: hasContent ? content : '' }}
      />
    )
  }

  if (!hasContent && emptyMode === 'hidden') return <></>

  if (isEditing) {
    return (
      <div className={`${editingStyles} ${className || ''}`.trim()} style={props.editingStyle}>
        <InlineEditor
          initialHtml={editableContent}
          onChange={handleContentChange}
          onClickOutside={(): void => setIsEditing(false)}
          floatingToolbar={true}
          className="outline-none"
        />
      </div>
    )
  }

  if (!hasContent && emptyMode === 'hover') {
    return (
      <div
        className={`${displayStyles} ${className || ''} hidden cursor-text rounded border border-dashed border-slate-300 px-2 py-1 text-slate-400 transition-colors hover:bg-gray-50 hover:text-slate-700 group-hover/block:block group-hover/section:block group-hover/section-edit:block print:hidden`.trim()}
        onClick={(): void => setIsEditing(true)}
      >
        {props.placeholder || '点击填写内容'}
      </div>
    )
  }

  return (
    <div
      className={`${displayStyles} ${className || ''}`.trim()}
      onClick={(): void => setIsEditing(true)}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}
