"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactElement, ReactNode } from 'react'
import { GripVertical, Plus, Trash2, XCircle } from 'lucide-react'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
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

const DEFAULT_PURPLE = '#7c3aed'
const SIGNATURE_FUCHSIA = '#d946ef'
const BODY = '#222222'
const MUTED = '#8c8f96'
const SANS = '"Inter", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'

type CssVars = CSSProperties & Record<`--${string}`, string | number>

function normalizeHexColor(value: string | undefined): string {
  if (!value) return DEFAULT_PURPLE
  const trimmed = value.trim()
  const shortHex = /^#([0-9a-f]{3})$/i.exec(trimmed)
  if (shortHex) {
    return `#${shortHex[1].split('').map((char) => `${char}${char}`).join('')}`.toLowerCase()
  }
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toLowerCase() : DEFAULT_PURPLE
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

function buildZijiPalette(themePrimaryColor: string | undefined): {
  readonly primary: string
  readonly heroGradient: string
  readonly panelBackground: string
} {
  const primary = normalizeHexColor(themePrimaryColor)
  const glow = mixHex(primary, SIGNATURE_FUCHSIA, 0.32)
  const heroMid = mixHex(primary, '#ffffff', 0.16)
  const heroEnd = mixHex(glow, '#ffffff', 0.08)
  const panelWash = mixHex(primary, '#ffffff', 0.82)
  const panelWashLight = mixHex(primary, '#ffffff', 0.9)
  const panelBottom = mixHex(glow, '#ffffff', 0.92)

  return {
    primary,
    heroGradient: `linear-gradient(106deg, ${primary} 0%, ${heroMid} 48%, ${heroEnd} 100%)`,
    panelBackground: `
      linear-gradient(180deg, rgba(255, 255, 255, 0) 0, rgba(255, 255, 255, 0.22) 34px, rgba(255, 255, 255, 0.74) 112px, #fff 178px, #fff 84%, ${panelBottom} 100%),
      linear-gradient(100deg, ${panelWash} 0%, ${panelWashLight} 58%, ${panelBottom} 100%)
    `,
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

export default function ZijiTemplate(props: TemplateProps): ReactElement {
  const { resume, theme, sidebarSectionIds: externalIds, onSidebarSectionIdsChange } = props
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null)
  const jobIntention = useEditableJobIntention(resume.jobIntention ?? null)
  const moveSection = useAppStore((state) => state.moveSection)
  const moveBlockInSection = useAppStore((state) => state.moveBlockInSection)
  const moveBlockToSection = useAppStore((state) => state.moveBlockToSection)
  const isJobIntentionVisible = resume.jobIntentionVisible ?? jobIntention.fields.length > 0
  const palette = useMemo(() => buildZijiPalette(theme.primaryColor), [theme.primaryColor])
  const primaryColor = palette.primary
  const titleScale = Math.min(1.2, Math.max(0.86, theme.titleScale ?? 1))
  const spacingScale = Math.max(0.72, theme.spacingScale)
  const contentLineHeight = Math.max(1.18, theme.lineHeight)
  const panelPadX = Math.max(42, mmToPx(theme.pagePaddingHorizontal) * 0.9)
  const panelPadTop = Math.max(32, mmToPx(theme.pagePaddingVertical) * 0.48)
  const panelPadBottom = Math.max(38, mmToPx(theme.pagePaddingVertical) * 0.58)
  const sideColumnWidth = Math.max(166, 174 + (panelPadX - 51) * 0.25)
  const railColumnWidth = 42
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
    '--ziji-purple': primaryColor,
    '--ziji-panel-pad-x': `${panelPadX}px`,
    '--ziji-panel-pad-top': `${panelPadTop}px`,
    '--ziji-rail-width': `${railColumnWidth}px`,
  }

  return (
    <ResumeFrame resume={resume} theme={theme} bleed disableDnd style={rootStyle}>
      <style>{`
        .ziji-root p { margin: 0; }
        .ziji-root ul, .ziji-root ol { margin: 0; padding-left: 1.2em; }
        .ziji-root li { margin: 0; }
        .ziji-avatar img { object-fit: contain !important; object-position: bottom center; }
        .ziji-body-text p,
        .ziji-body-text li { line-height: inherit !important; }
        @media print {
          .ziji-root { box-shadow: none !important; }
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
          return section ? <ZijiSectionOverlay section={section} primaryColor={primaryColor} /> : null
        }}
      >
        <div className="ziji-root" style={{ position: 'relative', minHeight: '297mm', overflow: 'hidden', backgroundColor: '#fff' }}>
          <div
            aria-hidden
            data-ziji-hero-backdrop="true"
            className="absolute inset-x-0 top-0"
            style={{
              height: 260,
              background: palette.heroGradient,
              zIndex: 0,
            }}
          />

          <ZijiHero
            header={header}
            title={header.baseInfo?.title || resume.jobIntention?.position || ''}
            heroGradient={palette.heroGradient}
          />

          <section
            data-template-padding-probe="true"
            data-ziji-panel="true"
            className="relative"
            style={{
              minHeight: 907,
              borderRadius: '18px 18px 0 0',
              marginTop: 0,
              padding: `${panelPadTop}px ${panelPadX}px ${panelPadBottom}px ${panelPadX}px`,
              zIndex: 2,
              overflow: 'hidden',
              background: palette.panelBackground,
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
                <aside data-ziji-column="left" style={{ paddingTop: 3, minHeight: 360 }}>
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
                          <ZijiSideSection
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
                  className="absolute top-1 bottom-0"
                  style={{
                    left: '50%',
                    width: 1,
                    backgroundColor: primaryColor,
                    opacity: 0.9,
                    transform: 'translateX(-50%)',
                  }}
                />
              </div>

              <ColumnDroppable id={COLUMN_RIGHT_ID}>
                <main data-ziji-column="right" className="relative" style={{ minHeight: 420, paddingLeft: 15 }}>
                  {rightSections.map((section, index) => (
                    <SortableSection key={section.id} sectionId={section.id}>
                      {(dragProps) => (
                        <ZijiMainSection
                          section={section}
                          dragProps={dragProps as DragHandleProps}
                          primaryColor={primaryColor}
                          titleScale={titleScale}
                          spacingScale={spacingScale}
                          lineHeight={contentLineHeight}
                          isFirst={index === 0}
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

function ZijiHero(props: {
  readonly header: EditableHeader
  readonly title: string
  readonly heroGradient: string
}): ReactElement {
  const { header, title, heroGradient } = props
  const metaFields = header.fields
  const role = title ? ` | ${title}` : ''

  return (
    <section
      className="relative overflow-visible"
      style={{
        height: 216,
        background: heroGradient,
        zIndex: 1,
      }}
    >
      <div
        aria-hidden
        className="absolute right-5 top-4 text-right font-black uppercase tracking-[2px] text-white/20"
        style={{ fontSize: 36, lineHeight: 0.92 }}
      >
        CAREER<br />NOTES
      </div>

      <AvatarSlot
        header={header}
        render={({ image, hovered }) => (
          <div
            className="ziji-avatar absolute overflow-visible"
            title="建议上传透明背景 PNG，头图效果更自然"
            style={{
              left: 42,
              top: 54,
              width: 180,
              height: 174,
            }}
          >
            {image}
            {hovered ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 bg-black/65 px-3 text-center text-white print:hidden">
                <div className="text-[11px] font-semibold leading-snug">
                  请上传透明背景 PNG
                </div>
                <div className="text-[9px] leading-snug text-white/85">
                  普通证件照会露出白底
                </div>
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

      <div className="absolute text-white" style={{ left: 252, right: 42, top: 88 }}>
        <div className="font-extrabold tracking-normal" style={{ fontSize: '2.25em', lineHeight: 1 }}>
          Hello,I'm
        </div>
        <EditableText
          as="h1"
          value={header.name}
          onCommit={header.onCommitName}
          className="m-0 mt-2 font-extrabold text-white"
          style={{ fontSize: '2.18em', lineHeight: 1 }}
          placeholder="姓名"
        />
        <div
          data-template-base-info-trigger="true"
          role="button"
          tabIndex={0}
          className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-left font-medium text-white/90 print:cursor-default"
          style={{ fontSize: '0.86em', lineHeight: 1.25 }}
          onClick={header.openEditModal}
          onKeyDown={(event) => runClickActionOnKey(event, header.openEditModal)}
        >
          {metaFields.length > 0 ? (
            <>
              {metaFields.map((field, index) => (
                <FieldChip key={field.key} field={field} header={header} deleteColor="#ffffff" className="whitespace-nowrap">
                  <span>{index > 0 ? ' | ' : ''}{field.label}：{field.value}</span>
                </FieldChip>
              ))}
              {role ? <span className="whitespace-nowrap">{role}</span> : null}
            </>
          ) : (
            <span>点击完善电话、邮箱、城市等基础信息</span>
          )}
        </div>
      </div>
    </section>
  )
}

function SideTitle(props: { readonly children: ReactNode }): ReactElement {
  return (
    <h3
      className="relative m-0 font-black text-black"
      style={{ fontSize: '1.32em', lineHeight: 1.05, marginBottom: 18 }}
    >
      <span
        aria-hidden
        className="absolute rotate-45"
        style={{
          left: -16,
          top: 6,
          width: 7,
          height: 7,
          backgroundColor: 'var(--ziji-purple)',
        }}
      />
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
        style={{ fontSize: '1.02em', lineHeight, overflowWrap: 'anywhere' }}
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
      style={{ color: MUTED, fontSize: '0.88em', lineHeight, overflowWrap: 'anywhere' }}
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

function ZijiSideSection(props: {
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
      className="group/ziji-side-section relative"
      style={{ marginBottom: 10 * spacingScale }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative" style={{ marginBottom: 16 * spacingScale }}>
        <span
          aria-hidden
          className="absolute rotate-45"
          style={{
            left: -16,
            top: 6,
            width: 7,
            height: 7,
            backgroundColor: 'var(--ziji-purple)',
          }}
        />
        <EditableText
          as="h3"
          value={displayTitle}
          onCommit={canEditTitle ? onCommitTitle : undefined}
          className="m-0 font-black text-black"
          style={{ fontSize: `${1.32 * titleScale}em`, lineHeight: 1.05 }}
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
            <ZijiSideBlock
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

function ZijiSideBlock(props: {
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
    <ZijiBlockShell block={block} sectionId={sectionId} index={index} total={total} compact>
      <ZijiSideBlockBody block={block} lineHeight={lineHeight} />
    </ZijiBlockShell>
  )
}

function ZijiSideBlockBody(props: { readonly block: ResumeBlock; readonly lineHeight: number }): ReactElement {
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
        <ZijiRichText blockId={block.id} field="contentHtml" lineHeight={lineHeight} fontSize="0.84em" />
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
        <ZijiRichText blockId={block.id} field="contentHtml" lineHeight={lineHeight} fontSize="0.84em" />
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
        <ZijiRichText blockId={block.id} field="contentHtml" lineHeight={lineHeight} fontSize="0.84em" />
      </article>
    )
  }

  if (block.type === 'list') {
    return (
      <ul className="ziji-body-text m-0 p-0" style={{ color: BODY, fontSize: '0.84em', lineHeight }}>
        {block.items.map((item) => (
          <li key={item.id} dangerouslySetInnerHTML={{ __html: item.html }} />
        ))}
      </ul>
    )
  }

  if (block.type === 'text') {
    return <ZijiRichText blockId={block.id} field="html" lineHeight={lineHeight} fontSize="0.84em" />
  }

  return <ZijiBlockBody block={block} lineHeight={lineHeight} />
}

function ZijiSectionOverlay(props: { readonly section: Section; readonly primaryColor: string }): ReactElement {
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
    <ZijiBlockShell block={block} sectionId={sectionId} index={index} total={total} compact>
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
          <div className="ziji-body-text mt-2" style={{ color: MUTED, fontSize: '0.84em', lineHeight }}>
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
    </ZijiBlockShell>
  )
}

function ZijiMainSection(props: {
  readonly section: Section
  readonly dragProps: DragHandleProps
  readonly primaryColor: string
  readonly titleScale: number
  readonly spacingScale: number
  readonly lineHeight: number
  readonly isFirst: boolean
}): ReactElement {
  const { section, dragProps, primaryColor, titleScale, spacingScale, lineHeight, isFirst } = props
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
      className="group/ziji-section relative"
      style={{ marginBottom: isSelfSection(section) ? `${32 * spacingScale}px` : `${42 * spacingScale}px` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        aria-hidden
        className="absolute rotate-45"
        style={{
          left: -39,
          top: isFirst ? 4 : 8,
          width: 10,
          height: 10,
          backgroundColor: primaryColor,
        }}
      />
      <div className="relative" style={{ marginBottom: 18 * spacingScale }}>
        <EditableText
          as="h2"
          value={displayTitle}
          onCommit={canEditTitle ? onCommitTitle : undefined}
          className="m-0 font-black text-black"
          style={{ fontSize: `${1.34 * titleScale}em`, lineHeight: 1.05 }}
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
        <div ref={dropRef}>
          {section.blocks.map((block, index) => (
            <ZijiBlock
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

function ZijiBlock(props: {
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
      <ZijiBlockShell block={block} sectionId={sectionId} index={index} total={total}>
        <ZijiBlockBody block={block} lineHeight={lineHeight} />
      </ZijiBlockShell>
    </div>
  )
}

function ZijiBlockShell(props: {
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

function ZijiBlockBody(props: { readonly block: ResumeBlock; readonly lineHeight: number }): ReactElement {
  const { block, lineHeight } = props
  if (block.type === 'experience') {
    return (
      <article>
        <ZijiStructuredHead
          title={<EditableFieldWrapper blockId={block.id} fieldName="company" value={block.company ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />}
          subtitle={<EditableFieldWrapper blockId={block.id} fieldName="position" value={block.position ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />}
          date={<DateRange blockId={block.id} startDate={block.startDate ?? ''} endDate={block.endDate ?? ''} />}
          lineHeight={lineHeight}
        />
        <Label>工作内容</Label>
        <ZijiRichText blockId={block.id} field="contentHtml" lineHeight={lineHeight} />
      </article>
    )
  }

  if (block.type === 'project') {
    return (
      <article>
        <ZijiStructuredHead
          title={<EditableFieldWrapper blockId={block.id} fieldName="name" value={block.name ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />}
          subtitle={<EditableFieldWrapper blockId={block.id} fieldName="role" value={block.role ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />}
          date={<DateRange blockId={block.id} startDate={block.startDate ?? ''} endDate={block.endDate ?? ''} />}
          lineHeight={lineHeight}
        />
        <ZijiRichText blockId={block.id} field="contentHtml" lineHeight={lineHeight} />
      </article>
    )
  }

  if (block.type === 'campus') {
    return (
      <article>
        <ZijiStructuredHead
          title={<EditableFieldWrapper blockId={block.id} fieldName="organization" value={block.organization ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />}
          subtitle={<EditableFieldWrapper blockId={block.id} fieldName="position" value={block.position ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />}
          date={<DateRange blockId={block.id} startDate={block.startDate ?? ''} endDate={block.endDate ?? ''} />}
          lineHeight={lineHeight}
        />
        <ZijiRichText blockId={block.id} field="contentHtml" lineHeight={lineHeight} />
      </article>
    )
  }

  if (block.type === 'education') {
    return (
      <article>
        <ZijiStructuredHead
          title={<EditableFieldWrapper blockId={block.id} fieldName="school" value={block.school ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />}
          subtitle={<EditableFieldWrapper blockId={block.id} fieldName="major" value={block.major ?? ''} onUpdate={() => {}} className="!px-0 !leading-[inherit]" />}
          date={<DateRange blockId={block.id} startDate={block.startDate ?? ''} endDate={block.endDate ?? ''} />}
          lineHeight={lineHeight}
        />
        {block.courseHtml ? <ZijiRichText blockId={block.id} field="courseHtml" lineHeight={lineHeight} /> : null}
      </article>
    )
  }

  if (block.type === 'list') {
    return (
      <ul className="ziji-body-text m-0 p-0" style={{ color: BODY, fontSize: '0.94em', lineHeight }}>
        {block.items.map((item) => (
          <li key={item.id} dangerouslySetInnerHTML={{ __html: item.html }} />
        ))}
      </ul>
    )
  }

  if (block.type === 'text') {
    return <ZijiRichText blockId={block.id} field="html" lineHeight={lineHeight} />
  }

  return <></>
}

function ZijiStructuredHead(props: {
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
        columnGap: 20,
        lineHeight: props.lineHeight,
        marginBottom: 11,
      }}
    >
      <h4 className="m-0 font-black text-black" style={{ gridColumn: '1 / 3', fontSize: '1.06em', lineHeight: 1.15, marginBottom: 12 }}>
        {props.title}
      </h4>
      <div style={{ color: MUTED, fontSize: '0.94em', lineHeight: props.lineHeight }}>
        {props.subtitle}
      </div>
      <div className="justify-self-start whitespace-nowrap" style={{ color: MUTED, fontSize: '0.9em', lineHeight: props.lineHeight }}>
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

function ZijiRichText(props: {
  readonly blockId: string
  readonly field: 'contentHtml' | 'courseHtml' | 'html'
  readonly lineHeight: number
  readonly fontSize?: string
}): ReactElement {
  return (
    <div className="ziji-body-text" style={{ color: BODY, fontSize: props.fontSize ?? '0.94em', lineHeight: props.lineHeight }}>
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
