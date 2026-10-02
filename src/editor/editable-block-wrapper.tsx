/**
 * EditableBlockWrapper - A reusable wrapper that adds editing capabilities to any block component.
 * This separates editing logic from display logic, making it easy to create multiple templates.
 */
import { useState, useEffect, useRef, useLayoutEffect, type ReactElement, type ReactNode, type CSSProperties, type MouseEvent } from 'react'
import InlineEditor, { type InlineFocusPoint } from '@/editor/inline-editor'
import { useAppStore } from '@/state/store'
import { CONTENT_BASE_STYLES, CONTENT_EDITING_STYLES_XS, LIST_STYLES } from '@/editor/editor-styles'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import { hasMeaningfulHtml } from '@/lib/resume-placeholders'
import { useRetainEditingBlock } from './use-retain-editing-block'

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
  const displayRef = useRef<HTMLDivElement>(null)
  const returnFocus = useRef(false)
  const [focusPoint, setFocusPoint] = useState<InlineFocusPoint | null>(null)
  useLayoutEffect(() => {
    if (!isEditing && returnFocus.current) {
      returnFocus.current = false
      displayRef.current?.focus({ preventScroll: true })
    }
  }, [isEditing])
  function startEditing(event?: MouseEvent<HTMLDivElement>): void {
    setFocusPoint(event?.detail ? { x: event.clientX, y: event.clientY } : null)
    setIsEditing(true)
  }
  useRetainEditingBlock(props.blockId, isEditing)
  const setResume = useAppStore((s) => s.setResume)
  const resume = useAppStore((s) => s.resume)
  const readOnly = useAppStore((s) => s.readOnly)

  useEffect(() => {
    onEditingChange?.(isEditing)
  }, [isEditing, onEditingChange])

  const contentSize = props.contentSize || 'xs'
  const displayStyles = `${CONTENT_BASE_STYLES} cursor-text rounded p-1 transition-colors ${LIST_STYLES}`
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

  if (!hasContent && props.children && !isEditing) {
    return <>{props.children({ isEditing: false, onStartEdit: () => {} })}</>
  }

  if (readOnly) {
    if (!hasContent && emptyMode !== 'placeholder') return <></>
    return (
      <div
        data-ai-block-id={props.blockId}
        className={`${CONTENT_BASE_STYLES} p-1 ${LIST_STYLES} ${className || ''}`.trim()}
        dangerouslySetInnerHTML={{ __html: hasContent ? content : '' }}
      />
    )
  }

  if (!hasContent && emptyMode === 'hidden' && !isEditing) return <></>

  if (isEditing) {
    return (
      <div data-resume-edit-field="rich-text" className={`${editingStyles} ${className || ''}`.trim()} style={props.editingStyle}>
        <InlineEditor
          initialHtml={editableContent}
          initialFocusPoint={focusPoint}
          onChange={handleContentChange}
          onClickOutside={(): void => setIsEditing(false)}
          onEscape={() => { returnFocus.current = true; setIsEditing(false) }}
          floatingToolbar={true}
          className="outline-none"
        />
      </div>
    )
  }

  if (!hasContent && emptyMode === 'hover') {
    return (
      <div
        ref={displayRef}
        role="button"
        tabIndex={0}
        aria-label={props.placeholder || '编辑正文'}
        data-ai-block-id={props.blockId}
        data-resume-edit-field="rich-text"
        className={`${displayStyles} ${className || ''} hidden cursor-text rounded border border-dashed border-slate-300 px-2 py-1 text-slate-400 transition-colors group-hover/block:block group-focus-within/block:block group-hover/section:block group-hover/section-edit:block print:hidden`.trim()}
        onClick={startEditing}
        onMouseDown={(event) => { if (event.button === 0) event.preventDefault() }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); startEditing() }
        }}
      >
        {props.placeholder || '点击填写内容'}
      </div>
    )
  }

  return (
    <div
      ref={displayRef}
      role="button"
      tabIndex={0}
      aria-label={props.placeholder || '编辑正文'}
      data-ai-block-id={props.blockId}
      data-resume-edit-field="rich-text"
      className={`${displayStyles} ${className || ''}`.trim()}
      onClick={startEditing}
      // Focus-driven dock updates can replace the HTML child between down/up,
      // suppressing its click. The mounted editor takes focus instead.
      onMouseDown={(event) => { if (event.button === 0) event.preventDefault() }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); startEditing() }
      }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}
