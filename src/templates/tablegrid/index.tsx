"use client"

import { useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
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
import {
  AvatarSlot,
  BlockList,
  DeleteSectionDialog,
  EditableText,
  FieldChip,
  ResumeFrame,
  SortableSection,
  useEditableHeader,
  useEditableJobIntention,
  useEditableSection,
} from '@/templates/_core'
import type { DragHandleProps, TemplateProps } from '@/templates/_core'

const DEFAULT_PRIMARY = '#3d4b58'
const INK = '#20242c'
const MUTED = '#59636e'
const SANS = '"Inter", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'

interface TablePalette {
  readonly primary: string
  readonly labelBg: string
  readonly border: string
  readonly ink: string
  readonly muted: string
  readonly photoBg: string
}

function normalizeHex(color: string | undefined): string {
  if (!color) return DEFAULT_PRIMARY
  const raw = color.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`
  }
  return DEFAULT_PRIMARY
}

function mixHex(color: string, target: string, amount: number): string {
  const from = normalizeHex(color).slice(1)
  const to = normalizeHex(target).slice(1)
  const next = [0, 2, 4].map((start) => {
    const source = Number.parseInt(from.slice(start, start + 2), 16)
    const destination = Number.parseInt(to.slice(start, start + 2), 16)
    return Math.round(source + (destination - source) * amount)
      .toString(16)
      .padStart(2, '0')
  })
  return `#${next.join('')}`
}

function buildPalette(primaryColor: string | undefined): TablePalette {
  const primary = normalizeHex(primaryColor)
  return {
    primary,
    labelBg: mixHex(primary, '#ffffff', 0.9),
    border: mixHex(primary, '#d7dee2', 0.78),
    ink: INK,
    muted: MUTED,
    photoBg: mixHex(primary, '#ffffff', 0.86),
  }
}

function getBlockTypeLabel(type: string): string {
  if (type === 'experience') return '工作经历'
  if (type === 'project') return '项目经历'
  if (type === 'education') return '教育经历'
  if (type === 'campus') return '校园经历'
  return '内容'
}

function normalizeTitle(title: string): string {
  return title.replace(/\s/g, '').toLowerCase()
}

function sectionMinHeight(section: Section): number {
  const title = normalizeTitle(section.title)
  if (title.includes('教育')) return 122
  if (title.includes('项目')) return 240
  if (title.includes('工作') || title.includes('实习')) return 180
  if (title.includes('校园')) return 120
  if (title.includes('技能')) return 93
  if (title.includes('自我') || title.includes('评价')) return 125
  return 110
}

export default function TableGridTemplate(props: TemplateProps): ReactElement {
  const { resume, theme } = props
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null)
  const jobIntention = useEditableJobIntention(resume.jobIntention ?? null)
  const isJobIntentionVisible = resume.jobIntentionVisible ?? jobIntention.fields.length > 0
  const bodyLineHeight = Math.max(1.25, theme.lineHeight * 1.18)
  const palette = buildPalette(theme.primaryColor)
  const titleScale = Math.min(1.25, Math.max(0.85, theme.titleScale ?? 1))
  const spacingScale = Math.min(1.45, Math.max(0.72, theme.spacingScale))
  const paragraphIndent = Math.max(0, theme.paragraphIndent ?? 0)

  return (
    <ResumeFrame
      resume={resume}
      theme={theme}
      style={{
        minHeight: '297mm',
        backgroundColor: '#ffffff',
        color: palette.ink,
        fontFamily: theme.fontFamily || SANS,
        padding: 36,
      }}
    >
      <style>{`
        .tablegrid-rich-text p { margin: 0; text-indent: ${paragraphIndent}em; }
        .tablegrid-rich-text ul, .tablegrid-rich-text ol { margin: 0; padding-left: 1.2em; }
        .tablegrid-rich-text li { margin: 0; }
      `}</style>

      <div
        style={{
          width: '100%',
          border: `1px solid ${palette.border}`,
          borderRadius: 7,
          overflow: 'hidden',
          backgroundColor: '#ffffff',
        }}
      >
        <TableHeader header={header} palette={palette} titleScale={titleScale} />

        {isJobIntentionVisible && jobIntention.fields.length > 0 ? (
          <JobIntentionRow jobIntention={jobIntention} palette={palette} spacingScale={spacingScale} titleScale={titleScale} />
        ) : null}

        <main>
          {resume.sections.map((section, index) => (
            <SortableSection key={section.id} sectionId={section.id}>
              {(dragProps) => (
                <TableSectionRow
                  section={section}
                  dragProps={dragProps}
                  bodyLineHeight={bodyLineHeight}
                  spacingScale={spacingScale}
                  titleScale={titleScale}
                  palette={palette}
                  isLast={index === resume.sections.length - 1}
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

function findHeaderField(header: ReturnType<typeof useEditableHeader>, keyOrLabel: string) {
  return header.fields.find((field) => field.key === keyOrLabel || field.label.includes(keyOrLabel))
}

function TableHeader({
  header,
  palette,
  titleScale,
}: {
  readonly header: ReturnType<typeof useEditableHeader>
  readonly palette: TablePalette
  readonly titleScale: number
}): ReactElement {
  const birth = findHeaderField(header, '出生')
  const phone = findHeaderField(header, 'phone')
  const email = findHeaderField(header, 'email')

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '90px 217px 90px 217px 109px',
        gridTemplateRows: '72px 72px',
        borderBottom: `1px solid ${palette.border}`,
        cursor: 'pointer',
      }}
      onClick={header.openEditModal}
    >
      <HeaderLabel compact palette={palette} titleScale={titleScale}>姓名</HeaderLabel>
      <HeaderValue strong palette={palette}>
        <EditableText value={header.name} onCommit={header.onCommitName} />
      </HeaderValue>
      <HeaderLabel palette={palette} titleScale={titleScale}>出生年月</HeaderLabel>
      <HeaderValue palette={palette}>{birth ? <FieldChip field={birth} header={header}>{birth.value}</FieldChip> : null}</HeaderValue>

      <div style={{ gridColumn: 5, gridRow: '1 / span 2', borderLeft: `1px solid ${palette.border}` }} onClick={(event) => event.stopPropagation()}>
        <AvatarSlot
          header={header}
          render={({ image, uploadOverlay }) => (
            <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: palette.photoBg }}>
              {image}
              {uploadOverlay}
            </div>
          )}
        />
      </div>

      <HeaderLabel compact palette={palette} titleScale={titleScale}>邮箱</HeaderLabel>
      <HeaderValue palette={palette}>{email ? <FieldChip field={email} header={header}>{email.value}</FieldChip> : null}</HeaderValue>
      <HeaderLabel palette={palette} titleScale={titleScale}>联系电话</HeaderLabel>
      <HeaderValue palette={palette}>{phone ? <FieldChip field={phone} header={header}>{phone.value}</FieldChip> : null}</HeaderValue>
    </div>
  )
}

function HeaderLabel({
  children,
  palette,
  titleScale,
  compact = false,
}: {
  readonly children: ReactNode
  readonly palette: TablePalette
  readonly titleScale: number
  readonly compact?: boolean
}): ReactElement {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        borderRight: `1px solid ${palette.border}`,
        borderBottom: `1px solid ${palette.border}`,
        backgroundColor: palette.labelBg,
        color: palette.primary,
        fontSize: `${titleScale}em`,
        fontWeight: 800,
        lineHeight: 1,
        letterSpacing: compact ? '0.75em' : 0,
        paddingLeft: compact ? '0.75em' : 0,
      }}
    >
      {children}
    </div>
  )
}

function HeaderValue({
  children,
  palette,
  strong = false,
}: {
  readonly children: ReactNode
  readonly palette: TablePalette
  readonly strong?: boolean
}): ReactElement {
  return (
    <div
      className="flex items-center"
      style={{
        borderRight: `1px solid ${palette.border}`,
        borderBottom: `1px solid ${palette.border}`,
        paddingLeft: 16,
        fontSize: '1.04em',
        lineHeight: 1.2,
        fontWeight: strong ? 800 : 500,
        color: palette.ink,
      }}
    >
      {children}
    </div>
  )
}

function JobIntentionRow({
  jobIntention,
  palette,
  spacingScale,
  titleScale,
}: {
  readonly jobIntention: ReturnType<typeof useEditableJobIntention>
  readonly palette: TablePalette
  readonly spacingScale: number
  readonly titleScale: number
}): ReactElement {
  const main = jobIntention.fields
    .filter((field) => ['position', 'salary', 'city', 'type'].includes(field.key))
    .map((field) => field.value)
    .join(' | ')
  const fallback = jobIntention.fields.map((field) => field.value).join(' | ')

  return (
    <div
        className="grid cursor-pointer"
      style={{
        gridTemplateColumns: '90px 1fr',
        minHeight: Math.round(71 * spacingScale),
        borderBottom: `1px solid ${palette.border}`,
      }}
      onClick={jobIntention.openEditModal}
    >
      <RowLabel palette={palette} titleScale={titleScale}>求职意向</RowLabel>
      <div className="flex items-center" style={{ padding: `0 ${16 * spacingScale}px`, fontSize: '0.98em', fontWeight: 500, color: palette.ink }}>
        {main || fallback}
      </div>
    </div>
  )
}

interface TableSectionRowProps {
  readonly section: Section
  readonly dragProps: DragHandleProps
  readonly bodyLineHeight: number
  readonly spacingScale: number
  readonly titleScale: number
  readonly palette: TablePalette
  readonly isLast: boolean
}

function TableSectionRow(props: TableSectionRowProps): ReactElement {
  const { section, dragProps, bodyLineHeight, spacingScale, titleScale, palette, isLast } = props
  const editable = useEditableSection(section)
  const verticalPadding = Math.round(18 * spacingScale)
  const horizontalPadding = Math.round(16 * spacingScale)

  return (
    <section
      className="group/table-section grid"
      style={{
        gridTemplateColumns: '90px 1fr',
        minHeight: Math.round(sectionMinHeight(section) * spacingScale),
        borderBottom: isLast ? 0 : `1px solid ${palette.border}`,
      }}
      onMouseEnter={() => editable.setHovered(true)}
      onMouseLeave={() => editable.setHovered(false)}
    >
      <RowLabel palette={palette} titleScale={titleScale}>
        <EditableText
          as="span"
          value={editable.title}
          onCommit={editable.canEditTitle ? editable.onCommitTitle : undefined}
        />
      </RowLabel>

      <div className="relative" style={{ padding: `${verticalPadding}px ${horizontalPadding}px ${Math.max(10, verticalPadding - 4)}px` }}>
        <SectionActions
          visible={editable.isHovered}
          isTextOnly={editable.isTextOnly}
          onAdd={editable.onAddBlock}
          onDelete={editable.onRequestDelete}
          dragProps={dragProps}
        />

        <BlockList
          section={editable}
          themeColor={palette.primary}
          spacingScale={spacingScale}
          className="flex flex-col"
          renderBlock={({ block, index, total }) => (
            <TableBlock
              block={block}
              sectionId={section.id}
              index={index}
              total={total}
              bodyLineHeight={bodyLineHeight}
              spacingScale={spacingScale}
              titleScale={titleScale}
              palette={palette}
            />
          )}
        />
      </div>

      <DeleteSectionDialog
        open={editable.isDeleteDialogOpen}
        sectionTitle={editable.title}
        onOpenChange={editable.setDeleteDialogOpen}
        onConfirm={editable.confirmDelete}
      />
    </section>
  )
}

function RowLabel({
  children,
  palette,
  titleScale,
}: {
  readonly children: ReactNode
  readonly palette: TablePalette
  readonly titleScale: number
}): ReactElement {
  return (
    <div
      className="flex items-center justify-center text-center"
      style={{
        borderRight: `1px solid ${palette.border}`,
        backgroundColor: palette.labelBg,
        color: palette.primary,
        fontSize: `${titleScale}em`,
        fontWeight: 800,
        lineHeight: 1.15,
        padding: '0 10px',
      }}
    >
      {children}
    </div>
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
      className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1 py-0.5 shadow-sm transition-opacity print:hidden"
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
    >
      <button type="button" ref={attachDragHandle} {...sortAttributes} {...sortListeners} className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100" title="拖动">
        <GripVertical size={14} />
      </button>
      {!isTextOnly ? (
        <button type="button" onClick={(e) => { e.stopPropagation(); onAdd() }} className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100" title="添加">
          <Plus size={14} />
        </button>
      ) : null}
      <button type="button" onClick={(e) => { e.stopPropagation(); onDelete() }} className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600" title="删除">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

interface TableBlockProps {
  readonly block: ResumeBlock
  readonly sectionId: string
  readonly index: number
  readonly total: number
  readonly bodyLineHeight: number
  readonly spacingScale: number
  readonly titleScale: number
  readonly palette: TablePalette
}

function TableBlock(props: TableBlockProps): ReactElement {
  const { block, sectionId, index, total, bodyLineHeight, spacingScale, titleScale, palette } = props
  const addBlock = useAppStore((s) => s.addBlockByType)
  const deleteBlock = useAppStore((s) => s.deleteBlock)
  const moveBlockUp = useAppStore((s) => s.moveBlockUp)
  const moveBlockDown = useAppStore((s) => s.moveBlockDown)
  const [isEditing, setIsEditing] = useState(false)
  const { openPolish, openGenerate } = useAiSection()
  const moduleType = blockTypeToModuleType(block.type)

  return (
    <div style={{ marginBottom: index < total - 1 ? `${22 * spacingScale}px` : 0 }}>
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
        <BlockBody block={block} bodyLineHeight={bodyLineHeight} titleScale={titleScale} palette={palette} onEditingChange={setIsEditing} />
      </BlockWrapper>
    </div>
  )
}

function BlockBody(props: {
  readonly block: ResumeBlock
  readonly bodyLineHeight: number
  readonly titleScale: number
  readonly palette: TablePalette
  readonly onEditingChange: (value: boolean) => void
}): ReactElement {
  const { block, bodyLineHeight, titleScale, palette, onEditingChange } = props

  if (block.type === 'text') {
    return (
      <TextContent lineHeight={bodyLineHeight} palette={palette}>
        <EditableBlockWrapper blockId={block.id} contentField="html" contentSize="sm" className="tablegrid-rich-text" onEditingChange={onEditingChange} />
      </TextContent>
    )
  }

  return (
    <div>
      <BlockHeader block={block} titleScale={titleScale} palette={palette} onEditingChange={onEditingChange} />
      <BlockContent block={block} lineHeight={bodyLineHeight} palette={palette} onEditingChange={onEditingChange} />
    </div>
  )
}

function BlockHeader({
  block,
  titleScale,
  palette,
  onEditingChange,
}: {
  readonly block: ResumeBlock
  readonly titleScale: number
  readonly palette: TablePalette
  readonly onEditingChange: (value: boolean) => void
}): ReactElement {
  if (block.type === 'education') {
    return (
      <>
        <TitleWithDate title={<EditableFieldWrapper blockId={block.id} fieldName="school" value={block.school ?? ''} onUpdate={() => {}} onEditingChange={onEditingChange} />} block={block} titleScale={titleScale} palette={palette} />
        <div className="flex items-baseline gap-6" style={{ marginBottom: 7, fontSize: `${0.95 * titleScale}em`, lineHeight: 1, color: palette.ink }}>
          <EditableFieldWrapper blockId={block.id} fieldName="major" value={block.major ?? ''} onUpdate={() => {}} />
          <EditableFieldWrapper blockId={block.id} fieldName="degree" value={block.degree ?? ''} onUpdate={() => {}} />
        </div>
      </>
    )
  }

  if (block.type === 'experience') {
    return (
      <>
        <TitleWithDate title={<EditableFieldWrapper blockId={block.id} fieldName="company" value={block.company ?? ''} onUpdate={() => {}} onEditingChange={onEditingChange} />} block={block} titleScale={titleScale} palette={palette} />
        <SubTitle palette={palette} titleScale={titleScale}><EditableFieldWrapper blockId={block.id} fieldName="position" value={block.position ?? ''} onUpdate={() => {}} /></SubTitle>
      </>
    )
  }

  if (block.type === 'project') {
    return (
      <>
        <TitleWithDate title={<EditableFieldWrapper blockId={block.id} fieldName="name" value={block.name ?? ''} onUpdate={() => {}} onEditingChange={onEditingChange} />} block={block} titleScale={titleScale} palette={palette} />
        <SubTitle palette={palette} titleScale={titleScale}><EditableFieldWrapper blockId={block.id} fieldName="role" value={block.role ?? ''} onUpdate={() => {}} /></SubTitle>
      </>
    )
  }

  if (block.type === 'campus') {
    return (
      <>
        <TitleWithDate title={<EditableFieldWrapper blockId={block.id} fieldName="organization" value={block.organization ?? ''} onUpdate={() => {}} onEditingChange={onEditingChange} />} block={block} titleScale={titleScale} palette={palette} plainDate />
        <SubTitle palette={palette} titleScale={titleScale}><EditableFieldWrapper blockId={block.id} fieldName="position" value={block.position ?? ''} onUpdate={() => {}} /></SubTitle>
      </>
    )
  }

  return <></>
}

function TitleWithDate(props: {
  readonly title: ReactNode
  readonly block: Extract<ResumeBlock, { startDate?: string; endDate?: string }>
  readonly titleScale: number
  readonly palette: TablePalette
  readonly plainDate?: boolean
}): ReactElement {
  const { title, block, titleScale, palette, plainDate } = props
  return (
    <div className="relative pr-[150px]" style={{ marginBottom: 7 }}>
      <h2 style={{ margin: 0, fontSize: `${1.16 * titleScale}em`, lineHeight: 1, fontWeight: 800, color: palette.ink }}>
        {title}
      </h2>
      <div className="absolute right-0 top-0 whitespace-nowrap" style={{ fontSize: `${1.16 * titleScale}em`, lineHeight: 1, fontWeight: 400, color: palette.ink }}>
        {plainDate ? (
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
    </div>
  )
}

function SubTitle({ children, palette, titleScale }: { readonly children: ReactNode; readonly palette: TablePalette; readonly titleScale: number }): ReactElement {
  return (
    <div style={{ marginBottom: 8, fontSize: `${0.95 * titleScale}em`, lineHeight: 1, fontWeight: 500, color: palette.ink }}>
      {children}
    </div>
  )
}

function BlockContent(props: {
  readonly block: ResumeBlock
  readonly lineHeight: number
  readonly palette: TablePalette
  readonly onEditingChange: (value: boolean) => void
}): ReactElement {
  const { block, lineHeight, palette, onEditingChange } = props

  if (block.type === 'education') {
    return block.courseHtml ? (
      <TextContent lineHeight={lineHeight} palette={palette}>
        <EditableBlockWrapper blockId={block.id} contentField="courseHtml" contentSize="xs" className="tablegrid-rich-text" onEditingChange={onEditingChange} />
      </TextContent>
    ) : <></>
  }

  if (block.type === 'experience' || block.type === 'project' || block.type === 'campus') {
    return (
      <TextContent lineHeight={lineHeight} palette={palette}>
        <EditableBlockWrapper blockId={block.id} contentField="contentHtml" contentSize="xs" className="tablegrid-rich-text" onEditingChange={onEditingChange} />
      </TextContent>
    )
  }

  return <></>
}

function TextContent({ children, lineHeight, palette }: { readonly children: ReactNode; readonly lineHeight: number; readonly palette: TablePalette }): ReactElement {
  return (
    <div style={{ color: palette.muted, fontSize: '0.73em', lineHeight, fontWeight: 400 }}>
      {children}
    </div>
  )
}
