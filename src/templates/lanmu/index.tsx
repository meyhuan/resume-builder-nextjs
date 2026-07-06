"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactElement, ReactNode } from 'react'
import { GripVertical, Plus, Trash2, XCircle } from 'lucide-react'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
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
  DeleteSectionDialog,
  EditableText,
  FieldChip,
  ResumeFrame,
  SortableSection,
  mmToPx,
  useEditableHeader,
  useEditableJobIntention,
  useEditableSection,
} from '@/templates/_core'
import type { DragHandleProps, EditableHeader, EditableJobIntention, TemplateProps } from '@/templates/_core'
import TwoColumnDndProvider, {
  ColumnDroppable,
  CrossColumnPlaceholder,
  COLUMN_LEFT_ID,
  COLUMN_RIGHT_ID,
} from '@/templates/warm/two-column-dnd-provider'

const DEFAULT_BLUE = '#2f86ed'
const SIGNATURE_CYAN = '#92d8e7'
const BODY = '#222222'
const MUTED = '#8c8f96'
const SANS = '"Inter", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'

type CssVars = CSSProperties & Record<`--${string}`, string | number>

function normalizeHexColor(value: string | undefined): string {
  if (!value) return DEFAULT_BLUE
  const trimmed = value.trim()
  const shortHex = /^#([0-9a-f]{3})$/i.exec(trimmed)
  if (shortHex) {
    return `#${shortHex[1].split('').map((char) => `${char}${char}`).join('')}`.toLowerCase()
  }
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toLowerCase() : DEFAULT_BLUE
}

function hexToRgb(hex: string): { readonly r: number; readonly g: number; readonly b: number } {
  const normalized = normalizeHexColor(hex).slice(1)
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
}

function mixHex(from: string, to: string, amount: number): string {
  const start = hexToRgb(from)
  const end = hexToRgb(to)
  const clamped = Math.min(1, Math.max(0, amount))
  return rgbToHex(
    start.r + (end.r - start.r) * clamped,
    start.g + (end.g - start.g) * clamped,
    start.b + (end.b - start.b) * clamped,
  )
}

function buildLanmuPalette(themePrimaryColor: string | undefined): {
  readonly primary: string
  readonly heroGradient: string
  readonly pale: string
} {
  const primary = normalizeHexColor(themePrimaryColor)
  const middle = mixHex(primary, '#5dbaf2', 0.45)
  const end = mixHex(SIGNATURE_CYAN, primary, 0.12)

  return {
    primary,
    heroGradient: `linear-gradient(100deg, ${primary} 0%, ${middle} 44%, ${end} 100%)`,
    pale: mixHex(primary, '#ffffff', 0.88),
  }
}

function normalizeTitle(title: string): string {
  return title.replace(/\s/g, '').toLowerCase()
}

function isTextOnlySection(section: Section): boolean {
  return section.blocks.length > 0 && section.blocks.every((block) => block.type === 'text')
}

function shouldDefaultToLeft(section: Section): boolean {
  return isTextOnlySection(section)
}

function isSelfSection(section: Section): boolean {
  const title = normalizeTitle(section.title)
  return title.includes('自我') || title.includes('评价') || title.includes('优势')
}

function getBlockTypeLabel(type: string): string {
  if (type === 'experience') return '工作经历'
  if (type === 'project') return '项目经历'
  if (type === 'education') return '教育经历'
  if (type === 'campus') return '校园经历'
  if (type === 'text') return '文本模块'
  if (type === 'list') return '列表'
  return '内容'
}

function getDisplaySectionTitle(title: string): string {
  return title
}

function getSideDisplaySectionTitle(section: Section): string {
  return section.title
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function summarizeBlock(block: ResumeBlock): string {
  if (block.type === 'experience') return [block.company, block.position, stripHtml(block.contentHtml ?? '')].filter(Boolean).join(' / ')
  if (block.type === 'project') return [block.name, block.role, stripHtml(block.contentHtml ?? '')].filter(Boolean).join(' / ')
  if (block.type === 'education') return [block.school, block.major, block.degree].filter(Boolean).join(' / ')
  if (block.type === 'campus') return [block.organization, block.position, stripHtml(block.contentHtml ?? '')].filter(Boolean).join(' / ')
  if (block.type === 'list') return block.items.map((item) => stripHtml(item.html)).filter(Boolean).join(' / ')
  if (block.type === 'text') return stripHtml(block.html)
  return ''
}

function runClickActionOnKey(event: KeyboardEvent<HTMLElement>, action: () => void): void {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  action()
}

export default function LanmuTemplate(props: TemplateProps): ReactElement {
  const { resume, theme, sidebarSectionIds: externalIds, onSidebarSectionIdsChange } = props
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null)
  const jobIntention = useEditableJobIntention(resume.jobIntention ?? null)
  const moveSection = useAppStore((state) => state.moveSection)
  const moveBlockInSection = useAppStore((state) => state.moveBlockInSection)
  const moveBlockToSection = useAppStore((state) => state.moveBlockToSection)
  const isJobIntentionVisible = resume.jobIntentionVisible ?? jobIntention.fields.length > 0
  const headerTitle = getHeaderJobIntentionText(resume)
  const palette = useMemo(() => buildLanmuPalette(theme.primaryColor), [theme.primaryColor])
  const primaryColor = palette.primary
  const titleScale = Math.min(1.2, Math.max(0.86, theme.titleScale ?? 1))
  const spacingScale = Math.max(0.72, theme.spacingScale)
  const contentLineHeight = Math.max(1.18, theme.lineHeight)
  const pagePadX = Math.max(0, mmToPx(theme.pagePaddingHorizontal) * 0.72)
  const pagePadTop = Math.max(26, mmToPx(theme.pagePaddingVertical) * 0.46)
  const pagePadBottom = Math.max(34, mmToPx(theme.pagePaddingVertical) * 0.58)
  const sideColumnWidth = Math.max(150, 164 + (pagePadX - 37) * 0.18)
  const railColumnWidth = 52
  const sectionIds = useMemo(() => resume.sections.map((section) => section.id), [resume.sections])
  const defaultSidebarIds = useMemo(() => resume.sections.filter(shouldDefaultToLeft).map((section) => section.id), [resume.sections])
  const [localSidebarIds, setLocalSidebarIds] = useState<readonly string[]>(defaultSidebarIds)
  const sidebarIds = externalIds ?? localSidebarIds
  const validSectionIds = useMemo(() => new Set(sectionIds), [sectionIds])
  const resumeIdRef = useRef(resume.id)
  const knownSectionIdsRef = useRef<ReadonlySet<string>>(new Set(sectionIds))
  const normalizedSidebarIds = useMemo(
    () => sidebarIds.filter((id, index) => validSectionIds.has(id) && sidebarIds.indexOf(id) === index),
    [sidebarIds, validSectionIds],
  )
  const sidebarSet = useMemo(() => new Set(normalizedSidebarIds), [normalizedSidebarIds])
  const leftSections = useMemo(() => resume.sections.filter((section) => sidebarSet.has(section.id)), [resume.sections, sidebarSet])
  const rightSections = useMemo(() => resume.sections.filter((section) => !sidebarSet.has(section.id)), [resume.sections, sidebarSet])

  useEffect(() => {
    if (externalIds) {
      resumeIdRef.current = resume.id
      knownSectionIdsRef.current = validSectionIds
      return
    }

    const resumeChanged = resumeIdRef.current !== resume.id
    const knownSectionIds = knownSectionIdsRef.current
    resumeIdRef.current = resume.id
    knownSectionIdsRef.current = validSectionIds

    setLocalSidebarIds((currentIds) => {
      if (resumeChanged) return defaultSidebarIds

      const nextIds = currentIds.filter((id, index) => validSectionIds.has(id) && currentIds.indexOf(id) === index)
      for (const id of defaultSidebarIds) {
        if (!knownSectionIds.has(id) && !nextIds.includes(id)) nextIds.push(id)
      }
      return nextIds
    })
  }, [defaultSidebarIds, externalIds, resume.id, validSectionIds])

  const updateSidebar = useCallback((ids: readonly string[]): void => {
    const normalized = ids.filter((id, index) => validSectionIds.has(id) && ids.indexOf(id) === index)
    setLocalSidebarIds(normalized)
    onSidebarSectionIdsChange?.(normalized)
  }, [onSidebarSectionIdsChange, validSectionIds])

  const handleMoveSectionToColumn = useCallback((sectionId: string, toColumn: 'left' | 'right'): void => {
    if (toColumn === 'left') {
      updateSidebar(normalizedSidebarIds.includes(sectionId) ? normalizedSidebarIds : [...normalizedSidebarIds, sectionId])
      return
    }
    updateSidebar(normalizedSidebarIds.filter((id) => id !== sectionId))
  }, [normalizedSidebarIds, updateSidebar])

  const rootStyle: CssVars = {
    minHeight: '297mm',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#ffffff',
    color: BODY,
    fontFamily: theme.fontFamily || SANS,
    '--lanmu-blue': primaryColor,
    '--lanmu-pale': palette.pale,
    '--lanmu-page-pad-x': `${pagePadX}px`,
    '--lanmu-page-pad-top': `${pagePadTop}px`,
    '--lanmu-print-page-padding-v': `${theme.pagePaddingVertical}mm`,
    '--lanmu-rail-width': `${railColumnWidth}px`,
  }

  return (
    <ResumeFrame resume={resume} theme={theme} className="lanmu-resume-root" disableDnd style={rootStyle}>
      <style>{`
        .lanmu-root p { margin: 0; }
        .lanmu-root ul, .lanmu-root ol { margin: 0; padding-left: 1.2em; }
        .lanmu-root li { margin: 0; }
        .lanmu-avatar img { object-fit: cover !important; object-position: center center; }
        .lanmu-body-text p,
        .lanmu-body-text li { line-height: inherit !important; }
        @media print {
          .lanmu-resume-root,
          .lanmu-root {
            min-height: calc(297mm - var(--lanmu-print-page-padding-v) - 2px) !important;
            overflow: visible !important;
          }
          .lanmu-root { box-shadow: none !important; }
        }
      `}</style>

      <TwoColumnDndProvider
        leftSections={leftSections}
        rightSections={rightSections}
        allSections={resume.sections}
        theme={theme}
        onMoveSection={moveSection}
        onMoveWithinSection={moveBlockInSection}
        onMoveToSection={moveBlockToSection}
        onMoveSectionToColumn={handleMoveSectionToColumn}
        canMoveSectionToColumn={() => true}
        renderSectionOverlay={(sectionId) => {
          const section = resume.sections.find((item) => item.id === sectionId)
          return section ? <LanmuSectionOverlay section={section} primaryColor={primaryColor} /> : null
        }}
      >
        <div className="lanmu-root" style={{ position: 'relative', minHeight: '297mm', overflow: 'hidden', backgroundColor: '#fff' }}>
          <LanmuHero
            header={header}
            title={headerTitle}
            heroGradient={palette.heroGradient}
            paleColor={palette.pale}
            primaryColor={primaryColor}
          />

          <section
            data-template-padding-probe="true"
            data-lanmu-panel="true"
            className="relative"
            style={{
              minHeight: 820,
              marginTop: 34,
              padding: `${pagePadTop}px ${pagePadX}px ${pagePadBottom}px ${pagePadX}px`,
              zIndex: 1,
              background: '#fff',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `${sideColumnWidth}px ${railColumnWidth}px minmax(0, 1fr)`,
                alignItems: 'start',
                columnGap: 0,
              }}
            >
              <ColumnDroppable id={COLUMN_LEFT_ID}>
                <aside data-lanmu-column="left" style={{ paddingTop: 0, minHeight: 360, paddingRight: 18 }}>
                  {isJobIntentionVisible ? (
                    <SideJobInfo
                      jobIntention={jobIntention}
                      lineHeight={contentLineHeight}
                      spacingScale={spacingScale}
                    />
                  ) : null}

                  <div className="flex flex-col" style={{ gap: 36 * spacingScale }}>
                    {leftSections.map((section) => (
                      <SortableSection key={section.id} sectionId={section.id}>
                        {(dragProps) => (
                          <LanmuSideSection
                            section={section}
                            dragProps={dragProps as DragHandleProps}
                            titleScale={titleScale}
                            spacingScale={spacingScale}
                            lineHeight={contentLineHeight}
                          />
                        )}
                      </SortableSection>
                    ))}
                    <CrossColumnPlaceholder columnId={COLUMN_LEFT_ID} />
                  </div>
                </aside>
              </ColumnDroppable>

              <div className="relative self-stretch" aria-hidden>
                <div
                  className="absolute top-0 bottom-0"
                  style={{
                    left: '50%',
                    width: 0,
                    borderLeft: '1px dashed #bfbfbf',
                    transform: 'translateX(-50%)',
                  }}
                />
              </div>

              <ColumnDroppable id={COLUMN_RIGHT_ID}>
                <main data-lanmu-column="right" className="relative" style={{ minHeight: 420, paddingLeft: 0 }}>
                  {rightSections.map((section) => (
                    <SortableSection key={section.id} sectionId={section.id}>
                      {(dragProps) => (
                        <LanmuMainSection
                          section={section}
                          dragProps={dragProps as DragHandleProps}
                          titleScale={titleScale}
                          spacingScale={spacingScale}
                          lineHeight={contentLineHeight}
                        />
                      )}
                    </SortableSection>
                  ))}
                  <CrossColumnPlaceholder columnId={COLUMN_RIGHT_ID} />
                </main>
              </ColumnDroppable>
            </div>
          </section>
        </div>
      </TwoColumnDndProvider>

      {header.modals}
      {jobIntention.modals}
    </ResumeFrame>
  )
}

function LanmuHero(props: {
  readonly header: EditableHeader
  readonly title: string
  readonly heroGradient: string
  readonly paleColor: string
  readonly primaryColor: string
}): ReactElement {
  const { header, title, heroGradient, paleColor, primaryColor } = props
  const metaFields = header.fields
  const secondLine = title ? [title] : []

  return (
    <section
      className="relative overflow-visible"
      style={{
        height: 192,
        background: '#fff',
        zIndex: 1,
      }}
    >
      <AvatarSlot
        header={header}
        render={({ image, hovered }) => (
          <div
            className="lanmu-avatar absolute"
            style={{
              left: 37,
              top: 28,
              width: 165,
              height: 165,
              overflow: 'visible',
            }}
          >
            <div
              aria-hidden
              className="absolute"
              style={{
                right: -32,
                top: 0,
                width: 132,
                height: 165,
                borderRadius: '72px 72px 72px 0',
                background: paleColor,
                opacity: 0.8,
              }}
            />
            <div
              className="absolute inset-0 z-10 overflow-hidden"
              style={{
                borderRadius: '82px 82px 82px 0',
                background: paleColor,
              }}
            >
              {image}
            </div>
            {hovered ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 overflow-hidden bg-black/65 px-3 text-center text-white print:hidden" style={{ borderRadius: '82px 82px 82px 0' }}>
                <button
                  type="button"
                  className="mt-1 rounded border border-white/80 px-2.5 py-1 text-[10px] font-semibold transition-colors hover:bg-white/20"
                  onClick={(event) => { event.stopPropagation(); header.openAvatarUpload() }}
                >
                  本地上传
                </button>
              </div>
            ) : null}
          </div>
        )}
      />

      <div
        className="absolute text-white"
        data-template-base-info-trigger="true"
        role="button"
        tabIndex={0}
        style={{
          left: 240,
          top: 0,
          right: 0,
          height: 192,
          borderBottomLeftRadius: 40,
          background: heroGradient,
          paddingLeft: 36,
          paddingTop: 43,
        }}
        onClick={header.openEditModal}
        onKeyDown={(event) => runClickActionOnKey(event, header.openEditModal)}
      >
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-px"
          style={{ backgroundColor: primaryColor }}
        />
        <EditableText
          as="h1"
          value={header.name}
          onCommit={header.onCommitName}
          className="m-0 font-black text-white"
          style={{ fontSize: '2.06em', lineHeight: 1 }}
          placeholder="姓名"
        />
        <div
          className="mt-6 flex flex-col gap-3 text-left font-semibold text-white/90 print:cursor-default"
          style={{ fontSize: '0.9em', lineHeight: 1.12, paddingRight: 28 }}
        >
          {metaFields.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {metaFields.map((field, index) => (
                <FieldChip key={field.key} field={field} header={header} deleteColor="#ffffff" className="whitespace-nowrap">
                  <span>{index > 0 ? '|' : ''} {field.label}：{field.value}</span>
                </FieldChip>
              ))}
            </div>
          ) : (
            <span>点击完善电话、邮箱、城市等基础信息</span>
          )}
          {secondLine.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {secondLine.map((item, index) => (
                <span key={`${item}-${index}`} className="whitespace-nowrap">{index > 0 ? '|' : ''} {item}</span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function SideTitle(props: { readonly children: ReactNode }): ReactElement {
  return (
    <h3
      className="relative m-0 font-black text-black"
      style={{ fontSize: '1.36em', lineHeight: 1.08, marginBottom: 24 }}
    >
      {props.children}
    </h3>
  )
}

function SideJobInfo(props: {
  readonly jobIntention: EditableJobIntention
  readonly lineHeight: number
  readonly spacingScale: number
}): ReactElement {
  const { jobIntention, lineHeight, spacingScale } = props
  const visibleFields = jobIntention.fields

  return (
    <section style={{ marginBottom: 46 * spacingScale }}>
      <SideTitle>求职意向</SideTitle>
      <div
        data-template-job-intention-trigger="true"
        role="button"
        tabIndex={0}
        className="block w-full text-left print:cursor-default"
        onClick={jobIntention.openEditModal}
        onKeyDown={(event) => runClickActionOnKey(event, jobIntention.openEditModal)}
      >
        {visibleFields.length > 0 ? (
          visibleFields.map((field, index) => (
            <SideJobField
              key={`${field.key}-${field.value}`}
              field={field}
              jobIntention={jobIntention}
              strong={index === 0}
              lineHeight={lineHeight}
            />
          ))
        ) : (
          <p style={{ color: MUTED, fontSize: '0.9em', lineHeight }}>点击填写求职意向</p>
        )}
      </div>
    </section>
  )
}

function SideJobField(props: {
  readonly field: EditableJobIntention['fields'][number]
  readonly jobIntention: EditableJobIntention
  readonly strong?: boolean
  readonly lineHeight: number
}): ReactElement {
  const { field, jobIntention, strong, lineHeight } = props
  const isHovered = jobIntention.hoveredField === field.key

  if (strong) {
    return (
      <span
        className="relative mb-4 block font-black text-black"
        style={{ fontSize: '0.98em', lineHeight, overflowWrap: 'anywhere' }}
        onMouseEnter={() => jobIntention.setHoveredField(field.key)}
        onMouseLeave={() => jobIntention.setHoveredField(null)}
      >
        {field.value}
        {isHovered ? (
          <DeleteDot label={field.label} onClick={() => jobIntention.deleteField(field.key)} />
        ) : null}
      </span>
    )
  }

  return (
    <span
      className="relative mb-2 block"
      style={{ color: BODY, fontSize: '0.9em', lineHeight, overflowWrap: 'anywhere' }}
      onMouseEnter={() => jobIntention.setHoveredField(field.key)}
      onMouseLeave={() => jobIntention.setHoveredField(null)}
    >
      {field.label}： {field.value}
      {isHovered ? (
        <DeleteDot label={field.label} onClick={() => jobIntention.deleteField(field.key)} />
      ) : null}
    </span>
  )
}

function DeleteDot(props: { readonly label: string; readonly onClick: () => void }): ReactElement {
  return (
    <button
      type="button"
      className="absolute -right-2 -top-2 rounded-full bg-white text-red-500 shadow-sm print:hidden"
      aria-label={`删除 ${props.label}`}
      onClick={(event) => {
        event.stopPropagation()
        props.onClick()
      }}
    >
      <XCircle size={14} />
    </button>
  )
}

function LanmuSideSection(props: {
  readonly section: Section
  readonly dragProps: DragHandleProps
  readonly titleScale: number
  readonly lineHeight: number
  readonly spacingScale: number
}): ReactElement {
  const { section, dragProps, titleScale, lineHeight, spacingScale } = props
  const editable = useEditableSection(section)
  const {
    title,
    canEditTitle,
    onCommitTitle,
    isTextOnly,
    onAddBlock,
    onRequestDelete,
    isHovered,
    setHovered,
    dropRef,
    isDeleteDialogOpen,
    setDeleteDialogOpen,
    confirmDelete,
  } = editable
  const displayTitle = getDisplaySectionTitle(title)
  const blockIds = section.blocks.map((block) => block.id)

  return (
    <section
      data-template-section="true"
      className="group/lanmu-side-section relative"
      style={{ marginBottom: 10 * spacingScale }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative" style={{ marginBottom: 16 * spacingScale }}>
        <EditableText
          as="h3"
          value={displayTitle}
          onCommit={canEditTitle ? onCommitTitle : undefined}
          className="m-0 font-black text-black"
          style={{ fontSize: `${1.34 * titleScale}em`, lineHeight: 1.08 }}
        />
        <div className="absolute right-0 top-0 z-10">
          <SectionActions
            visible={isHovered}
            isTextOnly={isTextOnly}
            onAdd={onAddBlock}
            onDelete={onRequestDelete}
            dragProps={dragProps}
          />
        </div>
      </div>

      <SortableContext items={blockIds} strategy={rectSortingStrategy}>
        <div ref={dropRef} className="flex flex-col" style={{ gap: 22 * spacingScale }}>
          {section.blocks.map((block, index) => (
            <LanmuSideBlock
              key={block.id}
              block={block}
              sectionId={section.id}
              index={index}
              total={section.blocks.length}
              lineHeight={lineHeight}
            />
          ))}
        </div>
      </SortableContext>

      <DeleteSectionDialog
        open={isDeleteDialogOpen}
        sectionTitle={displayTitle}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
      />
    </section>
  )
}

function LanmuSideBlock(props: {
  readonly block: ResumeBlock
  readonly sectionId: string
  readonly index: number
  readonly total: number
  readonly lineHeight: number
}): ReactElement {
  const { block, sectionId, index, total, lineHeight } = props

  if (block.type === 'education') {
    return (
      <SideEducationBlock
        block={block}
        sectionId={sectionId}
        index={index}
        total={total}
        lineHeight={lineHeight}
      />
    )
  }

  return (
    <LanmuBlockShell block={block} sectionId={sectionId} index={index} total={total} compact>
      <LanmuSideBlockBody block={block} lineHeight={lineHeight} />
    </LanmuBlockShell>
  )
}

function LanmuSideBlockBody(props: { readonly block: ResumeBlock; readonly lineHeight: number }): ReactElement {
  const { block, lineHeight } = props
  const mutedTextStyle: CSSProperties = { color: MUTED, fontSize: '0.86em', lineHeight, overflowWrap: 'anywhere' }
  const titleStyle: CSSProperties = { fontSize: '1.02em', lineHeight: 1.2, overflowWrap: 'anywhere' }

  if (block.type === 'experience') {
    return (
      <article style={{ lineHeight }}>
        <h4 className="m-0 mb-2 font-black text-black" style={titleStyle}>
          <EditableFieldWrapper blockId={block.id} fieldName="company" value={block.company ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />
        </h4>
        <div className="mb-1" style={mutedTextStyle}>
          <EditableFieldWrapper blockId={block.id} fieldName="position" value={block.position ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />
        </div>
        <div className="mb-2" style={mutedTextStyle}>
          <DateRange blockId={block.id} startDate={block.startDate ?? ''} endDate={block.endDate ?? ''} />
        </div>
        <LanmuRichText blockId={block.id} field="contentHtml" lineHeight={lineHeight} fontSize="0.84em" />
      </article>
    )
  }

  if (block.type === 'project') {
    return (
      <article style={{ lineHeight }}>
        <h4 className="m-0 mb-2 font-black text-black" style={titleStyle}>
          <EditableFieldWrapper blockId={block.id} fieldName="name" value={block.name ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />
        </h4>
        <div className="mb-1" style={mutedTextStyle}>
          <EditableFieldWrapper blockId={block.id} fieldName="role" value={block.role ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />
        </div>
        <div className="mb-2" style={mutedTextStyle}>
          <DateRange blockId={block.id} startDate={block.startDate ?? ''} endDate={block.endDate ?? ''} />
        </div>
        <LanmuRichText blockId={block.id} field="contentHtml" lineHeight={lineHeight} fontSize="0.84em" />
      </article>
    )
  }

  if (block.type === 'campus') {
    return (
      <article style={{ lineHeight }}>
        <h4 className="m-0 mb-2 font-black text-black" style={titleStyle}>
          <EditableFieldWrapper blockId={block.id} fieldName="organization" value={block.organization ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />
        </h4>
        <div className="mb-1" style={mutedTextStyle}>
          <EditableFieldWrapper blockId={block.id} fieldName="position" value={block.position ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />
        </div>
        <div className="mb-2" style={mutedTextStyle}>
          <DateRange blockId={block.id} startDate={block.startDate ?? ''} endDate={block.endDate ?? ''} />
        </div>
        <LanmuRichText blockId={block.id} field="contentHtml" lineHeight={lineHeight} fontSize="0.84em" />
      </article>
    )
  }

  if (block.type === 'list') {
    return (
      <ul className="lanmu-body-text m-0 p-0" style={{ color: BODY, fontSize: '0.84em', lineHeight }}>
        {block.items.map((item) => (
          <li key={item.id} dangerouslySetInnerHTML={{ __html: item.html }} />
        ))}
      </ul>
    )
  }

  if (block.type === 'text') {
    return <LanmuRichText blockId={block.id} field="html" lineHeight={lineHeight} fontSize="0.84em" />
  }

  return <LanmuBlockBody block={block} lineHeight={lineHeight} />
}

function LanmuSectionOverlay(props: { readonly section: Section; readonly primaryColor: string }): ReactElement {
  const { section, primaryColor } = props
  const summary = section.blocks.map(summarizeBlock).filter(Boolean).join(' / ')
  return (
    <div
      className="rounded bg-white shadow-2xl"
      style={{
        width: 280,
        borderLeft: `4px solid ${primaryColor}`,
        padding: '14px 16px',
        color: BODY,
        fontFamily: SANS,
      }}
    >
      <h3 className="m-0 font-black text-black" style={{ fontSize: 20, lineHeight: 1.18 }}>
        {getSideDisplaySectionTitle(section)}
      </h3>
      {summary ? (
        <p className="m-0 mt-3" style={{ color: MUTED, fontSize: 13, lineHeight: 1.55 }}>
          {summary.length > 110 ? `${summary.slice(0, 110)}...` : summary}
        </p>
      ) : null}
    </div>
  )
}

function SideEducationBlock(props: {
  readonly block: Extract<ResumeBlock, { type: 'education' }>
  readonly sectionId: string
  readonly index: number
  readonly total: number
  readonly lineHeight: number
}): ReactElement {
  const { block, sectionId, index, total, lineHeight } = props
  return (
    <LanmuBlockShell block={block} sectionId={sectionId} index={index} total={total} compact>
      <div style={{ lineHeight }}>
        <h4 className="m-0 mb-2 font-black text-black" style={{ fontSize: '1.02em', lineHeight: 1.2 }}>
          <EditableFieldWrapper blockId={block.id} fieldName="school" value={block.school ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />
        </h4>
        <div className="mb-1" style={{ color: MUTED, fontSize: '0.88em', lineHeight }}>
          <EditableFieldWrapper blockId={block.id} fieldName="major" value={block.major ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />
        </div>
        <div className="mb-1" style={{ color: MUTED, fontSize: '0.88em', lineHeight }}>
          <EditableFieldWrapper blockId={block.id} fieldName="degree" value={block.degree ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />
        </div>
        <div style={{ color: MUTED, fontSize: '0.88em', lineHeight }}>
          <DateRange blockId={block.id} startDate={block.startDate ?? ''} endDate={block.endDate ?? ''} />
        </div>
        {block.courseHtml ? (
          <div className="lanmu-body-text mt-2" style={{ color: MUTED, fontSize: '0.84em', lineHeight }}>
            <EditableBlockWrapper
              blockId={block.id}
              contentField="courseHtml"
              contentSize="xs"
              className="!p-0 text-inherit hover:!bg-transparent [&_li]:!leading-[inherit] [&_ol]:!pl-[0.95em] [&_p]:!leading-[inherit] [&_ul]:!pl-[0.85em]"
              editingStyle={{ lineHeight }}
            />
          </div>
        ) : null}
      </div>
    </LanmuBlockShell>
  )
}

function LanmuMainSection(props: {
  readonly section: Section
  readonly dragProps: DragHandleProps
  readonly titleScale: number
  readonly spacingScale: number
  readonly lineHeight: number
}): ReactElement {
  const { section, dragProps, titleScale, spacingScale, lineHeight } = props
  const editable = useEditableSection(section)
  const {
    title,
    canEditTitle,
    onCommitTitle,
    isTextOnly,
    onAddBlock,
    onRequestDelete,
    isHovered,
    setHovered,
    dropRef,
    isDeleteDialogOpen,
    setDeleteDialogOpen,
    confirmDelete,
  } = editable
  const displayTitle = getDisplaySectionTitle(title)
  const blockIds = section.blocks.map((block) => block.id)

  return (
    <section
      data-template-section="true"
      className="group/lanmu-section relative"
      style={{ marginBottom: isSelfSection(section) ? `${32 * spacingScale}px` : `${42 * spacingScale}px` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative flex items-center gap-4" style={{ marginBottom: 22 * spacingScale }}>
        <EditableText
          as="h2"
          value={displayTitle}
          onCommit={canEditTitle ? onCommitTitle : undefined}
          className="m-0 shrink-0 font-black text-black"
          style={{ fontSize: `${1.36 * titleScale}em`, lineHeight: 1.08 }}
        />
        <span aria-hidden className="mt-1 h-0 grow border-t border-dashed border-[#e4e4e4]" />
        <div className="absolute right-0 top-0 z-10">
          <SectionActions
            visible={isHovered}
            isTextOnly={isTextOnly}
            onAdd={onAddBlock}
            onDelete={onRequestDelete}
            dragProps={dragProps}
          />
        </div>
      </div>

      <SortableContext items={blockIds} strategy={rectSortingStrategy}>
        <div ref={dropRef}>
          {section.blocks.map((block, index) => (
            <LanmuBlock
              key={block.id}
              block={block}
              sectionId={section.id}
              index={index}
              total={section.blocks.length}
              lineHeight={lineHeight}
              spacingScale={spacingScale}
            />
          ))}
        </div>
      </SortableContext>

      <DeleteSectionDialog
        open={isDeleteDialogOpen}
        sectionTitle={displayTitle}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
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
  const setDragHandleRef = (element: HTMLButtonElement | null): void => {
    dragProps.ref(element)
  }
  const hasDragHandle = Boolean(dragProps.attributes || dragProps.listeners)
  const sortAttributes = (dragProps.attributes ?? {}) as Record<string, unknown>
  const sortListeners = (dragProps.listeners ?? {}) as Record<string, unknown>

  return (
    <div
      className="flex items-center gap-1 rounded border border-slate-200 bg-white px-1 py-0.5 shadow-sm transition-opacity print:hidden"
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
    >
      {!isTextOnly ? (
        <button type="button" className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100" title="添加" onClick={onAdd}>
          <Plus size={14} />
        </button>
      ) : null}
      <button type="button" className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600" title="删除" onClick={onDelete}>
        <Trash2 size={14} />
      </button>
      {hasDragHandle ? (
        <button
          type="button"
          ref={setDragHandleRef}
          {...sortAttributes}
          {...sortListeners}
          className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-slate-500 hover:bg-slate-100 active:cursor-grabbing"
          title="拖动"
        >
          <GripVertical size={14} />
        </button>
      ) : null}
    </div>
  )
}

function LanmuBlock(props: {
  readonly block: ResumeBlock
  readonly sectionId: string
  readonly index: number
  readonly total: number
  readonly lineHeight: number
  readonly spacingScale: number
}): ReactElement {
  const { block, sectionId, index, total, lineHeight, spacingScale } = props
  const bottom = index < total - 1 ? `${32 * spacingScale}px` : 0

  return (
    <div style={{ marginBottom: bottom }}>
      <LanmuBlockShell block={block} sectionId={sectionId} index={index} total={total}>
        <LanmuBlockBody block={block} lineHeight={lineHeight} />
      </LanmuBlockShell>
    </div>
  )
}

function LanmuBlockShell(props: {
  readonly block: ResumeBlock
  readonly sectionId: string
  readonly index: number
  readonly total: number
  readonly compact?: boolean
  readonly children: ReactNode
}): ReactElement {
  const { block, sectionId, index, total, compact, children } = props
  const addBlock = useAppStore((state) => state.addBlockByType)
  const deleteBlock = useAppStore((state) => state.deleteBlock)
  const moveBlockUp = useAppStore((state) => state.moveBlockUp)
  const moveBlockDown = useAppStore((state) => state.moveBlockDown)
  const [isEditing, setIsEditing] = useState(false)
  const { openPolish, openGenerate } = useAiSection()
  const moduleType = blockTypeToModuleType(block.type)
  const content = useMemo(() => extractBlockContentHtml(block), [block])

  return (
    <BlockWrapper
      blockType={getBlockTypeLabel(block.type)}
      onAdd={block.type !== 'text' ? (): void => addBlock(sectionId) : undefined}
      onPolish={moduleType ? (): void => openPolish(block.id, content, moduleType) : undefined}
      onGenerate={moduleType ? (): void => openGenerate(block.id, moduleType, block) : undefined}
      onDelete={(): void => deleteBlock(sectionId, block.id)}
      onMoveUp={index > 0 ? (): void => moveBlockUp(sectionId, block.id) : undefined}
      onMoveDown={index < total - 1 ? (): void => moveBlockDown(sectionId, block.id) : undefined}
      showDragHandle={false}
      disableHover={isEditing}
    >
      <div onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)} className={compact ? 'pb-1' : ''}>
        {children}
      </div>
    </BlockWrapper>
  )
}

function LanmuBlockBody(props: { readonly block: ResumeBlock; readonly lineHeight: number }): ReactElement {
  const { block, lineHeight } = props
  if (block.type === 'experience') {
    return (
      <article>
        <LanmuStructuredHead
          title={<EditableFieldWrapper blockId={block.id} fieldName="company" value={block.company ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />}
          subtitle={<EditableFieldWrapper blockId={block.id} fieldName="position" value={block.position ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />}
          date={<DateRange blockId={block.id} startDate={block.startDate ?? ''} endDate={block.endDate ?? ''} />}
          lineHeight={lineHeight}
        />
        <Label>工作内容</Label>
        <LanmuRichText blockId={block.id} field="contentHtml" lineHeight={lineHeight} />
      </article>
    )
  }

  if (block.type === 'project') {
    return (
      <article>
        <LanmuStructuredHead
          title={<EditableFieldWrapper blockId={block.id} fieldName="name" value={block.name ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />}
          subtitle={<EditableFieldWrapper blockId={block.id} fieldName="role" value={block.role ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />}
          date={<DateRange blockId={block.id} startDate={block.startDate ?? ''} endDate={block.endDate ?? ''} />}
          lineHeight={lineHeight}
        />
        <LanmuRichText blockId={block.id} field="contentHtml" lineHeight={lineHeight} />
      </article>
    )
  }

  if (block.type === 'campus') {
    return (
      <article>
        <LanmuStructuredHead
          title={<EditableFieldWrapper blockId={block.id} fieldName="organization" value={block.organization ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />}
          subtitle={<EditableFieldWrapper blockId={block.id} fieldName="position" value={block.position ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />}
          date={<DateRange blockId={block.id} startDate={block.startDate ?? ''} endDate={block.endDate ?? ''} />}
          lineHeight={lineHeight}
        />
        <LanmuRichText blockId={block.id} field="contentHtml" lineHeight={lineHeight} />
      </article>
    )
  }

  if (block.type === 'education') {
    return (
      <article>
        <LanmuStructuredHead
          title={<EditableFieldWrapper blockId={block.id} fieldName="school" value={block.school ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />}
          subtitle={(
            <span className="inline-flex flex-wrap items-baseline gap-3">
              <EditableFieldWrapper blockId={block.id} fieldName="major" value={block.major ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />
              <span aria-hidden className="text-[#bdbdbd]">|</span>
              <EditableFieldWrapper blockId={block.id} fieldName="degree" value={block.degree ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />
            </span>
          )}
          date={<DateRange blockId={block.id} startDate={block.startDate ?? ''} endDate={block.endDate ?? ''} />}
          lineHeight={lineHeight}
        />
        {block.courseHtml ? <LanmuRichText blockId={block.id} field="courseHtml" lineHeight={lineHeight} /> : null}
      </article>
    )
  }

  if (block.type === 'list') {
    return (
      <ul className="lanmu-body-text m-0 p-0" style={{ color: BODY, fontSize: '0.94em', lineHeight }}>
        {block.items.map((item) => (
          <li key={item.id} dangerouslySetInnerHTML={{ __html: item.html }} />
        ))}
      </ul>
    )
  }

  if (block.type === 'text') {
    return <LanmuRichText blockId={block.id} field="html" lineHeight={lineHeight} />
  }

  return <></>
}

function LanmuStructuredHead(props: {
  readonly title: ReactNode
  readonly subtitle: ReactNode
  readonly date: ReactNode
  readonly lineHeight: number
}): ReactElement {
  return (
    <div
      className="grid items-baseline"
      style={{
        gridTemplateColumns: 'minmax(0, 1fr) minmax(150px, auto)',
        columnGap: 18,
        lineHeight: props.lineHeight,
        marginBottom: 13,
      }}
    >
      <div className="flex min-w-0 items-baseline gap-3" style={{ color: BODY, fontSize: '0.98em', lineHeight: 1.2 }}>
        <h4 className="m-0 min-w-0 font-black text-black">
          {props.title}
        </h4>
        <span aria-hidden className="text-[#bdbdbd]">|</span>
        <span className="min-w-0 font-bold text-black">
          {props.subtitle}
        </span>
      </div>
      <div className="justify-self-end whitespace-nowrap" style={{ color: MUTED, fontSize: '0.9em', lineHeight: props.lineHeight }}>
        {props.date}
      </div>
    </div>
  )
}

function DateRange(props: { readonly blockId: string; readonly startDate: string; readonly endDate: string }): ReactElement {
  return (
    <span className="inline-flex items-center gap-0.5">
      <EditableDateField blockId={props.blockId} fieldName="startDate" value={props.startDate} />
      <span>-</span>
      <EditableDateField blockId={props.blockId} fieldName="endDate" value={props.endDate} />
    </span>
  )
}

function Label(props: { readonly children: ReactNode }): ReactElement {
  return (
    <h5 className="m-0 font-medium text-black" style={{ fontSize: '0.94em', lineHeight: 1.2, marginBottom: 10 }}>
      {props.children}
    </h5>
  )
}

function LanmuRichText(props: {
  readonly blockId: string
  readonly field: 'contentHtml' | 'courseHtml' | 'html'
  readonly lineHeight: number
  readonly fontSize?: string
}): ReactElement {
  return (
    <div className="lanmu-body-text" style={{ color: BODY, fontSize: props.fontSize ?? '0.94em', lineHeight: props.lineHeight }}>
      <EditableBlockWrapper
        blockId={props.blockId}
        contentField={props.field}
        contentSize="xs"
        className="!p-0 text-inherit hover:!bg-transparent [&_li]:!leading-[inherit] [&_ol]:!pl-[0.95em] [&_p]:!leading-[inherit] [&_ul]:!pl-[0.85em]"
        editingStyle={{ lineHeight: props.lineHeight }}
      />
    </div>
  )
}


