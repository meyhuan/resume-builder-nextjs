import type { ReactElement, ReactNode } from 'react'
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
          />
        )}
        meta={buildEducationMeta(block)}
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
  readonly styles: BlockRendererStyles
}): ReactElement {
  const { block, title, meta, styles } = props
  const layout = styles.layout || 'default'
  const showDate = layout !== 'timeline'
  const showMeta = layout !== 'timeline' && hasMeta(meta)

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
              <HeaderSeparator />
              <span
                className={styles.subtitle?.className || 'text-gray-600'}
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

function HeaderSeparator(): ReactElement {
  return <span className="mx-1 text-current opacity-80">|</span>
}

function hasMeta(meta: ReactNode | undefined): boolean {
  if (meta === undefined || meta === null || meta === false) return false
  if (typeof meta === 'string') return meta.trim().length > 0
  if (Array.isArray(meta)) return meta.some(hasMeta)
  return true
}

function buildEducationMeta(block: Extract<ResumeBlock, { type: 'education' }>): ReactNode | undefined {
  const hasMajor = Boolean(block.major)
  const hasDegree = Boolean(block.degree)
  if (!hasMajor && !hasDegree) return undefined

  return (
    <>
      {hasMajor ? (
        <EditableFieldWrapper blockId={block.id} fieldName="major" value={block.major} onUpdate={() => {}} />
      ) : null}
      {hasMajor && hasDegree ? <HeaderSeparator /> : null}
      {hasDegree ? (
        <EditableFieldWrapper blockId={block.id} fieldName="degree" value={block.degree} onUpdate={() => {}} />
      ) : null}
    </>
  )
}

function DateRange(props: {
  readonly block: Extract<ResumeBlock, { startDate: string; endDate: string }>
  readonly styles: BlockRendererStyles
}): ReactElement {
  const { block, styles } = props
  return (
    <div
      className={styles.dateRange?.className || 'text-gray-500 ml-4 shrink-0'}
      style={{ fontSize: styles.dateRange?.fontSize, fontWeight: styles.dateRange?.fontWeight }}
    >
      <EditableDateField blockId={block.id} fieldName="startDate" value={block.startDate} />
      {' - '}
      <EditableDateField blockId={block.id} fieldName="endDate" value={block.endDate} />
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
    return block.courseHtml ? (
      <div style={{ fontSize: contentFontSize, color: styles.contentColor }}>
        <EditableBlockWrapper
          blockId={block.id}
          contentField="courseHtml"
          contentSize="xs"
          className={contentClassName}
          editingStyle={contentEditingStyle}
          onEditingChange={onEditingChange}
        />
      </div>
    ) : <></>
  }

  return <></>
}
