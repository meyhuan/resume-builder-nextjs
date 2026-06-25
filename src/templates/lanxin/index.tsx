"use client"

import { useState } from 'react'
import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import { getHeaderJobIntentionText } from '@/entities/resume/header-job-intention'
import type { Section } from '@/entities/resume/section'
import BlockWrapper from '@/components/blocks/block-wrapper'
import EditableBlockWrapper from '@/editor/editable-block-wrapper'
import EditableDateField from '@/editor/editable-date-field'
import EditableFieldWrapper from '@/editor/editable-field-wrapper'
import { useAiSection } from '@/components/ai-section/ai-section-provider'
import { blockTypeToModuleType, extractBlockContentHtml } from '@/components/ai-section/block-module-utils'
import { useAppStore } from '@/state/store'
import {
  AvatarSlot,
  BlockList,
  DeleteSectionDialog,
  EditableText,
  FieldChip,
  lightenHex,
  mmToPx,
  ResumeFrame,
  SortableSection,
  useEditableHeader,
  useEditableJobIntention,
  useEditableSection,
} from '@/templates/_core'
import type { DragHandleProps, TemplateProps } from '@/templates/_core'

const BLUE = '#3a8ec7'
const INK = '#1f242b'
const MUTED = '#4c5660'
const SANS = '"Inter", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'

type CssVars = CSSProperties & Record<`--${string}`, string | number>

function getBlockTypeLabel(type: string): string {
  if (type === 'experience') return '工作经历'
  if (type === 'project') return '项目经历'
  if (type === 'education') return '教育经历'
  if (type === 'campus') return '校园经历'
  return '内容'
}

export default function LanxinTemplate(props: TemplateProps): ReactElement {
  const { resume, theme } = props
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null)
  const jobIntention = useEditableJobIntention(resume.jobIntention ?? null)
  const isJobIntentionVisible = resume.jobIntentionVisible ?? jobIntention.fields.length > 0
  const headerTitle = getHeaderJobIntentionText(resume)
  const contentLineHeight = Math.max(1.2, theme.lineHeight)
  const titleScale = Math.min(1.18, Math.max(0.88, theme.titleScale ?? 1))
  const primaryColor = theme.primaryColor || BLUE
  const headerBg = lightenHex(primaryColor, 0.9)
  const ruleColor = lightenHex(primaryColor, 0.55)
  const pagePaddingVertical = Math.max(24, mmToPx(theme.pagePaddingVertical))
  const pagePaddingHorizontal = Math.max(32, mmToPx(theme.pagePaddingHorizontal))
  const heroHeight = pagePaddingVertical + 172
  const contentPaddingTop = 37 * theme.spacingScale
  const contentPaddingBottom = pagePaddingVertical
  const nodeTop = 1
  const nodeHeight = 19
  const timelineLeft = pagePaddingHorizontal - 27
  const rootStyle: CssVars = {
    minHeight: '297mm',
    backgroundColor: '#ffffff',
    color: INK,
    fontFamily: theme.fontFamily || SANS,
    '--lanxin-print-page-padding-v': `${theme.pagePaddingVertical}mm`,
  }

  return (
    <ResumeFrame
      resume={resume}
      theme={theme}
      className="lanxin-resume-root"
      style={rootStyle}
    >
      <style>{`
        .lanxin-rich-text p { margin: 0; }
        .lanxin-rich-text ul, .lanxin-rich-text ol { margin: 0; padding-left: 1.2em; }
        .lanxin-rich-text li { margin: 0; }
        @media print {
          .lanxin-resume-root {
            min-height: calc(297mm - var(--lanxin-print-page-padding-v) - 2px) !important;
            overflow: visible !important;
          }
          .lanxin-page-content {
            padding-bottom: 0 !important;
          }
        }
      `}</style>
      <LanxinHero
        header={header}
        title={headerTitle}
        primaryColor={primaryColor}
        headerBg={headerBg}
        paddingTop={pagePaddingVertical}
        paddingHorizontal={pagePaddingHorizontal}
        height={heroHeight}
      />

      <div
        data-template-padding-probe="true"
        className="lanxin-page-content"
        style={{
          position: 'relative',
          padding: `${contentPaddingTop}px ${pagePaddingHorizontal}px ${contentPaddingBottom}px ${pagePaddingHorizontal}px`,
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          marginTop: -1,
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: contentPaddingTop + nodeTop,
            bottom: contentPaddingBottom + nodeHeight,
            left: timelineLeft,
            width: 1,
            backgroundColor: ruleColor,
          }}
        />

        <main className="flex flex-col" style={{ gap: `${36 * theme.spacingScale}px` }}>
          {isJobIntentionVisible && jobIntention.fields.length > 0 ? (
            <LanxinJobIntentionSection jobIntention={jobIntention} primaryColor={primaryColor} />
          ) : null}
          {resume.sections.map((section) => (
            <SortableSection key={section.id} sectionId={section.id}>
              {(dragProps) => (
                <LanxinSection
                  section={section}
                  dragProps={dragProps}
                  spacingScale={theme.spacingScale}
                  contentLineHeight={contentLineHeight}
                  primaryColor={primaryColor}
                  titleScale={titleScale}
                />
              )}
            </SortableSection>
          ))}
        </main>
      </div>

      {header.modals}
      {jobIntention.modals}
    </ResumeFrame>
  )
}

function LanxinHero(props: {
  readonly header: ReturnType<typeof useEditableHeader>
  readonly title: string
  readonly primaryColor: string
  readonly headerBg: string
  readonly paddingTop: number
  readonly paddingHorizontal: number
  readonly height: number
}): ReactElement {
  const { header, title, primaryColor, headerBg, paddingTop, paddingHorizontal, height } = props
  const visibleFields = header.fields

  return (
    <header
      className="relative group"
      onClick={header.openEditModal}
      style={{
        minHeight: height,
        padding: `${paddingTop}px ${paddingHorizontal}px 0`,
        backgroundColor: headerBg,
        cursor: 'pointer',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: -24,
          height: 48,
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
        }}
      />

      <div className="relative z-[1] flex items-start justify-between gap-8">
        <div className="min-w-0 flex-1">
          <EditableText
            as="h1"
            value={header.name}
            onCommit={header.onCommitName}
            style={{
              margin: 0,
              fontSize: '1.77em',
              lineHeight: 1,
              fontWeight: 800,
              color: INK,
            }}
          />
          {title ? (
            <div
              style={{
                marginTop: 22,
                fontSize: '1em',
                lineHeight: 1.2,
                fontWeight: 500,
                color: INK,
              }}
            >
              {title}
            </div>
          ) : null}

          <div
            className="grid"
            data-lanxin-header-fields="true"
            style={{
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '9px 18px',
              marginTop: 28,
              maxWidth: 720,
              fontSize: '0.75em',
              lineHeight: 1.35,
              color: '#4d545d',
            }}
          >
            {visibleFields.map((field) => (
              <FieldChip
                key={field.key}
                field={field}
                header={header}
                deleteColor={primaryColor}
                className="min-w-0 max-w-full items-baseline"
                style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              >
                <span style={{ flex: '0 0 auto' }}>{field.label}： </span>
                <span style={{ minWidth: 0, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {field.value}
                </span>
              </FieldChip>
            ))}
          </div>
        </div>

        <AvatarSlot
          header={header}
          render={({ image, uploadOverlay }) => (
            <div
              className="relative overflow-hidden"
              style={{
                width: 100,
                height: 134,
                borderRadius: 10,
                backgroundColor: lightenHex(primaryColor, 0.82),
              }}
            >
              {image}
              {uploadOverlay}
            </div>
          )}
        />
      </div>
    </header>
  )
}

function LanxinJobIntentionSection(props: {
  readonly jobIntention: ReturnType<typeof useEditableJobIntention>
  readonly primaryColor: string
}): ReactElement {
  const { jobIntention, primaryColor } = props

  return (
    <section
      className="relative group/job-intention cursor-pointer"
      onClick={jobIntention.openEditModal}
      style={{ minHeight: 30 }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: -27,
          top: 1,
          width: 5,
          height: 19,
          borderRadius: 999,
          backgroundColor: primaryColor,
        }}
      />

      <div className="relative">
        <h2
          style={{
            margin: '0 0 15px',
            fontSize: '1.18em',
            lineHeight: 1.2,
            fontWeight: 800,
            color: INK,
          }}
        >
          求职意向
        </h2>

        <button
          type="button"
          className="absolute right-0 top-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 opacity-0 shadow-sm transition-opacity hover:bg-slate-50 group-hover/job-intention:opacity-100 print:hidden"
          onClick={(event) => { event.stopPropagation(); jobIntention.openEditModal() }}
        >
          编辑
        </button>
      </div>

      <div className="flex flex-wrap" style={{ gap: '8px 18px', fontSize: '0.75em', lineHeight: 1.65, color: MUTED }}>
        {jobIntention.fields.map((field) => {
          const isHovered = jobIntention.hoveredField === field.key
          return (
            <span
              key={field.key}
              className="relative inline-flex items-center"
              onMouseEnter={() => jobIntention.setHoveredField(field.key)}
              onMouseLeave={() => jobIntention.setHoveredField(null)}
            >
              <span style={{ color: '#6b7280' }}>{field.label}： </span>
              <span style={{ color: '#1e242c', fontWeight: 600 }}>{field.value}</span>
              <button
                type="button"
                className="absolute -right-3 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[12px] leading-none text-red-500 shadow-sm print:hidden"
                style={{ opacity: isHovered ? 1 : 0 }}
                onClick={(event) => {
                  event.stopPropagation()
                  jobIntention.deleteField(field.key)
                }}
              >
                ×
              </button>
            </span>
          )
        })}
      </div>
    </section>
  )
}

interface LanxinSectionProps {
  readonly section: Section
  readonly dragProps: DragHandleProps
  readonly spacingScale: number
  readonly contentLineHeight: number
  readonly primaryColor: string
  readonly titleScale: number
}

function LanxinSection({ section, dragProps, spacingScale, contentLineHeight, primaryColor, titleScale }: LanxinSectionProps): ReactElement {
  const editable = useEditableSection(section)

  return (
    <section
      className="relative group/section"
      onMouseEnter={() => editable.setHovered(true)}
      onMouseLeave={() => editable.setHovered(false)}
      style={{ minHeight: 30 }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: -27,
          top: 1,
          width: 5,
          height: 19,
          borderRadius: 999,
          backgroundColor: primaryColor,
        }}
      />

      <div className="relative">
        <EditableText
          as="h2"
          value={editable.title}
          onCommit={editable.canEditTitle ? editable.onCommitTitle : undefined}
          style={{
            margin: '0 0 15px',
            fontSize: `${1.18 * titleScale}em`,
            lineHeight: 1.2,
            fontWeight: 800,
            color: INK,
          }}
        />

        <SectionActions
          visible={editable.isHovered}
          isTextOnly={editable.isTextOnly}
          onAdd={editable.onAddBlock}
          onDelete={editable.onRequestDelete}
          dragProps={dragProps}
        />
      </div>

      <BlockList
        section={editable}
        themeColor={primaryColor}
        spacingScale={spacingScale}
        className={section.columns === 2 ? 'grid grid-cols-2 gap-4' : 'flex flex-col'}
        renderBlock={({ block, index, total }) => (
          <LanxinBlock
            block={block}
            sectionId={section.id}
            index={index}
            total={total}
            spacingScale={spacingScale}
            contentLineHeight={contentLineHeight}
            titleScale={titleScale}
          />
        )}
      />

      <DeleteSectionDialog
        open={editable.isDeleteDialogOpen}
        sectionTitle={editable.title}
        onOpenChange={editable.setDeleteDialogOpen}
        onConfirm={editable.confirmDelete}
      />
    </section>
  )
}

function SectionActions(props: {
  readonly visible: boolean
  readonly isTextOnly: boolean
  readonly onAdd: () => void
  readonly onDelete: () => void
  readonly dragProps: DragHandleProps
}): ReactElement {
  const { visible, isTextOnly, onAdd, onDelete, dragProps } = props
  const attachDragHandle = (element: HTMLButtonElement | null): void => {
    dragProps.ref(element)
  }
  const sortAttributes = dragProps.attributes as Record<string, unknown>
  const sortListeners = dragProps.listeners as Record<string, unknown>
  return (
    <div
      className="absolute right-0 top-0 flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1 py-0.5 shadow-sm transition-opacity print:hidden"
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
    >
      <button
        type="button"
        ref={attachDragHandle}
        {...sortAttributes}
        {...sortListeners}
        className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
        title="拖动"
      >
        <GripVertical size={14} />
      </button>
      {!isTextOnly ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAdd() }}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
          title="添加"
        >
          <Plus size={14} />
        </button>
      ) : null}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600"
        title="删除"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

interface LanxinBlockProps {
  readonly block: ResumeBlock
  readonly sectionId: string
  readonly index: number
  readonly total: number
  readonly spacingScale: number
  readonly contentLineHeight: number
  readonly titleScale: number
}

function LanxinBlock(props: LanxinBlockProps): ReactElement {
  const { block, sectionId, index, total, spacingScale, contentLineHeight, titleScale } = props
  const addBlock = useAppStore((s) => s.addBlockByType)
  const deleteBlock = useAppStore((s) => s.deleteBlock)
  const moveBlockUp = useAppStore((s) => s.moveBlockUp)
  const moveBlockDown = useAppStore((s) => s.moveBlockDown)
  const [isEditing, setIsEditing] = useState(false)
  const { openPolish, openGenerate } = useAiSection()
  const moduleType = blockTypeToModuleType(block.type)

  return (
    <div style={{ marginBottom: index < total - 1 ? `${18 * spacingScale}px` : 0 }}>
      <BlockWrapper
        blockType={getBlockTypeLabel(block.type)}
        onAdd={block.type !== 'text' ? (): void => addBlock(sectionId) : undefined}
        onPolish={moduleType ? (): void => openPolish(block.id, extractBlockContentHtml(block), moduleType) : undefined}
        onGenerate={moduleType ? (): void => openGenerate(block.id, moduleType, block) : undefined}
        onDelete={(): void => deleteBlock(sectionId, block.id)}
        onMoveUp={index > 0 ? (): void => moveBlockUp(sectionId, block.id) : undefined}
        onMoveDown={index < total - 1 ? (): void => moveBlockDown(sectionId, block.id) : undefined}
        showDragHandle={false}
        disableHover={isEditing}
      >
        <LanxinBlockBody block={block} contentLineHeight={contentLineHeight} titleScale={titleScale} onEditingChange={setIsEditing} />
      </BlockWrapper>
    </div>
  )
}

function LanxinBlockBody(props: {
  readonly block: ResumeBlock
  readonly contentLineHeight: number
  readonly titleScale: number
  readonly onEditingChange: (value: boolean) => void
}): ReactElement {
  const { block, contentLineHeight, titleScale, onEditingChange } = props

  if (block.type === 'text') {
    return (
      <TextContent lineHeight={contentLineHeight}>
        <EditableBlockWrapper
          blockId={block.id}
          contentField="html"
          contentSize="sm"
          className="lanxin-rich-text"
          onEditingChange={onEditingChange}
        />
      </TextContent>
    )
  }

  return (
    <div>
      <BlockMetaRow block={block} titleScale={titleScale} onEditingChange={onEditingChange} />
      <StructuredContent block={block} contentLineHeight={contentLineHeight} onEditingChange={onEditingChange} />
    </div>
  )
}

function BlockMetaRow(props: {
  readonly block: ResumeBlock
  readonly titleScale: number
  readonly onEditingChange: (value: boolean) => void
}): ReactElement {
  const { block, titleScale, onEditingChange } = props

  if (block.type === 'education') {
    return (
        <MetaGrid columns="83px 142px 97px 1fr" titleScale={titleScale}>
        <MetaCell blockId={block.id} fieldName="school" value={block.school ?? ''} onEditingChange={onEditingChange} />
        <MetaCell blockId={block.id} fieldName="major" value={block.major ?? ''} />
        <MetaCell blockId={block.id} fieldName="degree" value={block.degree ?? ''} />
        <DateCell block={block} />
      </MetaGrid>
    )
  }

  if (block.type === 'experience') {
    return (
        <MetaGrid columns="139px 142px 1fr" titleScale={titleScale}>
        <MetaCell blockId={block.id} fieldName="company" value={block.company ?? ''} onEditingChange={onEditingChange} />
        <MetaCell blockId={block.id} fieldName="position" value={block.position ?? ''} />
        <DateCell block={block} />
      </MetaGrid>
    )
  }

  if (block.type === 'project') {
    return (
        <MetaGrid columns="139px 142px 1fr" titleScale={titleScale}>
        <MetaCell blockId={block.id} fieldName="name" value={block.name ?? ''} onEditingChange={onEditingChange} />
        <MetaCell blockId={block.id} fieldName="role" value={block.role ?? ''} />
        <DateCell block={block} />
      </MetaGrid>
    )
  }

  if (block.type === 'campus') {
    return (
        <MetaGrid columns="139px 142px 1fr" titleScale={titleScale}>
        <MetaCell blockId={block.id} fieldName="organization" value={block.organization ?? ''} onEditingChange={onEditingChange} />
        <MetaCell blockId={block.id} fieldName="position" value={block.position ?? ''} />
        <DateCell block={block} usePlainField />
      </MetaGrid>
    )
  }

  return <></>
}

function MetaGrid({ columns, titleScale, children }: { readonly columns: string; readonly titleScale: number; readonly children: ReactNode }): ReactElement {
  return (
    <div
      className="items-baseline"
      style={{
        display: 'grid',
        gridTemplateColumns: columns,
        marginBottom: 9,
        fontSize: `${1.03 * titleScale}em`,
        lineHeight: 1.2,
        fontWeight: 700,
        color: '#1e242c',
      }}
    >
      {children}
    </div>
  )
}

function MetaCell(props: {
  readonly blockId: string
  readonly fieldName: string
  readonly value: string
  readonly onEditingChange?: (value: boolean) => void
}): ReactElement {
  const { blockId, fieldName, value, onEditingChange } = props
  return (
    <div className="min-w-0 pr-4">
      <EditableFieldWrapper
        blockId={blockId}
        fieldName={fieldName}
        value={value}
        onUpdate={() => {}}
        onEditingChange={onEditingChange}
      />
    </div>
  )
}

function DateCell(props: {
  readonly block: Extract<ResumeBlock, { startDate?: string; endDate?: string }>
  readonly usePlainField?: boolean
}): ReactElement {
  const { block, usePlainField } = props
  return (
    <div
      className="justify-self-end whitespace-nowrap"
      style={{ fontSize: '0.97em', fontWeight: 700, color: '#1e2329' }}
    >
      {usePlainField ? (
        <>
          <EditableFieldWrapper blockId={block.id} fieldName="startDate" value={block.startDate ?? ''} onUpdate={() => {}} />
          <span>-</span>
          <EditableFieldWrapper blockId={block.id} fieldName="endDate" value={block.endDate ?? ''} onUpdate={() => {}} />
        </>
      ) : (
        <>
          <EditableDateField blockId={block.id} fieldName="startDate" value={block.startDate ?? ''} />
          <span>-</span>
          <EditableDateField blockId={block.id} fieldName="endDate" value={block.endDate ?? ''} />
        </>
      )}
    </div>
  )
}

function StructuredContent(props: {
  readonly block: ResumeBlock
  readonly contentLineHeight: number
  readonly onEditingChange: (value: boolean) => void
}): ReactElement {
  const { block, contentLineHeight, onEditingChange } = props

  if (block.type === 'education') {
    return block.courseHtml ? (
      <TextContent lineHeight={contentLineHeight}>
        <EditableBlockWrapper
          blockId={block.id}
          contentField="courseHtml"
          contentSize="xs"
          className="lanxin-rich-text"
          onEditingChange={onEditingChange}
        />
      </TextContent>
    ) : <></>
  }

  if (block.type === 'experience' || block.type === 'project' || block.type === 'campus') {
    return (
      <TextContent lineHeight={contentLineHeight}>
        <EditableBlockWrapper
          blockId={block.id}
          contentField="contentHtml"
          contentSize="xs"
          className="lanxin-rich-text"
          onEditingChange={onEditingChange}
        />
      </TextContent>
    )
  }

  return <></>
}

function TextContent({ children, lineHeight }: { readonly children: ReactNode; readonly lineHeight: number }): ReactElement {
  return (
    <div
      data-template-body-text="true"
      style={{
        fontSize: '0.98em',
        lineHeight,
        fontWeight: 400,
        color: MUTED,
      }}
    >
      {children}
    </div>
  )
}
