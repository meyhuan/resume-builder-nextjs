"use client"

import { useState } from 'react'
import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import type { Section } from '@/entities/resume/section'
import BlockWrapper from '@/components/blocks/block-wrapper'
import EditableBlockWrapper from '@/editor/editable-block-wrapper'
import EditableDateField from '@/editor/editable-date-field'
import EditableFieldWrapper from '@/editor/editable-field-wrapper'
import { useAiSection } from '@/components/ai-section/ai-section-provider'
import { blockTypeToModuleType, extractBlockContentHtml } from '@/components/ai-section/block-module-utils'
import { useAppStore } from '@/state/store'
import { BlockRenderer } from '@/templates/components/v2'
import type { BlockRendererStyles } from '@/templates/components/v2'
import {
  AvatarSlot,
  BlockList,
  DeleteSectionDialog,
  EditableText,
  FieldChip,
  darkenHex,
  lightenHex,
  mmToPx,
  ResumeFrame,
  SortableSection,
  useEditableHeader,
  useEditableJobIntention,
  useEditableSection,
} from '@/templates/_core'
import type { DragHandleProps, TemplateProps } from '@/templates/_core'

const DEFAULT_BLUE = '#4f719f'
const INK = '#111827'
const TEXT = '#25384f'
const MUTED = '#5d6877'
const SANS = '"Inter", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'

type CssVars = CSSProperties & Record<`--${string}`, string | number>

function isValidHexColor(color: string | undefined): boolean {
  return Boolean(color && /^#(?:[0-9a-f]{3}){1,2}$/i.test(color))
}

function getBlockTypeLabel(type: string): string {
  if (type === 'experience') return '工作经历'
  if (type === 'project') return '项目经历'
  if (type === 'education') return '教育经历'
  if (type === 'campus') return '校园经历'
  if (type === 'text') return '文本模块'
  return '内容'
}

export default function LanzheTemplate(props: TemplateProps): ReactElement {
  const { resume, theme } = props
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null)
  const jobIntention = useEditableJobIntention(resume.jobIntention ?? null)
  const isJobIntentionVisible = resume.jobIntentionVisible ?? jobIntention.fields.length > 0
  const primaryColor = isValidHexColor(theme.primaryColor) ? theme.primaryColor : DEFAULT_BLUE
  const foldColor = darkenHex(primaryColor, 0.52)
  const deepColor = darkenHex(primaryColor, 0.72)
  const paleColor = lightenHex(primaryColor, 0.88)
  const titleScale = Math.min(1.18, Math.max(0.88, theme.titleScale ?? 1))
  const contentLineHeight = Math.max(1.25, theme.lineHeight)
  const spacingScale = Math.max(0.78, theme.spacingScale)
  const pagePaddingHorizontal = Math.max(34, mmToPx(theme.pagePaddingHorizontal))
  const pagePaddingVertical = Math.max(36, mmToPx(theme.pagePaddingVertical))
  const paperLeft = pagePaddingHorizontal
  const rightPad = pagePaddingHorizontal
  const topPad = pagePaddingVertical
  const bottomPad = pagePaddingVertical
  const heroHeight = Math.max(118, Math.min(140, theme.fontSize * 8.5))
  const railLeft = Math.max(16, paperLeft - 18)

  const rootStyle: CssVars = {
    minHeight: '297mm',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#f6f7f9',
    color: TEXT,
    fontFamily: theme.fontFamily || SANS,
    '--lanzhe-blue': primaryColor,
    '--lanzhe-blue-deep': deepColor,
    '--lanzhe-blue-fold': foldColor,
    '--lanzhe-blue-pale': paleColor,
    '--lanzhe-paper-left': `${paperLeft}px`,
    '--lanzhe-print-page-padding-v': `${theme.pagePaddingVertical}mm`,
    '--lanzhe-fold-width': '22px',
    '--lanzhe-fold-height': '13px',
  }

  return (
    <ResumeFrame resume={resume} theme={theme} className="lanzhe-resume-root" style={rootStyle}>
      <style>{`
        .lanzhe-rich p { margin: 0; }
        .lanzhe-rich ul, .lanzhe-rich ol { margin: 0; padding-left: 1.25em; }
        .lanzhe-rich li { margin: 0.08em 0; }
        .lanzhe-header-band::before,
        .lanzhe-section-title::before {
          content: "";
          position: absolute;
          left: calc(var(--lanzhe-fold-width) * -1);
          top: 0;
          width: var(--lanzhe-fold-width);
          height: 100%;
          background: var(--lanzhe-blue);
        }
        .lanzhe-header-band::after,
        .lanzhe-section-title::after {
          content: "";
          position: absolute;
          left: calc(var(--lanzhe-fold-width) * -1);
          bottom: calc(var(--lanzhe-fold-height) * -1);
          width: var(--lanzhe-fold-width);
          height: var(--lanzhe-fold-height);
          background: var(--lanzhe-blue-fold);
          clip-path: polygon(100% 0, 100% 100%, 0 0);
        }
        .lanzhe-section-title::before {
          z-index: -1;
          background: var(--lanzhe-blue);
        }
        .lanzhe-section-title::after {
          z-index: 0;
        }
        .lanzhe-section-title > span {
          position: relative;
          z-index: 1;
        }
        .lanzhe-avatar img {
          object-position: top center;
        }
        .lanzhe-header-band > * {
          position: relative;
          z-index: 1;
        }
        @media print {
          .lanzhe-resume-root {
            min-height: calc(297mm - var(--lanzhe-print-page-padding-v) - 2px) !important;
            overflow: visible !important;
          }
          .lanzhe-page-content {
            padding-bottom: 0 !important;
          }
          .lanzhe-root-shadow { box-shadow: none !important; }
        }
      `}</style>

      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: railLeft,
          top: 0,
          bottom: 0,
          width: 24,
          backgroundColor: '#e8eaed',
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: paperLeft,
          top: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#ffffff',
          zIndex: 1,
        }}
      />

      <div
        data-template-padding-probe="true"
        className="lanzhe-page-content"
        style={{
          position: 'relative',
          zIndex: 2,
          padding: `${topPad}px ${rightPad}px ${bottomPad}px ${paperLeft}px`,
        }}
      >
        <LanzheHero
          header={header}
          title={header.baseInfo?.title || resume.jobIntention?.position || ''}
          heroHeight={heroHeight}
        />

        <main
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: `${18 * spacingScale}px`,
            marginTop: `${42 * spacingScale}px`,
          }}
        >
          {isJobIntentionVisible && jobIntention.fields.length > 0 ? (
            <LanzheJobIntentionSection jobIntention={jobIntention} titleScale={titleScale} />
          ) : null}

          {resume.sections.map((section) => (
            <SortableSection key={section.id} sectionId={section.id}>
              {(dragProps) => (
                <LanzheSection
                  section={section}
                  dragProps={dragProps}
                  primaryColor={primaryColor}
                  spacingScale={spacingScale}
                  contentLineHeight={contentLineHeight}
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

function LanzheHero(props: {
  readonly header: ReturnType<typeof useEditableHeader>
  readonly title: string
  readonly heroHeight: number
}): ReactElement {
  const { header, title, heroHeight } = props
  const reservedAvatarWidth = heroHeight + 40
  const avatarSize = heroHeight
  const heroRadius = heroHeight / 2

  return (
    <header
      className="lanzhe-header-band relative group"
      onClick={header.openEditModal}
      style={{
        minHeight: heroHeight,
        padding: `20px ${reservedAvatarWidth + 38}px 17px 38px`,
        color: '#ffffff',
        cursor: 'pointer',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          borderRadius: `0 ${heroRadius}px ${heroRadius}px 0`,
          backgroundColor: 'var(--lanzhe-blue)',
        }}
      />
      <AvatarSlot
        header={header}
        className="lanzhe-avatar rounded-full"
        style={{
          position: 'absolute',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: avatarSize,
          height: avatarSize,
          border: '8px solid var(--lanzhe-blue)',
          backgroundColor: '#f8fafc',
        }}
        placeholderSize={56}
      />

      <EditableText
        as="h1"
        value={header.name}
        onCommit={header.onCommitName}
        style={{
          margin: 0,
          fontSize: '2.35em',
          lineHeight: 1,
          fontWeight: 900,
          color: '#ffffff',
        }}
      />

      {title ? (
        <div
          style={{
            marginTop: 10,
            fontSize: '0.9em',
            lineHeight: 1.25,
            fontWeight: 700,
            color: '#f7fbff',
          }}
        >
          求职意向：{title}
        </div>
      ) : null}

      <div
        className="flex flex-wrap"
        style={{
          gap: '5px 14px',
          marginTop: 10,
          maxWidth: 520,
          color: '#eef5ff',
          fontSize: '0.76em',
          lineHeight: 1.45,
        }}
      >
        {header.fields.map((field) => (
          <FieldChip
            key={field.key}
            field={field}
            header={header}
            deleteColor="#ffffff"
            className="min-w-0 items-center gap-1"
            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
          >
            <span className="inline-flex h-[1em] w-[1em] items-center justify-center text-white/90 [&_svg]:h-[0.9em] [&_svg]:w-[0.9em]">
              {field.icon}
            </span>
            <span style={{ color: '#ffffff', opacity: 0.9 }}>{field.label}：</span>
            <span style={{ color: '#ffffff', fontWeight: 600 }}>{field.value}</span>
          </FieldChip>
        ))}
      </div>
    </header>
  )
}

function FoldTitle(props: { readonly children: ReactNode; readonly titleScale?: number }): ReactElement {
  const { children, titleScale = 1 } = props
  return (
    <h2
      className="lanzhe-section-title relative inline-flex items-center"
      style={{
        marginTop: 0,
        zIndex: 1,
        minWidth: 116,
        height: 32,
        marginBottom: 14,
        padding: '0 24px 0 22px',
        borderRadius: '0 17px 17px 0',
        background: 'var(--lanzhe-blue)',
        color: '#ffffff',
        fontSize: `${1.07 * titleScale}em`,
        lineHeight: '32px',
        fontWeight: 900,
        boxShadow: '2px 4px 0 rgba(41, 74, 111, 0.12)',
      }}
    >
      <span>{children}</span>
    </h2>
  )
}

function LanzheJobIntentionSection(props: {
  readonly jobIntention: ReturnType<typeof useEditableJobIntention>
  readonly titleScale: number
}): ReactElement {
  const { jobIntention, titleScale } = props

  return (
    <section
      className="relative group/job-intention cursor-pointer"
      onClick={jobIntention.openEditModal}
    >
      <FoldTitle titleScale={titleScale}>求职意向</FoldTitle>
      <button
        type="button"
        className="absolute right-0 top-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 opacity-0 shadow-sm transition-opacity hover:bg-slate-50 group-hover/job-intention:opacity-100 print:hidden"
        onClick={(event) => { event.stopPropagation(); jobIntention.openEditModal() }}
      >
        编辑
      </button>
      <div
        className="flex flex-wrap"
        style={{
          gap: '6px 18px',
          paddingLeft: 24,
          color: TEXT,
          fontSize: '0.95em',
          lineHeight: 1.65,
        }}
      >
        {jobIntention.fields.map((field) => {
          const isHovered = jobIntention.hoveredField === field.key
          return (
            <span
              key={field.key}
              className="relative inline-flex items-baseline"
              onMouseEnter={() => jobIntention.setHoveredField(field.key)}
              onMouseLeave={() => jobIntention.setHoveredField(null)}
            >
              <span style={{ color: MUTED }}>{field.label}：</span>
              <span style={{ color: INK, fontWeight: 800 }}>{field.value}</span>
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

interface LanzheSectionProps {
  readonly section: Section
  readonly dragProps: DragHandleProps
  readonly primaryColor: string
  readonly spacingScale: number
  readonly contentLineHeight: number
  readonly titleScale: number
}

function LanzheSection(props: LanzheSectionProps): ReactElement {
  const { section, dragProps, primaryColor, spacingScale, contentLineHeight, titleScale } = props
  const editable = useEditableSection(section)

  return (
    <section
      className="relative group/section"
      onMouseEnter={() => editable.setHovered(true)}
      onMouseLeave={() => editable.setHovered(false)}
      style={{ minHeight: 30 }}
    >
      <div className="relative">
        <FoldTitle titleScale={titleScale}>
          <EditableText
            as="span"
            value={editable.title}
            onCommit={editable.canEditTitle ? editable.onCommitTitle : undefined}
            style={{ color: '#ffffff', fontWeight: 900 }}
          />
        </FoldTitle>
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
          <LanzheBlock
            block={block}
            sectionId={section.id}
            index={index}
            total={total}
            primaryColor={primaryColor}
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
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none', zIndex: 8 }}
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
          onClick={(event) => { event.stopPropagation(); onAdd() }}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
          title="添加"
        >
          <Plus size={14} />
        </button>
      ) : null}
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); onDelete() }}
        className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600"
        title="删除"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

interface LanzheBlockProps {
  readonly block: ResumeBlock
  readonly sectionId: string
  readonly index: number
  readonly total: number
  readonly primaryColor: string
  readonly spacingScale: number
  readonly contentLineHeight: number
  readonly titleScale: number
}

function LanzheBlock(props: LanzheBlockProps): ReactElement {
  const { block, sectionId, index, total, primaryColor, spacingScale, contentLineHeight, titleScale } = props
  const addBlock = useAppStore((s) => s.addBlockByType)
  const deleteBlock = useAppStore((s) => s.deleteBlock)
  const moveBlockUp = useAppStore((s) => s.moveBlockUp)
  const moveBlockDown = useAppStore((s) => s.moveBlockDown)
  const [isEditing, setIsEditing] = useState(false)
  const { openPolish, openGenerate } = useAiSection()
  const moduleType = blockTypeToModuleType(block.type)

  return (
    <div style={{ marginBottom: index < total - 1 ? `${12 * spacingScale}px` : 0, paddingLeft: 24 }}>
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
        <LanzheBlockBody
          block={block}
          primaryColor={primaryColor}
          contentLineHeight={contentLineHeight}
          titleScale={titleScale}
          onEditingChange={setIsEditing}
        />
      </BlockWrapper>
    </div>
  )
}

function LanzheBlockBody(props: {
  readonly block: ResumeBlock
  readonly primaryColor: string
  readonly contentLineHeight: number
  readonly titleScale: number
  readonly onEditingChange: (value: boolean) => void
}): ReactElement {
  const { block, primaryColor, contentLineHeight, titleScale, onEditingChange } = props

  if (block.type === 'text') {
    return (
      <TextContent lineHeight={contentLineHeight}>
        <EditableBlockWrapper
          blockId={block.id}
          contentField="html"
          contentSize="sm"
          className="lanzhe-rich"
          onEditingChange={onEditingChange}
        />
      </TextContent>
    )
  }

  if (block.type === 'experience' || block.type === 'project' || block.type === 'education' || block.type === 'campus') {
    return (
      <div>
        <BlockMetaRow block={block} titleScale={titleScale} onEditingChange={onEditingChange} />
        <StructuredContent block={block} contentLineHeight={contentLineHeight} onEditingChange={onEditingChange} />
      </div>
    )
  }

  const fallbackStyles: BlockRendererStyles = {
    container: 'lanzhe-rich',
    header: 'flex justify-between items-start gap-3 mb-1',
    title: { className: 'font-bold', color: INK },
    subtitle: { className: 'text-slate-600' },
    dateRange: { className: 'ml-4 shrink-0 whitespace-nowrap text-slate-700 font-semibold' },
    content: 'lanzhe-rich mt-1 text-[0.95em]',
    contentColor: TEXT,
  }

  return (
    <BlockRenderer
      block={block}
      themeColor={primaryColor}
      styles={fallbackStyles}
      onEditingChange={onEditingChange}
    />
  )
}

function BlockMetaRow(props: {
  readonly block: Extract<ResumeBlock, { startDate: string; endDate: string }>
  readonly titleScale: number
  readonly onEditingChange: (value: boolean) => void
}): ReactElement {
  const { block, titleScale, onEditingChange } = props

  if (block.type === 'education') {
    return (
      <MetaGrid titleScale={titleScale} columns="minmax(0, 1.32fr) minmax(82px, 0.74fr) minmax(66px, 0.52fr) 118px">
        <MetaCell blockId={block.id} fieldName="school" value={block.school} onEditingChange={onEditingChange} strong />
        <MetaCell blockId={block.id} fieldName="major" value={block.major ?? ''} />
        <MetaCell blockId={block.id} fieldName="degree" value={block.degree ?? ''} />
        <DateCell block={block} />
      </MetaGrid>
    )
  }

  if (block.type === 'experience') {
    return (
      <MetaGrid titleScale={titleScale} columns="minmax(0, 1.4fr) minmax(88px, 0.75fr) 118px">
        <MetaCell blockId={block.id} fieldName="company" value={block.company} onEditingChange={onEditingChange} strong />
        <MetaCell blockId={block.id} fieldName="position" value={block.position} />
        <DateCell block={block} />
      </MetaGrid>
    )
  }

  if (block.type === 'project') {
    return (
      <MetaGrid titleScale={titleScale} columns="minmax(0, 1.4fr) minmax(88px, 0.75fr) 118px">
        <MetaCell blockId={block.id} fieldName="name" value={block.name} onEditingChange={onEditingChange} strong />
        <MetaCell blockId={block.id} fieldName="role" value={block.role ?? ''} />
        <DateCell block={block} />
      </MetaGrid>
    )
  }

  return (
    <MetaGrid titleScale={titleScale} columns="minmax(0, 1.4fr) minmax(88px, 0.75fr) 118px">
      <MetaCell blockId={block.id} fieldName="organization" value={block.organization} onEditingChange={onEditingChange} strong />
      <MetaCell blockId={block.id} fieldName="position" value={block.position} />
      <DateCell block={block} usePlainField />
    </MetaGrid>
  )
}

function MetaGrid(props: {
  readonly columns: string
  readonly titleScale: number
  readonly children: ReactNode
}): ReactElement {
  return (
    <div
      className="items-baseline"
      style={{
        display: 'grid',
        gridTemplateColumns: props.columns,
        gap: '0 14px',
        marginBottom: 5,
        color: INK,
        fontSize: `${0.88 * props.titleScale}em`,
        lineHeight: 1.35,
        fontWeight: 800,
      }}
    >
      {props.children}
    </div>
  )
}

function MetaCell(props: {
  readonly blockId: string
  readonly fieldName: string
  readonly value: string
  readonly strong?: boolean
  readonly onEditingChange?: (value: boolean) => void
}): ReactElement {
  const { blockId, fieldName, value, strong, onEditingChange } = props
  return (
    <div className="min-w-0 pr-1" style={{ fontWeight: strong ? 900 : 700, color: strong ? INK : TEXT }}>
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
  readonly block: Extract<ResumeBlock, { startDate: string; endDate: string }>
  readonly usePlainField?: boolean
}): ReactElement {
  const { block, usePlainField } = props
  return (
    <div
      className="justify-self-end whitespace-nowrap"
      style={{ color: INK, fontSize: '0.95em', fontWeight: 800 }}
    >
      {usePlainField ? (
        <>
          <EditableFieldWrapper blockId={block.id} fieldName="startDate" value={block.startDate} onUpdate={() => {}} />
          <span>-</span>
          <EditableFieldWrapper blockId={block.id} fieldName="endDate" value={block.endDate} onUpdate={() => {}} />
        </>
      ) : (
        <>
          <EditableDateField blockId={block.id} fieldName="startDate" value={block.startDate} />
          <span>-</span>
          <EditableDateField blockId={block.id} fieldName="endDate" value={block.endDate} />
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
          className="lanzhe-rich"
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
          className="lanzhe-rich"
          onEditingChange={onEditingChange}
        />
      </TextContent>
    )
  }

  return <></>
}

function TextContent(props: {
  readonly children: ReactNode
  readonly lineHeight: number
}): ReactElement {
  return (
    <div
      data-template-body-text="true"
      style={{
        color: TEXT,
        fontSize: '0.95em',
        lineHeight: props.lineHeight,
        fontWeight: 400,
      }}
    >
      {props.children}
    </div>
  )
}
