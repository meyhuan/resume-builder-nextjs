/**
 * V2 BlockRenderer - Style-Driven Architecture
 * 
 * 完全解耦的 Block 渲染组件，支持：
 * 1. 样式配置驱动
 * 2. 自定义渲染函数
 * 3. 插槽模式
 * 
 * 新增模板无需修改此文件
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
  
  // 方案1: 样式配置（推荐用于大多数场景）
  readonly styles?: BlockRendererStyles
  
  // 方案2: 完全自定义渲染（用于完全不同的布局）
  readonly renderCustom?: (props: BlockRenderProps) => ReactElement
  
  // 方案3: 插槽模式（用于部分自定义）
  readonly slots?: BlockSlots
}

/**
 * V2 Block 渲染器 - 样式配置驱动
 */
export default function BlockRenderer(props: BlockRendererProps): ReactElement {
  const { block, themeColor, onEditingChange, styles = {}, renderCustom, slots } = props

  // 方案2: 完全自定义渲染
  if (renderCustom) {
    return renderCustom({
      block,
      themeColor,
      isEditing: false,
      onEditingChange: onEditingChange || (() => {}),
    })
  }

  // 根据样式配置选择布局
  // const layout = styles.layout || 'default' // Unused
  const containerClassName = styles.container || ''
  const spacingClassName = styles.spacing || ''

  // 默认渲染：根据 block 类型和布局样式
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
 * 渲染 Block 头部
 */
function renderBlockHeader(
  block: ResumeBlock,
  themeColor: string,
  styles: BlockRendererStyles,
  onEditingChange?: (isEditing: boolean) => void
): ReactElement | null {
  const layout = styles.layout || 'default'
  
  // 根据布局类型渲染不同的头部
  if (layout === 'card' || layout === 'default') {
    return renderCardHeader(block, themeColor, styles, onEditingChange)
  }
  
  if (layout === 'timeline') {
    return renderTimelineHeader(block, themeColor, styles, onEditingChange)
  }
  
  if (layout === 'minimal') {
    return renderMinimalHeader(block, themeColor, styles, onEditingChange)
  }
  
  // 自定义布局：使用样式配置
  return renderCardHeader(block, themeColor, styles, onEditingChange)
}

/**
 * 卡片样式头部
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
 * 时间线样式头部
 */
function renderTimelineHeader(
  block: ResumeBlock,
  themeColor: string,
  styles: BlockRendererStyles,
  onEditingChange?: (isEditing: boolean) => void
): ReactElement | null {
  // 时间线布局的头部渲染
  return renderCardHeader(block, themeColor, styles, onEditingChange)
}

/**
 * 极简样式头部
 */
function renderMinimalHeader(
  block: ResumeBlock,
  themeColor: string,
  styles: BlockRendererStyles,
  onEditingChange?: (isEditing: boolean) => void
): ReactElement | null {
  // 极简布局的头部渲染
  return renderCardHeader(block, themeColor, styles, onEditingChange)
}

/**
 * 渲染 Block 内容
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
      <div className={contentClassName} style={{ fontSize: contentFontSize }}>
        <EditableBlockWrapper
          blockId={block.id}
          contentField="html"
          contentSize="sm"
          onEditingChange={onEditingChange}
        />
      </div>
    )
  }

  if (block.type === 'experience' || block.type === 'project' || block.type === 'campus') {
    return (
      <div className={contentClassName} style={{ fontSize: contentFontSize }}>
        <EditableBlockWrapper
          blockId={block.id}
          contentField="contentHtml"
          contentSize="xs"
          onEditingChange={onEditingChange}
        />
      </div>
    )
  }

  if (block.type === 'education') {
    return block.courseHtml ? (
      <div className={contentClassName} style={{ fontSize: contentFontSize }}>
        <EditableBlockWrapper
          blockId={block.id}
          contentField="courseHtml"
          contentSize="xs"
          onEditingChange={onEditingChange}
        />
      </div>
    ) : <></>
  }

  return <></>
}
