import { useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import EditableBlockWrapper from '@/editor/editable-block-wrapper'
import EditableFieldWrapper from '@/editor/editable-field-wrapper'
import EditableDateField from '@/editor/editable-date-field'
import { hasMeaningfulText } from '@/lib/resume-placeholders'
import type {
  BlockRendererStyles,
  BlockRenderProps,
  BlockSlots,
} from './types'

export interface BlockRendererProps {
  readonly block: ResumeBlock
  readonly themeColor: string
  readonly onEditingChange?: (isEditing: boolean) => void
  readonly styles?: BlockRendererStyles
  readonly renderCustom?: (props: BlockRenderProps) => ReactElement
  readonly slots?: BlockSlots
}

export default function BlockRenderer(props: BlockRendererProps): ReactElement {
  const { block, themeColor, onEditingChange, styles = {}, renderCustom, slots } = props

  if (renderCustom) {
    return renderCustom({
      block,
      themeColor,
      isEditing: false,
      onEditingChange: onEditingChange || (() => {}),
    })
  }

  const containerClassName = styles.container || ''
  const spacingClassName = styles.spacing || ''

  return (
    <div className={`${containerClassName} ${spacingClassName}`.trim()}>
      {slots?.header ? slots.header(block, themeColor) : renderBlockHeader(block, styles, onEditingChange)}
      {slots?.content ? slots.content(block) : renderBlockContent(block, styles, onEditingChange)}
      {slots?.footer && slots.footer(block)}
    </div>
  )
}

function renderBlockHeader(
  block: ResumeBlock,
  styles: BlockRendererStyles,
  onEditingChange?: (isEditing: boolean) => void,
): ReactElement | null {
  if (block.type === 'experience') {
    return (
      <StructuredBlockHeader
        block={block}
        title={(
          <EditableFieldWrapper
            blockId={block.id}
            fieldName="company"
            value={block.company}
            onUpdate={() => {}}
            onEditingChange={onEditingChange}
            className={styles.title?.className || 'font-semibold'}
          />
        )}
        meta={(
          <>
            <EditableFieldWrapper blockId={block.id} fieldName="position" value={block.position} onUpdate={() => {}} />
            {block.industry ? (
              <>
                <HeaderSeparator />
                <EditableFieldWrapper blockId={block.id} fieldName="industry" value={block.industry} onUpdate={() => {}} />
              </>
            ) : null}
          </>
        )}
        styles={styles}
      />
    )
  }

  if (block.type === 'project') {
    return (
      <StructuredBlockHeader
        block={block}
        title={(
          <EditableFieldWrapper
            blockId={block.id}
            fieldName="name"
            value={block.name}
            onUpdate={() => {}}
            onEditingChange={onEditingChange}
            className={styles.title?.className || 'font-semibold'}
          />
        )}
        meta={block.role ? (
          <EditableFieldWrapper blockId={block.id} fieldName="role" value={block.role} onUpdate={() => {}} />
        ) : undefined}
        styles={styles}
      />
    )
  }

  if (block.type === 'education') {
    return (
      <StructuredBlockHeader
        block={block}
        title={(
          <EditableFieldWrapper
            blockId={block.id}
            fieldName="school"
            value={block.school}
            onUpdate={() => {}}
            onEditingChange={onEditingChange}
            className={styles.title?.className || 'font-semibold'}
            emptyMode="hover"
          />
        )}
        meta={buildEducationMeta(block)}
        metaOptional={!hasMeaningfulText(block.major) && !hasMeaningfulText(block.degree)}
        styles={styles}
      />
    )
  }

  if (block.type === 'campus') {
    return (
      <StructuredBlockHeader
        block={block}
        title={(
          <EditableFieldWrapper
            blockId={block.id}
            fieldName="organization"
            value={block.organization}
            onUpdate={() => {}}
            onEditingChange={onEditingChange}
            className={styles.title?.className || 'font-semibold'}
          />
        )}
        meta={<EditableFieldWrapper blockId={block.id} fieldName="position" value={block.position} onUpdate={() => {}} />}
        styles={styles}
      />
    )
  }

  return null
}

function StructuredBlockHeader(props: {
  readonly block: Extract<ResumeBlock, { startDate: string; endDate: string }>
  readonly title: ReactElement
  readonly meta?: ReactNode
  readonly metaOptional?: boolean
  readonly styles: BlockRendererStyles
}): ReactElement {
  const { block, title, meta, metaOptional = false, styles } = props
  const layout = styles.layout || 'default'
  const showDate = layout !== 'timeline'
  const showMeta = layout !== 'timeline' && hasMeta(meta)
  const optionalMetaClassName = metaOptional
    ? 'hidden items-baseline gap-x-1 group-hover/block:inline-flex group-hover/section:inline-flex group-hover/section-edit:inline-flex print:hidden'
    : ''

  return (
    <div className={styles.header || 'flex justify-between items-start gap-3 mb-2'}>
      <div className="flex-1 min-w-0">
        <h3 className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span
            className={styles.title?.className || 'font-semibold'}
            style={{
              fontSize: styles.title?.fontSize,
              fontWeight: styles.title?.fontWeight,
              color: styles.title?.color,
            }}
          >
            {title}
          </span>
          {showMeta ? (
            <>
              <HeaderSeparator className={metaOptional ? 'hidden group-hover/block:inline group-hover/section:inline group-hover/section-edit:inline print:hidden' : undefined} />
              <span
                className={`${styles.subtitle?.className || 'text-gray-600'} ${optionalMetaClassName}`.trim()}
                style={{
                  fontSize: styles.subtitle?.fontSize,
                  fontWeight: styles.subtitle?.fontWeight,
                  color: styles.subtitle?.color,
                }}
              >
                {meta}
              </span>
            </>
          ) : null}
        </h3>
      </div>
      {showDate ? <DateRange block={block} styles={styles} /> : null}
    </div>
  )
}

function HeaderSeparator(props: { readonly className?: string } = {}): ReactElement {
  return <span className={`mx-1 text-current opacity-80 ${props.className || ''}`.trim()}>|</span>
}

function hasMeta(meta: ReactNode | undefined): boolean {
  if (meta === undefined || meta === null || meta === false) return false
  if (typeof meta === 'string') return meta.trim().length > 0
  if (Array.isArray(meta)) return meta.some(hasMeta)
  return true
}

function buildEducationMeta(block: Extract<ResumeBlock, { type: 'education' }>): ReactNode | undefined {
  const hasMajor = hasMeaningfulText(block.major)
  const hasDegree = hasMeaningfulText(block.degree)
  const hasAny = hasMajor || hasDegree

  return (
    <>
      <EditableFieldWrapper blockId={block.id} fieldName="major" value={block.major} onUpdate={() => {}} emptyMode={hasAny ? 'hidden' : 'placeholder'} />
      {hasAny && hasMajor && hasDegree ? <HeaderSeparator /> : null}
      {!hasAny ? <HeaderSeparator /> : null}
      <EditableFieldWrapper blockId={block.id} fieldName="degree" value={block.degree} onUpdate={() => {}} emptyMode={hasAny ? 'hidden' : 'placeholder'} />
    </>
  )
}

function DateRange(props: {
  readonly block: Extract<ResumeBlock, { startDate: string; endDate: string }>
  readonly styles: BlockRendererStyles
}): ReactElement {
  const { block, styles } = props
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const hasStartDate = hasMeaningfulText(block.startDate)
  const hasEndDate = hasMeaningfulText(block.endDate)
  const hasAnyDate = hasStartDate || hasEndDate
  return (
    <div
      className={`${styles.dateRange?.className || 'text-gray-500 ml-4 shrink-0'} ${!hasAnyDate && !datePopoverOpen ? 'hidden group-hover/block:block group-hover/section:block group-hover/section-edit:block print:hidden' : ''}`.trim()}
      style={{ fontSize: styles.dateRange?.fontSize, fontWeight: styles.dateRange?.fontWeight }}
    >
      <EditableDateField
        blockId={block.id}
        fieldName="startDate"
        value={block.startDate}
        emptyMode={hasAnyDate ? 'hidden' : 'placeholder'}
        onOpenChange={setDatePopoverOpen}
      />
      {hasAnyDate ? (hasStartDate && hasEndDate ? ' - ' : null) : ' - '}
      <EditableDateField
        blockId={block.id}
        fieldName="endDate"
        value={block.endDate}
        emptyMode={hasAnyDate ? 'hidden' : 'placeholder'}
        onOpenChange={setDatePopoverOpen}
      />
    </div>
  )
}

function renderBlockContent(
  block: ResumeBlock,
  styles: BlockRendererStyles,
  onEditingChange?: (isEditing: boolean) => void,
): ReactElement {
  const contentClassName = styles.content || 'mt-2'
  const contentFontSize = contentClassName.match(/text-\[([^\]]+)\]/)?.[1]
    || (styles.content?.includes('text-') ? undefined : styles.content)
  const contentEditingStyle = styles.contentEditingColor ? { color: styles.contentEditingColor } : undefined

  if (block.type === 'text') {
    return (
      <div style={{ fontSize: contentFontSize, color: styles.contentColor }}>
        <EditableBlockWrapper
          blockId={block.id}
          contentField="html"
          contentSize="sm"
          className={contentClassName}
          editingStyle={contentEditingStyle}
          onEditingChange={onEditingChange}
        />
      </div>
    )
  }

  if (block.type === 'experience' || block.type === 'project' || block.type === 'campus') {
    return (
      <div style={{ fontSize: contentFontSize, color: styles.contentColor }}>
        <EditableBlockWrapper
          blockId={block.id}
          contentField="contentHtml"
          contentSize="xs"
          className={contentClassName}
          editingStyle={contentEditingStyle}
          onEditingChange={onEditingChange}
        />
      </div>
    )
  }

  if (block.type === 'education') {
    return (
      <div style={{ fontSize: contentFontSize, color: styles.contentColor }}>
        <EditableBlockWrapper
          blockId={block.id}
          contentField="courseHtml"
          contentSize="xs"
          className={contentClassName}
          editingStyle={contentEditingStyle}
          emptyMode="hover"
          placeholder="点击填写课程、GPA 或成绩亮点"
          onEditingChange={onEditingChange}
        />
      </div>
    )
  }

  return <></>
}
