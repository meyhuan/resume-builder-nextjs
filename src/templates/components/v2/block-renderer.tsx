/**
 * V2 BlockRenderer - Style-Driven Architecture
 * 
 * Fully decoupled block rendering component supporting:
 * 1. Style configuration driven
 * 2. Custom render functions
 * 3. Slot pattern
 * 
 * Adding new templates requires no changes to this file.
 */

import type { ReactElement } from 'react'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import EditableBlockWrapper from '@/editor/editable-block-wrapper'
import EditableFieldWrapper from '@/editor/editable-field-wrapper'
import EditableDateField from '@/editor/editable-date-field'
import type {
  BlockRendererStyles,
  BlockRenderProps,
  BlockSlots,
} from './types'

export interface BlockRendererProps {
  readonly block: ResumeBlock
  readonly themeColor: string
  readonly onEditingChange?: (isEditing: boolean) => void
  
  // Option 1: Style configuration (recommended for most cases)
  readonly styles?: BlockRendererStyles
  
  // Option 2: Fully custom render (for completely different layouts)
  readonly renderCustom?: (props: BlockRenderProps) => ReactElement
  
  // Option 3: Slot pattern (for partial customization)
  readonly slots?: BlockSlots
}

/**
 * V2 Block Renderer - Style configuration driven.
 */
export default function BlockRenderer(props: BlockRendererProps): ReactElement {
  const { block, themeColor, onEditingChange, styles = {}, renderCustom, slots } = props

  // Option 2: Fully custom render
  if (renderCustom) {
    return renderCustom({
      block,
      themeColor,
      isEditing: false,
      onEditingChange: onEditingChange || (() => {}),
    })
  }

  // Select layout based on style config
  // const layout = styles.layout || 'default' // Unused
  const containerClassName = styles.container || ''
  const spacingClassName = styles.spacing || ''

  // Default render: based on block type and layout style
  return (
    <div className={`${containerClassName} ${spacingClassName}`.trim()}>
      {slots?.header ? (
        slots.header(block, themeColor)
      ) : (
        renderBlockHeader(block, themeColor, styles, onEditingChange)
      )}
      
      {slots?.content ? (
        slots.content(block)
      ) : (
        renderBlockContent(block, styles, onEditingChange)
      )}
      
      {slots?.footer && slots.footer(block)}
    </div>
  )
}

/**
 * Render block header.
 */
function renderBlockHeader(
  block: ResumeBlock,
  themeColor: string,
  styles: BlockRendererStyles,
  onEditingChange?: (isEditing: boolean) => void
): ReactElement | null {
  const layout = styles.layout || 'default'
  
  // Render different headers based on layout type
  if (layout === 'card' || layout === 'default') {
    return renderCardHeader(block, themeColor, styles, onEditingChange)
  }
  
  if (layout === 'timeline') {
    return renderTimelineHeader(block, themeColor, styles, onEditingChange)
  }
  
  if (layout === 'minimal') {
    return renderMinimalHeader(block, themeColor, styles, onEditingChange)
  }
  
  // Custom layout: use style config
  return renderCardHeader(block, themeColor, styles, onEditingChange)
}

/**
 * Card-style header.
 */
function renderCardHeader(
  block: ResumeBlock,
  themeColor: string,
  styles: BlockRendererStyles,
  onEditingChange?: (isEditing: boolean) => void
): ReactElement | null {
  if (block.type === 'experience') {
    return (
      <div className={styles.header || 'flex justify-between items-start mb-2'}>
        <div className="flex-1">
          <h3 
            className={styles.title?.className || 'font-semibold'}
            style={{ fontSize: styles.title?.fontSize, fontWeight: styles.title?.fontWeight, color: styles.title?.color }}
          >
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="company"
              value={block.company}
              onUpdate={() => {}}
              onEditingChange={onEditingChange}
              className={styles.title?.className || 'font-semibold'}
            />
          </h3>
          <p 
            className={styles.subtitle?.className || 'text-gray-600 mt-0.5'}
            style={{ fontSize: styles.subtitle?.fontSize, fontWeight: styles.subtitle?.fontWeight, color: styles.subtitle?.color }}
          >
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="position"
              value={block.position}
              onUpdate={() => {}}
            />
            {block.industry ? (
              <>
                {' | '}
                <EditableFieldWrapper
                  blockId={block.id}
                  fieldName="industry"
                  value={block.industry}
                  onUpdate={() => {}}
                />
              </>
            ) : null}
          </p>
        </div>
        <div 
          className={styles.dateRange?.className || 'text-gray-500 ml-4 shrink-0'}
          style={{ fontSize: styles.dateRange?.fontSize, fontWeight: styles.dateRange?.fontWeight }}
        >
          <EditableDateField blockId={block.id} fieldName="startDate" value={block.startDate} />
          {' - '}
          <EditableDateField blockId={block.id} fieldName="endDate" value={block.endDate} />
        </div>
      </div>
    )
  }

  if (block.type === 'project') {
    return (
      <div className={styles.header || 'flex justify-between items-start mb-2'}>
        <div className="flex-1">
          <h3 
            className={styles.title?.className || 'font-semibold'}
            style={{ fontSize: styles.title?.fontSize, fontWeight: styles.title?.fontWeight, color: styles.title?.color }}
          >
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="name"
              value={block.name}
              onUpdate={() => {}}
              onEditingChange={onEditingChange}
              className={styles.title?.className || 'font-semibold'}
            />
          </h3>
          {block.role ? (
            <p 
              className={styles.subtitle?.className || 'mt-0.5'}
              style={{ fontSize: styles.subtitle?.fontSize, fontWeight: styles.subtitle?.fontWeight, color: styles.subtitle?.color }}
            >
              <EditableFieldWrapper
                blockId={block.id}
                fieldName="role"
                value={block.role}
                onUpdate={() => {}}
              />
            </p>
          ) : null}
        </div>
        <div 
          className={styles.dateRange?.className || 'text-gray-500 ml-4 shrink-0'}
          style={{ fontSize: styles.dateRange?.fontSize, fontWeight: styles.dateRange?.fontWeight }}
        >
          <EditableDateField blockId={block.id} fieldName="startDate" value={block.startDate} />
          {' - '}
          <EditableDateField blockId={block.id} fieldName="endDate" value={block.endDate} />
        </div>
      </div>
    )
  }

  if (block.type === 'education') {
    return (
      <div className={styles.header || 'flex justify-between items-start mb-2'}>
        <div className="flex-1">
          <h3 
            className={styles.title?.className || 'font-semibold'}
            style={{ fontSize: styles.title?.fontSize, fontWeight: styles.title?.fontWeight, color: styles.title?.color }}
          >
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="school"
              value={block.school}
              onUpdate={() => {}}
              onEditingChange={onEditingChange}
              className={styles.title?.className || 'font-semibold'}
            />
          </h3>
          <p 
            className={styles.subtitle?.className || 'text-gray-600 mt-0.5'}
            style={{ fontSize: styles.subtitle?.fontSize, fontWeight: styles.subtitle?.fontWeight, color: styles.subtitle?.color }}
          >
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="major"
              value={block.major}
              onUpdate={() => {}}
            />
            {' | '}
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="degree"
              value={block.degree}
              onUpdate={() => {}}
            />
          </p>
        </div>
        <div 
          className={styles.dateRange?.className || 'text-gray-500 ml-4 shrink-0'}
          style={{ fontSize: styles.dateRange?.fontSize, fontWeight: styles.dateRange?.fontWeight }}
        >
          <EditableDateField blockId={block.id} fieldName="startDate" value={block.startDate} />
          {' - '}
          <EditableDateField blockId={block.id} fieldName="endDate" value={block.endDate} />
        </div>
      </div>
    )
  }

  if (block.type === 'campus') {
    return (
      <div className={styles.header || 'flex justify-between items-start mb-2'}>
        <div className="flex-1">
          <h3 className={styles.title?.className || 'font-semibold'}>
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="organization"
              value={block.organization}
              onUpdate={() => {}}
              onEditingChange={onEditingChange}
              className={styles.title?.className || 'font-semibold'}
            />
          </h3>
          <p className={styles.subtitle?.className || 'text-gray-600 mt-0.5'}>
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="position"
              value={block.position}
              onUpdate={() => {}}
            />
          </p>
        </div>
        <div 
          className={styles.dateRange?.className || 'text-gray-500 ml-4 shrink-0'}
          style={{ fontSize: styles.dateRange?.fontSize, fontWeight: styles.dateRange?.fontWeight }}
        >
          <EditableFieldWrapper blockId={block.id} fieldName="startDate" value={block.startDate} onUpdate={() => {}} />
          {' - '}
          <EditableFieldWrapper blockId={block.id} fieldName="endDate" value={block.endDate} onUpdate={() => {}} />
        </div>
      </div>
    )
  }

  return null
}

/**
 * Timeline-style header.
 */
function renderTimelineHeader(
  block: ResumeBlock,
  themeColor: string,
  styles: BlockRendererStyles,
  onEditingChange?: (isEditing: boolean) => void
): ReactElement | null {
  // Same as card header logic but without the right-side date range
  if (block.type === 'experience') {
    return (
      <div className={styles.header || 'flex justify-between items-start mb-2'}>
        <div className="flex-1">
          <h3 
            className={styles.title?.className || 'font-semibold'}
            style={{ fontSize: styles.title?.fontSize, fontWeight: styles.title?.fontWeight, color: styles.title?.color }}
          >
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="company"
              value={block.company}
              onUpdate={() => {}}
              onEditingChange={onEditingChange}
              className={styles.title?.className || 'font-semibold'}
            />
          </h3>
          <p 
            className={styles.subtitle?.className || 'text-gray-600 mt-0.5'}
            style={{ fontSize: styles.subtitle?.fontSize, fontWeight: styles.subtitle?.fontWeight, color: styles.subtitle?.color }}
          >
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="position"
              value={block.position}
              onUpdate={() => {}}
            />
            {block.industry ? (
              <>
                {' | '}
                <EditableFieldWrapper
                  blockId={block.id}
                  fieldName="industry"
                  value={block.industry}
                  onUpdate={() => {}}
                />
              </>
            ) : null}
          </p>
        </div>
      </div>
    )
  }

  if (block.type === 'project') {
    return (
      <div className={styles.header || 'flex justify-between items-start mb-2'}>
        <div className="flex-1">
          <h3 
            className={styles.title?.className || 'font-semibold'}
            style={{ fontSize: styles.title?.fontSize, fontWeight: styles.title?.fontWeight, color: styles.title?.color }}
          >
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="name"
              value={block.name}
              onUpdate={() => {}}
              onEditingChange={onEditingChange}
              className={styles.title?.className || 'font-semibold'}
            />
          </h3>
          {block.role ? (
            <p 
              className={styles.subtitle?.className || 'mt-0.5'}
              style={{ fontSize: styles.subtitle?.fontSize, fontWeight: styles.subtitle?.fontWeight, color: styles.subtitle?.color }}
            >
              <EditableFieldWrapper
                blockId={block.id}
                fieldName="role"
                value={block.role}
                onUpdate={() => {}}
              />
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  if (block.type === 'education') {
    return (
      <div className={styles.header || 'flex justify-between items-start mb-2'}>
        <div className="flex-1">
          <h3 
            className={styles.title?.className || 'font-semibold'}
            style={{ fontSize: styles.title?.fontSize, fontWeight: styles.title?.fontWeight, color: styles.title?.color }}
          >
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="school"
              value={block.school}
              onUpdate={() => {}}
              onEditingChange={onEditingChange}
              className={styles.title?.className || 'font-semibold'}
            />
          </h3>
          <p 
            className={styles.subtitle?.className || 'text-gray-600 mt-0.5'}
            style={{ fontSize: styles.subtitle?.fontSize, fontWeight: styles.subtitle?.fontWeight, color: styles.subtitle?.color }}
          >
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="major"
              value={block.major}
              onUpdate={() => {}}
            />
            {' | '}
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="degree"
              value={block.degree}
              onUpdate={() => {}}
            />
          </p>
        </div>
      </div>
    )
  }

  if (block.type === 'campus') {
    return (
      <div className={styles.header || 'flex justify-between items-start mb-2'}>
        <div className="flex-1">
          <h3 className={styles.title?.className || 'font-semibold'}>
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="organization"
              value={block.organization}
              onUpdate={() => {}}
              onEditingChange={onEditingChange}
              className={styles.title?.className || 'font-semibold'}
            />
          </h3>
          <p className={styles.subtitle?.className || 'text-gray-600 mt-0.5'}>
            <EditableFieldWrapper
              blockId={block.id}
              fieldName="position"
              value={block.position}
              onUpdate={() => {}}
            />
          </p>
        </div>
      </div>
    )
  }

  return null
}

/**
 * Minimal-style header.
 */
function renderMinimalHeader(
  block: ResumeBlock,
  themeColor: string,
  styles: BlockRendererStyles,
  onEditingChange?: (isEditing: boolean) => void
): ReactElement | null {
  // Minimal layout header rendering
  return renderCardHeader(block, themeColor, styles, onEditingChange)
}

/**
 * Render block content.
 */
function renderBlockContent(
  block: ResumeBlock,
  styles: BlockRendererStyles,
  onEditingChange?: (isEditing: boolean) => void
): ReactElement {
  const contentClassName = styles.content || 'mt-2'
  const contentFontSize = contentClassName.match(/text-\[([^\]]+)\]/)?.[1] || (styles.content?.includes('text-') ? undefined : styles.content)

  if (block.type === 'text') {
    return (
      <div style={{ fontSize: contentFontSize }}>
        <EditableBlockWrapper
          blockId={block.id}
          contentField="html"
          contentSize="sm"
          className={contentClassName}
          onEditingChange={onEditingChange}
        />
      </div>
    )
  }

  if (block.type === 'experience' || block.type === 'project' || block.type === 'campus') {
    return (
      <div style={{ fontSize: contentFontSize }}>
        <EditableBlockWrapper
          blockId={block.id}
          contentField="contentHtml"
          contentSize="xs"
          className={contentClassName}
          onEditingChange={onEditingChange}
        />
      </div>
    )
  }

  if (block.type === 'education') {
    return block.courseHtml ? (
      <div style={{ fontSize: contentFontSize }}>
        <EditableBlockWrapper
          blockId={block.id}
          contentField="courseHtml"
          contentSize="xs"
          className={contentClassName}
          onEditingChange={onEditingChange}
        />
      </div>
    ) : <></>
  }

  return <></>
}
