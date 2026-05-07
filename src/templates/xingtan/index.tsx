"use client"

/**
 * 杏坛 — Xingtan (flagship for teachers / academic / education roles)
 *
 * 「杏坛」语出《庄子·渔父》—— 孔子讲学之所，后指教育界。
 *
 * 面向教师、高校教职、科研、教育培训岗的旗舰模板。
 *
 * 设计语言：
 *  - 古籍卷首双实线 banner 包裹 Hero，呼应线装书版式
 *  - 章节标题用「第壹章 / 第贰章」章回体，替代工程感的 `01/ 02/`
 *  - 姓名使用书法风显示字体（ZCOOL XiaoWei），正文 Noto Serif SC
 *  - 杏黄色作为品牌色，松烟墨（近黑）作为固定正文色
 *  - 每个 section 标题旁有一枚小小的「章」字杏黄圆印
 *
 * 推荐品牌色为杏黄 amber-700，可自定义。
 */
import { createContext, useContext } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { Section } from '@/entities/resume/section'
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
const XINGTAN_DEFAULT_AMBER = '#a16207'

const XINGTAN_STATIC = {
  ink: '#1c1917',
  inkSoft: '#44403c',
  mute: '#78716c',
  rule: '#e7e5e4',
  paper: '#fbf9f3',  // 略带米黄的宣纸色
} as const

interface XingtanPalette {
  readonly amber: string
  readonly amberDeep: string
  readonly amberLight: string
  readonly amberBg: string
  readonly ink: string
  readonly inkSoft: string
  readonly mute: string
  readonly rule: string
  readonly paper: string
}

function buildPalette(primaryColor: string): XingtanPalette {
  const amber: string = /^#([0-9a-f]{3}){1,2}$/i.test(primaryColor) ? primaryColor : XINGTAN_DEFAULT_AMBER
  return {
    amber,
    amberDeep: darkenHex(amber, 0.7),
    amberLight: lightenHex(amber, 0.7),
    amberBg: lightenHex(amber, 0.9),
    ...XINGTAN_STATIC,
  }
}

const DEFAULT_PALETTE: XingtanPalette = buildPalette(XINGTAN_DEFAULT_AMBER)
const PaletteCtx = createContext<XingtanPalette>(DEFAULT_PALETTE)
const usePalette = (): XingtanPalette => useContext(PaletteCtx)

const SERIF = '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", "Lora", Georgia, serif'
const CALLIGRAPHY = '"ZCOOL XiaoWei", "Ma Shan Zheng", "Noto Serif SC", "Songti SC", serif'
const SERIF_LATIN = '"Lora", "Noto Serif SC", Georgia, serif'

// ---------------------------------------------------------------------------
// Chinese numeral (1..20)
// ---------------------------------------------------------------------------
const CN_NUMERALS: readonly string[] = [
  '', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾',
  '拾壹', '拾贰', '拾叁', '拾肆', '拾伍', '拾陆', '拾柒', '拾捌', '拾玖', '贰拾',
]

function toChineseNumeral(n: number): string {
  if (n >= 1 && n < CN_NUMERALS.length) return CN_NUMERALS[n]
  return String(n)
}

// ---------------------------------------------------------------------------
// Section english tag
// ---------------------------------------------------------------------------
function resolveSectionTag(section: Section): string {
  const t: string = section.title.toLowerCase()
  if (t.includes('教育') || t.includes('学历')) return 'Education'
  if (t.includes('工作') || t.includes('经历')) return 'Experience'
  if (t.includes('教学')) return 'Teaching'
  if (t.includes('科研') || t.includes('研究')) return 'Research'
  if (t.includes('论文') || t.includes('发表') || t.includes('出版')) return 'Publications'
  if (t.includes('项目')) return 'Projects'
  if (t.includes('课题')) return 'Grants'
  if (t.includes('技能')) return 'Skills'
  if (t.includes('证书')) return 'Certificates'
  if (t.includes('获奖') || t.includes('荣誉')) return 'Honors'
  if (t.includes('自我') || t.includes('评价') || t.includes('简介')) return 'Profile'
  return ''
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
export default function XingtanTemplate(props: TemplateProps): ReactElement {
  const { resume, theme } = props
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null)
  const objective = useEditableJobIntention(resume.jobIntention ?? null)
  const jobIntentionVisible: boolean = resume.jobIntentionVisible ?? Boolean(resume.jobIntention)
  const pagePad = usePagePadding(theme, 30, 42)
  const palette: XingtanPalette = buildPalette(theme.primaryColor)

  return (
    <PaletteCtx.Provider value={palette}>
      <ResumeFrame
        resume={resume}
        theme={theme}
        bleed
        style={{ backgroundColor: palette.paper, color: palette.ink, fontFamily: SERIF }}
      >
        {/* ——— HERO (古籍卷首) ——————————————————————— */}
        <XingtanHero header={header} horizontalPadding={pagePad.paddingLeft as number} />

        {/* ——— OBJECTIVE ————————————————————————————— */}
        {jobIntentionVisible && objective.jobIntention && (
          <ObjectiveSection
            objective={objective}
            horizontalPadding={pagePad.paddingLeft as number}
            spacingScale={theme.spacingScale}
          />
        )}

        {/* ——— MAIN SECTIONS ———————————————————————— */}
        <main
          style={{
            ...pagePad,
            paddingTop: jobIntentionVisible ? 10 * theme.spacingScale : pagePad.paddingTop,
            display: 'flex',
            flexDirection: 'column',
            gap: 32 * theme.spacingScale,
          }}
        >
          {resume.sections.map((section: Section, i: number) => (
            <SortableSection key={section.id} sectionId={section.id}>
              {(dragProps) => (
                <XingtanSection
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
// Hero — 古籍卷首式 banner
// ---------------------------------------------------------------------------
interface HeroProps {
  readonly header: ReturnType<typeof useEditableHeader>
  readonly horizontalPadding: number
}

function XingtanHero({ header, horizontalPadding }: HeroProps): ReactElement {
  const palette = usePalette()
  const { name, onCommitName, fields, openEditModal, baseInfo } = header
  const title: string = baseInfo?.title ?? ''

  return (
    <header
      className="relative group cursor-pointer"
      onClick={openEditModal}
      style={{
        padding: `${horizontalPadding}px ${horizontalPadding}px 1.6em`,
      }}
    >
      {/* 上双实线 banner */}
      <XingtanDoubleRule />

      {/* 古籍式标语（CV · 履歷） */}
      <div
        style={{
          textAlign: 'center',
          fontFamily: SERIF_LATIN,
          fontSize: '0.82em',
          color: palette.amber,
          letterSpacing: '0.5em',
          padding: '0.8em 0 1.4em',
        }}
      >
        CURRICULUM&nbsp;·&nbsp;VITAE
      </div>

      <div className="flex items-start gap-8" style={{ marginBottom: '1em' }}>
        <div className="flex-1 min-w-0">
          <EditableText
            as="h1"
            value={name}
            onCommit={onCommitName}
            style={{
              fontSize: '3em',
              fontWeight: 400,
              color: palette.ink,
              fontFamily: CALLIGRAPHY,
              letterSpacing: '0.14em',
              lineHeight: 1.1,
            }}
          />
          {title && (
            <div
              style={{
                fontSize: '1em',
                color: palette.inkSoft,
                fontFamily: SERIF,
                letterSpacing: '0.12em',
                marginTop: '0.5em',
              }}
            >
              {title}
            </div>
          )}

          {/* 基本信息 — 紧随姓名左对齐 */}
          {fields.length > 0 && (
            <div
              className="flex flex-wrap"
              style={{
                gap: '4px 0',
                fontSize: '0.9em',
                color: palette.inkSoft,
                marginTop: '1em',
              }}
            >
              {fields.map((f, i) => (
                <span key={f.key} className="inline-flex items-center">
                  {i > 0 && (
                    <span
                      aria-hidden
                      style={{
                        color: palette.amber,
                        margin: '0 0.8em',
                        fontSize: '0.55em',
                        lineHeight: 1,
                      }}
                    >
                      ◆
                    </span>
                  )}
                  <FieldChip
                    field={f}
                    header={header}
                    deleteColor={palette.amber}
                    className="inline-flex items-baseline gap-1.5"
                  >
                    <span style={{ color: palette.mute, letterSpacing: '0.08em' }}>{f.label}</span>
                    <span style={{ color: palette.ink, fontWeight: 500 }}>{f.value}</span>
                  </FieldChip>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 头像 — 古朴相框 */}
        <AvatarSlot
          header={header}
          render={({ image, uploadOverlay }) => (
            <div
              className="relative overflow-hidden shrink-0"
              style={{
                width: 100,
                height: 140,
                padding: 5,
                backgroundColor: palette.paper,
                border: `1px solid ${palette.amber}`,
                boxShadow: `0 0 0 3px ${palette.paper}, 0 0 0 4px ${palette.amber}`,
              }}
            >
              <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
                {image}
              </div>
              {uploadOverlay}
            </div>
          )}
        />
      </div>

      {/* 下双实线 banner */}
      <XingtanDoubleRule />
    </header>
  )
}

// ---------------------------------------------------------------------------
// Double-rule decorative band (thick + thin)
// ---------------------------------------------------------------------------
function XingtanDoubleRule(): ReactElement {
  const palette = usePalette()
  return (
    <div aria-hidden>
      <div style={{ height: 2, backgroundColor: palette.amber }} />
      <div style={{ height: 1, backgroundColor: palette.amber, marginTop: 3 }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Objective
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
      style={{ padding: `${20 * spacingScale}px ${horizontalPadding}px ${6 * spacingScale}px` }}
    >
      <XingtanSectionHeading chapter="序" tag="Preface" title="求职意向" />

      <button
        type="button"
        className="opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
        onClick={(e) => { e.stopPropagation(); openEditModal() }}
        style={{
          position: 'absolute',
          top: 12,
          right: horizontalPadding,
          fontFamily: SERIF,
          fontSize: '0.82em',
          color: palette.amber,
          padding: '2px 12px',
          border: `1px solid ${palette.amber}`,
          borderRadius: 2,
          background: palette.paper,
          letterSpacing: '0.1em',
          zIndex: 5,
        }}
      >
        编辑
      </button>

      <div
        className="flex flex-wrap"
        style={{ paddingLeft: 36, gap: '8px 26px', fontSize: '1em' }}
      >
        {fields.map((f) => {
          const isHover: boolean = hoveredField === f.key
          return (
            <span
              key={f.key}
              className="relative inline-flex items-baseline"
              style={{ gap: '0.6em' }}
              onMouseEnter={() => setHoveredField(f.key)}
              onMouseLeave={() => setHoveredField(null)}
            >
              <span style={{ color: palette.mute, letterSpacing: '0.08em' }}>{f.label}</span>
              <span style={{ color: palette.ink, fontWeight: 500 }}>{f.value}</span>
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
// Section
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

function XingtanSection(props: SectionProps): ReactElement {
  const { section, index, dragRef, dragAttrs, dragListeners, themeColor, spacingScale } = props
  const editable = useEditableSection(section)
  const {
    title, canEditTitle, onCommitTitle,
    isTextOnly, onAddBlock, onRequestDelete,
    isHovered, setHovered,
    isDeleteDialogOpen, setDeleteDialogOpen, confirmDelete,
  } = editable
  const chapter: string = toChineseNumeral(index)
  const tag: string = resolveSectionTag(section)

  return (
    <section
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <XingtanSectionHeading
        chapter={chapter}
        tag={tag}
        title={title}
        onCommitTitle={canEditTitle ? onCommitTitle : undefined}
      />

      <XingtanHoverActions
        visible={isHovered}
        canAdd={!isTextOnly}
        onAdd={onAddBlock}
        onDelete={onRequestDelete}
        dragRef={dragRef}
        dragAttrs={dragAttrs}
        dragListeners={dragListeners}
      />

      <div style={{ paddingLeft: 36 }}>
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
// Section heading — 「第壹章」 + title + english tag
// ---------------------------------------------------------------------------
interface HeadingProps {
  readonly chapter: string
  readonly tag: string
  readonly title: string
  readonly onCommitTitle?: (v: string) => void
}

function XingtanSectionHeading(props: HeadingProps): ReactElement {
  const palette = usePalette()
  const { chapter, tag, title, onCommitTitle } = props
  const isPreface: boolean = chapter === '序'
  const chapterLabel: string = isPreface ? '序 · PREFACE' : `第 ${chapter} 章 · ${tag.toUpperCase()}`

  // 章回居中式：顶部小字「第壹章 · EDUCATION」+ 居中大字标题 + 下方花饰
  return (
    <div
      style={{
        textAlign: 'center',
        marginBottom: '1em',
      }}
    >
      <div
        style={{
          fontFamily: SERIF_LATIN,
          fontSize: '0.74em',
          color: palette.amber,
          letterSpacing: '0.28em',
          marginBottom: '0.35em',
        }}
      >
        {chapterLabel}
      </div>
      <EditableText
        as="h2"
        value={title}
        onCommit={onCommitTitle}
        style={{
          fontSize: '1.38em',
          fontWeight: 700,
          color: palette.ink,
          fontFamily: SERIF,
          letterSpacing: '0.24em',
          lineHeight: 1.2,
          display: 'inline-block',
        }}
      />
      {/* 下方花饰 —— 左虚线 + ❖ + 右虚线 */}
      <div
        aria-hidden
        className="flex items-center justify-center gap-2"
        style={{ marginTop: '0.45em' }}
      >
        <span
          style={{
            width: 40,
            height: 1,
            backgroundColor: palette.amberLight,
          }}
        />
        <span style={{ color: palette.amber, fontSize: '0.72em', lineHeight: 1 }}>❖</span>
        <span
          style={{
            width: 40,
            height: 1,
            backgroundColor: palette.amberLight,
          }}
        />
      </div>
    </div>
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

function XingtanHoverActions(props: HoverActionsProps): ReactElement {
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
        border: `1px solid ${palette.amber}`,
        borderRadius: 2,
        padding: '2px 4px',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 120ms ease',
        zIndex: 5,
      }}
    >
      {canAdd && <XingtanIconBtn label="+" onClick={onAdd} />}
      <XingtanIconBtn label="×" onClick={onDelete} danger />
      <button
        type="button"
        ref={dragRef}
        {...(dragAttrs as Record<string, unknown>)}
        {...(dragListeners as Record<string, unknown>)}
        className="h-5 w-5 text-xs cursor-grab active:cursor-grabbing flex items-center justify-center"
        style={{ color: palette.amber }}
        title="拖动"
        aria-label="拖动"
      >
        ⋮⋮
      </button>
    </div>
  )
}

function XingtanIconBtn(p: { label: string; onClick: () => void; danger?: boolean }): ReactNode {
  const palette = usePalette()
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); p.onClick() }}
      className="h-5 w-5 flex items-center justify-center font-bold"
      style={{
        fontSize: 14,
        color: p.danger ? '#dc2626' : palette.amber,
      }}
      title={p.label}
    >
      {p.label}
    </button>
  )
}
