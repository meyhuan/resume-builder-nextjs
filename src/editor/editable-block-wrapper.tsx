/**
 * EditableBlockWrapper - A reusable wrapper that adds editing capabilities to any block component.
 * This separates editing logic from display logic, making it easy to create multiple templates.
 */
import { useState, useEffect, type ReactElement, type ReactNode } from 'react'
import InlineEditor from '@/editor/inline-editor'
import { useAppStore } from '@/state/store'
import { CONTENT_DISPLAY_STYLES_XS, CONTENT_EDITING_STYLES_XS } from '@/editor/editor-styles'
import type { ResumeBlock } from '@/entities/blocks/resume-block'

interface EditableBlockWrapperProps {
  readonly blockId: string
  readonly contentField: 'contentHtml' | 'courseHtml' | 'html'
  readonly contentSize?: 'xs' | 'sm'
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
  const { onEditingChange } = props
  const [isEditing, setIsEditing] = useState(false)
  const setResume = useAppStore((s) => s.setResume)
  const resume = useAppStore((s) => s.resume)

  useEffect(() => {
    onEditingChange?.(isEditing)
  }, [isEditing, onEditingChange])

  const contentSize = props.contentSize || 'xs'
  const displayStyles = contentSize === 'xs' ? CONTENT_DISPLAY_STYLES_XS : CONTENT_DISPLAY_STYLES_XS
  const editingStyles = contentSize === 'xs' ? CONTENT_EDITING_STYLES_XS : CONTENT_EDITING_STYLES_XS

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

  if (!content && props.children) {
    return <>{props.children({ isEditing: false, onStartEdit: () => {} })}</>
  }

  if (isEditing) {
    return (
      <div className={editingStyles}>
        <InlineEditor
          initialHtml={content}
          onChange={handleContentChange}
          onClickOutside={(): void => setIsEditing(false)}
          floatingToolbar={true}
          className="outline-none"
        />
      </div>
    )
  }

  return (
    <div
      className={displayStyles}
      onClick={(): void => setIsEditing(true)}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}
