"use client"

/**
 * 码上 — Mashang (flagship for software engineers)
 *
 * 面向开发 / 算法 / 技术岗的旗舰模板。
 *
 * 设计语言（克制版）：
 *  - 开发者气质通过「等宽字体点缀 + 章节编号 + 面包屑」传达，
 *    而非整页终端风，避免与其他模块风格冲突
 *  - 主色（默认代码绿）覆盖：左侧 Hero bar、头像描边、姓名下划线、
 *    章节编号、缩进引导线、chip label、求职意向 label、hover 按钮框
 *  - 第二色琥珀仅用于「期望薪资」的强调，保持克制
 *
 * 品牌色为代码绿 emerald，主题面板可自定义 primaryColor（会自动衍生 deep/light）。
 */
import { createContext, useContext } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { getHeaderJobIntentionText } from '@/entities/resume/header-job-intention'
import type { Section } from '@/entities/resume/section'
import { RESUME_FONT_STACKS } from '@/entities/theme/font-stacks'
import {
  ResumeFrame, SortableSection, BlockList, DeleteSectionDialog,
  AvatarSlot, FieldChip, EditableText,
  useEditableHeader, useEditableSection, useEditableJobIntention, usePagePadding,
  lightenHex, darkenHex,
} from '@/templates/_core'
import type { EditableJobIntention } from '@/templates/_core'
import type { TemplateProps } from '@/templates/_core'

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
const MASHANG_DEFAULT_CODE = '#10b981'

const MASHANG_STATIC = {
  amber: '#d97706',    // 琥珀（期望薪资强调，略偏深以保证打印可读性）
  ink: '#0f172a',
  mute: '#64748b',
  rule: '#e5e7eb',
  ruleStrong: '#cbd5e1',
  paper: '#ffffff',
  chipBg: '#ecfdf5',
} as const

interface MashangPalette {
  readonly code: string
  readonly codeDeep: string
  readonly codeLight: string
  readonly codeBg: string
  readonly amber: string
  readonly ink: string
  readonly mute: string
  readonly rule: string
  readonly ruleStrong: string
  readonly paper: string
  readonly chipBg: string
}

function buildPalette(primaryColor: string): MashangPalette {
  const code: string = /^#([0-9a-f]{3}){1,2}$/i.test(primaryColor) ? primaryColor : MASHANG_DEFAULT_CODE
  return {
    code,
    codeDeep: darkenHex(code, 0.72),
    codeLight: lightenHex(code, 0.78),
    codeBg: lightenHex(code, 0.92),
    ...MASHANG_STATIC,
  }
}

const DEFAULT_PALETTE: MashangPalette = buildPalette(MASHANG_DEFAULT_CODE)
const PaletteCtx = createContext<MashangPalette>(DEFAULT_PALETTE)
const usePalette = (): MashangPalette => useContext(PaletteCtx)

const MONO = '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, Consolas, monospace'
const SANS = RESUME_FONT_STACKS.sans

// ---------------------------------------------------------------------------
// Section tag heuristic
// ---------------------------------------------------------------------------
function resolveSectionTag(section: Section): string {
  const t: string = section.title.toLowerCase()
  if (t.includes('教育') || t.includes('学历')) return 'education'
  if (t.includes('工作') || t.includes('实习') || t.includes('经历')) return 'experience'
  if (t.includes('项目')) return 'projects'
  if (t.includes('技能') || t.includes('栈')) return 'skills'
  if (t.includes('开源') || t.includes('github')) return 'open-source'
  if (t.includes('证书')) return 'certificates'
  if (t.includes('获奖') || t.includes('荣誉')) return 'awards'
  if (t.includes('自我') || t.includes('评价') || t.includes('简介')) return 'about'
  return 'section'
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
export default function MashangTemplate(props: TemplateProps): ReactElement {
  const { resume, theme } = props
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null)
  const objective = useEditableJobIntention(resume.jobIntention ?? null)
  const jobIntentionVisible: boolean = resume.jobIntentionVisible ?? Boolean(resume.jobIntention)
  const pagePad = usePagePadding(theme, 26, 38)
  const palette: MashangPalette = buildPalette(theme.primaryColor)

  return (
    <PaletteCtx.Provider value={palette}>
      <ResumeFrame
        resume={resume}
        theme={theme}
        className="mashang-resume-root"
        style={{ backgroundColor: palette.paper, color: palette.ink, fontFamily: theme.fontFamily || SANS }}
      >
        <style>{`
          @media print {
            .mashang-resume-root { overflow: visible !important; }
            .mashang-page-content { padding-bottom: 0 !important; }
          }
        `}</style>
        {/* ——— HERO —————————————————————————————————————— */}
        <MashangHero header={header} title={getHeaderJobIntentionText(resume)} horizontalPadding={pagePad.paddingLeft as number} />

        {/* ——— OBJECTIVE ——————————————————————————————— */}
        {jobIntentionVisible && objective.jobIntention && (
          <ObjectiveSection
            objective={objective}
            horizontalPadding={pagePad.paddingLeft as number}
            spacingScale={theme.spacingScale}
          />
        )}

        {/* ——— MAIN SECTIONS ————————————————————————— */}
        <main
          data-template-padding-probe="true"
          className="mashang-page-content"
          style={{
            ...pagePad,
            paddingTop: jobIntentionVisible ? 10 * theme.spacingScale : pagePad.paddingTop,
            display: 'flex',
            flexDirection: 'column',
            gap: 28 * theme.spacingScale,
          }}
        >
          {resume.sections.map((section: Section, i: number) => (
            <SortableSection key={section.id} sectionId={section.id}>
              {(dragProps) => (
                <MashangSection
                  section={section}
                  index={i + 1}
                  dragRef={dragProps.ref}
                  dragAttrs={dragProps.attributes}
                  dragListeners={dragProps.listeners}
                  themeColor={theme.primaryColor}
                  spacingScale={theme.spacingScale}
                />
              )}
            </SortableSection>
          ))}
        </main>

        {header.modals}
        {objective.modals}
      </ResumeFrame>
    </PaletteCtx.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hero — light resume paper with left brand bar + mono breadcrumb
// ---------------------------------------------------------------------------
interface HeroProps {
  readonly header: ReturnType<typeof useEditableHeader>
  readonly title: string
  readonly horizontalPadding: number
}

function MashangHero({ header, title, horizontalPadding }: HeroProps): ReactElement {
  const palette = usePalette()
  const { name, onCommitName, fields, openEditModal } = header
  const filename: string = name ? `${name.toLowerCase().replace(/\s+/g, '-')}.md` : 'resume.md'

  return (
    <header
      className="relative group cursor-pointer"
      onClick={openEditModal}
      style={{
        padding: `2.2em ${horizontalPadding}px 1.6em`,
        background: `linear-gradient(180deg, ${palette.codeBg} 0%, ${palette.paper} 100%)`,
      }}
    >
      {/* Left brand bar */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          backgroundColor: palette.code,
        }}
      />

      {/* Breadcrumb (mono) */}
      <div
        style={{
          fontFamily: MONO,
          fontSize: '0.74em',
          color: palette.mute,
          letterSpacing: '0.04em',
          marginBottom: '1em',
        }}
      >
        <span style={{ color: palette.code }}>~</span>
        <span> / resume / </span>
        <span style={{ color: palette.ink, fontWeight: 500 }}>{filename}</span>
      </div>

      <div className="flex items-start gap-6">
        {/* Name + title + base info */}
        <div className="flex-1 min-w-0">
          <EditableText
            as="h1"
            value={name}
            onCommit={onCommitName}
            style={{
              fontSize: '2.3em',
              fontWeight: 700,
              color: palette.ink,
              letterSpacing: '0.005em',
              lineHeight: 1.1,
              borderBottom: `3px solid ${palette.code}`,
              display: 'inline-block',
              paddingBottom: '0.08em',
            }}
          />
          {title && (
            <div
              style={{
                fontFamily: MONO,
                fontSize: '0.92em',
                color: palette.codeDeep,
                marginTop: '0.55em',
                letterSpacing: '0.01em',
              }}
            >
              <span style={{ color: palette.mute, marginRight: '0.4em' }}>role:</span>
              {title}
            </div>
          )}
          {fields.length > 0 && (
            <div
              className="flex flex-wrap"
              style={{
                gap: '6px 20px',
                marginTop: '1em',
                fontSize: '0.88em',
              }}
            >
              {fields.map((f) => (
                <FieldChip
                  key={f.key}
                  field={f}
                  header={header}
                  deleteColor={palette.amber}
                  className="inline-flex items-baseline gap-1.5"
                >
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: '0.92em',
                      color: palette.code,
                    }}
                  >
                    {f.label}
                  </span>
                  <span style={{ color: palette.ink, fontWeight: 500 }}>{f.value}</span>
                </FieldChip>
              ))}
            </div>
          )}
        </div>

        {/* Avatar — 标准证件照比例 5:7 */}
        <AvatarSlot
          header={header}
          render={({ image, uploadOverlay }) => (
            <div
              className="relative overflow-hidden shrink-0"
              style={{
                width: 92,
                height: 129,
                borderRadius: 8,
                border: `2px solid ${palette.code}`,
                boxShadow: `0 0 0 4px ${palette.codeBg}`,
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

// ---------------------------------------------------------------------------
// Objective — aligned with section visual language
// ---------------------------------------------------------------------------
interface ObjectiveProps {
  readonly objective: EditableJobIntention
  readonly horizontalPadding: number
  readonly spacingScale: number
}

function ObjectiveSection(props: ObjectiveProps): ReactElement {
  const palette = usePalette()
  const { objective, horizontalPadding, spacingScale } = props
  const { fields, openEditModal, deleteField, hoveredField, setHoveredField } = objective

  return (
    <section
      className="relative group cursor-pointer"
      onClick={openEditModal}
      style={{ padding: `${18 * spacingScale}px ${horizontalPadding}px ${8 * spacingScale}px` }}
    >
      {/* Heading (matches section style, uses 00/ prefix) */}
      <div
        className="flex items-baseline gap-3"
        style={{ marginBottom: '0.6em' }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: '1.15em',
            fontWeight: 700,
            color: palette.code,
          }}
        >
          00/
        </span>
        <h2 style={{ margin: 0, fontSize: '1.1em', fontWeight: 600, lineHeight: 1.2, color: palette.codeDeep }}>
          求职意向
        </h2>
        <span
          style={{
            fontFamily: MONO,
            fontSize: '0.78em',
            color: palette.code,
            letterSpacing: '0.04em',
          }}
        >
          objective
        </span>
        <span style={{ flex: 1, height: 1, backgroundColor: palette.codeLight }} />
      </div>

      {/* Absolute-positioned edit button */}
      <button
        type="button"
        className="opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
        onClick={(e) => { e.stopPropagation(); openEditModal() }}
        style={{
          position: 'absolute',
          top: 6,
          right: horizontalPadding,
          fontFamily: MONO,
          fontSize: '0.78em',
          color: palette.code,
          padding: '2px 10px',
          border: `1px solid ${palette.code}`,
          borderRadius: 4,
          background: palette.paper,
          zIndex: 5,
        }}
      >
        edit
      </button>

      {/* Fields */}
      <div
        className="flex flex-wrap"
        style={{ paddingLeft: 22, gap: '6px 22px', fontSize: '0.95em' }}
      >
        {fields.map((f) => {
          const isHover: boolean = hoveredField === f.key
          return (
            <span
              key={f.key}
              className="relative inline-flex items-baseline"
              style={{ gap: '0.5em' }}
              onMouseEnter={() => setHoveredField(f.key)}
              onMouseLeave={() => setHoveredField(null)}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: '0.88em',
                  color: palette.code,
                }}
              >
                {f.label}
              </span>
              <span style={{ fontWeight: 500, color: palette.ink }}>
                {f.value}
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); deleteField(f.key) }}
                className="print:hidden"
                style={{
                  position: 'absolute',
                  top: -8,
                  right: -10,
                  color: '#ef4444',
                  lineHeight: 1,
                  fontSize: 14,
                  background: palette.paper,
                  borderRadius: 999,
                  width: 16,
                  height: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isHover ? 1 : 0,
                  pointerEvents: isHover ? 'auto' : 'none',
                  transition: 'opacity 120ms ease',
                  zIndex: 5,
                }}
                aria-label={`删除${f.label}`}
              >
                ×
              </button>
            </span>
          )
        })}
        {fields.length === 0 && (
          <span style={{ color: palette.mute, fontStyle: 'italic' }}>点击编辑求职意向…</span>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Section — numbered heading + dashed indent guide
// ---------------------------------------------------------------------------
interface SectionProps {
  readonly section: Section
  readonly index: number
  readonly dragRef: (el: HTMLElement | null) => void
  readonly dragAttrs: unknown
  readonly dragListeners: unknown
  readonly themeColor: string
  readonly spacingScale: number
}

function MashangSection(props: SectionProps): ReactElement {
  const palette = usePalette()
  const { section, index, dragRef, dragAttrs, dragListeners, themeColor, spacingScale } = props
  const editable = useEditableSection(section)
  const {
    title, canEditTitle, onCommitTitle,
    isTextOnly, onAddBlock, onRequestDelete,
    isHovered, setHovered,
    isDeleteDialogOpen, setDeleteDialogOpen, confirmDelete,
  } = editable
  const tag: string = resolveSectionTag(section)
  const idx: string = String(index).padStart(2, '0')

  return (
    <section
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Heading */}
      <div
        className="flex items-baseline gap-3"
        style={{ marginBottom: '0.7em' }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: '1.15em',
            fontWeight: 700,
            color: palette.code,
          }}
        >
          {idx}/
        </span>
        <EditableText
          as="h2"
          value={title}
          onCommit={canEditTitle ? onCommitTitle : undefined}
          className="font-semibold"
          style={{ margin: 0, fontSize: '1.1em', lineHeight: 1.2, color: palette.codeDeep }}
        />
        <span
          style={{
            fontFamily: MONO,
            fontSize: '0.78em',
            color: palette.code,
            letterSpacing: '0.04em',
          }}
        >
          {tag}
        </span>
        <span style={{ flex: 1, height: 1, backgroundColor: palette.codeLight }} />
      </div>

      {/* Hover actions — absolutely positioned */}
      <MashangHoverActions
        visible={isHovered}
        canAdd={!isTextOnly}
        onAdd={onAddBlock}
        onDelete={onRequestDelete}
        dragRef={dragRef}
        dragAttrs={dragAttrs}
        dragListeners={dragListeners}
      />

      {/* Block list with brand-colored indent guide */}
      <div
        style={{
          paddingLeft: 22,
          borderLeft: `1px dashed ${palette.codeLight}`,
          marginLeft: 6,
        }}
      >
        <BlockList section={editable} themeColor={themeColor} spacingScale={spacingScale} />
      </div>

      <DeleteSectionDialog
        open={isDeleteDialogOpen}
        sectionTitle={title}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
      />
    </section>
  )
}

// ---------------------------------------------------------------------------
// Hover action bar
// ---------------------------------------------------------------------------
interface HoverActionsProps {
  readonly visible: boolean
  readonly canAdd: boolean
  readonly onAdd: () => void
  readonly onDelete: () => void
  readonly dragRef: (el: HTMLElement | null) => void
  readonly dragAttrs: unknown
  readonly dragListeners: unknown
}

function MashangHoverActions(props: HoverActionsProps): ReactElement {
  const palette = usePalette()
  const { visible, canAdd, onAdd, onDelete, dragRef, dragAttrs, dragListeners } = props
  return (
    <div
      className="flex items-center gap-1 print:hidden"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: palette.paper,
        border: `1px solid ${palette.code}`,
        borderRadius: 4,
        padding: '2px 4px',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 120ms ease',
        zIndex: 5,
      }}
    >
      {canAdd && <MashangIconBtn label="+" onClick={onAdd} />}
      <MashangIconBtn label="×" onClick={onDelete} danger />
      <button
        type="button"
        ref={dragRef}
        {...(dragAttrs as Record<string, unknown>)}
        {...(dragListeners as Record<string, unknown>)}
        className="h-5 w-5 text-xs cursor-grab active:cursor-grabbing flex items-center justify-center"
        style={{ color: palette.code }}
        title="拖动"
        aria-label="拖动"
      >
        ⋮⋮
      </button>
    </div>
  )
}

function MashangIconBtn(p: { label: string; onClick: () => void; danger?: boolean }): ReactNode {
  const palette = usePalette()
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); p.onClick() }}
      className="h-5 w-5 flex items-center justify-center font-bold"
      style={{
        fontSize: 14,
        color: p.danger ? '#dc2626' : palette.code,
      }}
      title={p.label}
    >
      {p.label}
    </button>
  )
}
