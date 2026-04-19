/**
 * 朱墨 — Zhumo (flagship for editorial / content / copy roles)
 *
 * 面向编辑、文案、新媒体、品牌内容岗的旗舰模板。
 *
 * 设计语言：
 *  - 衬线字（Noto Serif SC / Lora）传达文字工作者的气质
 *  - 章节编号使用中文数字「壹 / 贰 / 叁」—— 与「01/02/」的工程感拉开距离
 *  - 朱红色左侧竖条作为页面主视觉锚点，延展到每个 section
 *  - 姓名旁一枚朱红方印（「印」/「简」字），作为签名元素
 *  - 整份简历只有两个颜色：朱红（品牌）+ 松烟墨（正文）
 *
 * 推荐品牌色为朱砂红，可自定义 primaryColor（衍生 deep / light 两档）。
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
const ZHUMO_DEFAULT_RED = '#b91c1c'

const ZHUMO_STATIC = {
  ink: '#1c1917',       // 松烟墨 — 正文
  inkSoft: '#44403c',   // 浅墨 — 次要正文
  mute: '#78716c',      // 远墨 — 辅助信息
  rule: '#e7e5e4',      // 淡墨 — 分隔
  paper: '#fdfcfa',     // 宣纸白（略带暖调）
} as const

interface ZhumoPalette {
  readonly red: string
  readonly redDeep: string
  readonly redLight: string
  readonly redBg: string
  readonly ink: string
  readonly inkSoft: string
  readonly mute: string
  readonly rule: string
  readonly paper: string
}

function buildPalette(primaryColor: string): ZhumoPalette {
  const red: string = /^#([0-9a-f]{3}){1,2}$/i.test(primaryColor) ? primaryColor : ZHUMO_DEFAULT_RED
  return {
    red,
    redDeep: darkenHex(red, 0.7),
    redLight: lightenHex(red, 0.75),
    redBg: lightenHex(red, 0.92),
    ...ZHUMO_STATIC,
  }
}

const DEFAULT_PALETTE: ZhumoPalette = buildPalette(ZHUMO_DEFAULT_RED)
const PaletteCtx = createContext<ZhumoPalette>(DEFAULT_PALETTE)
const usePalette = (): ZhumoPalette => useContext(PaletteCtx)

const SERIF = '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", "Lora", Georgia, serif'
const SERIF_LATIN = '"Lora", "Noto Serif SC", Georgia, serif'

// ---------------------------------------------------------------------------
// Chinese numeral for section index (1..20)
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
// Section tag (small english subtitle under Chinese title)
// ---------------------------------------------------------------------------
function resolveSectionTag(section: Section): string {
  const t: string = section.title.toLowerCase()
  if (t.includes('教育') || t.includes('学历')) return 'Education'
  if (t.includes('工作') || t.includes('经历')) return 'Experience'
  if (t.includes('实习')) return 'Internship'
  if (t.includes('项目')) return 'Projects'
  if (t.includes('作品')) return 'Portfolio'
  if (t.includes('技能')) return 'Skills'
  if (t.includes('发表') || t.includes('出版')) return 'Publications'
  if (t.includes('证书')) return 'Certificates'
  if (t.includes('获奖') || t.includes('荣誉')) return 'Awards'
  if (t.includes('自我') || t.includes('评价') || t.includes('简介')) return 'About'
  return ''
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
export default function ZhumoTemplate(props: TemplateProps): ReactElement {
  const { resume, theme } = props
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null)
  const objective = useEditableJobIntention(resume.jobIntention ?? null)
  const jobIntentionVisible: boolean = resume.jobIntentionVisible ?? Boolean(resume.jobIntention)
  const pagePad = usePagePadding(theme, 30, 42)
  const palette: ZhumoPalette = buildPalette(theme.primaryColor)

  return (
    <PaletteCtx.Provider value={palette}>
      <ResumeFrame
        resume={resume}
        theme={theme}
        bleed
        style={{ backgroundColor: palette.paper, color: palette.ink, fontFamily: SERIF }}
      >
        {/* 整页左侧竖条（朱红） */}
        {/* <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
            backgroundColor: palette.red,
          }}
        /> */}

        {/* ——— HERO ——————————————————————————————————— */}
        <ZhumoHero header={header} horizontalPadding={pagePad.paddingLeft as number} />

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
            gap: 30 * theme.spacingScale,
          }}
        >
          {resume.sections.map((section: Section, i: number) => (
            <SortableSection key={section.id} sectionId={section.id}>
              {(dragProps) => (
                <ZhumoSection
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
// Hero — large serif name with red seal + avatar
// ---------------------------------------------------------------------------
interface HeroProps {
  readonly header: ReturnType<typeof useEditableHeader>
  readonly horizontalPadding: number
}

function ZhumoHero({ header, horizontalPadding }: HeroProps): ReactElement {
  const palette = usePalette()
  const { name, onCommitName, fields, openEditModal, baseInfo } = header
  const title: string = baseInfo?.title ?? ''

  return (
    <header
      className="relative group cursor-pointer"
      onClick={openEditModal}
      style={{
        padding: `2.6em ${horizontalPadding}px 1.8em`,
      }}
    >
      <div className="flex items-start gap-6">
        {/* Left: name + title + fields */}
        <div className="flex-1 min-w-0">
          {/* Top tagline — Chinese seal-stamp aesthetic */}
          <div
            style={{
              fontFamily: SERIF_LATIN,
              fontSize: '0.78em',
              color: palette.red,
              letterSpacing: '0.32em',
              marginBottom: '0.5em',
              textTransform: 'uppercase',
            }}
          >
            Curriculum Vitae · 履历
          </div>

          {/* Name with red seal */}
          <div className="flex items-baseline gap-4" style={{ marginBottom: '0.4em' }}>
            <EditableText
              as="h1"
              value={name}
              onCommit={onCommitName}
              style={{
                fontSize: '2.6em',
                fontWeight: 700,
                color: palette.ink,
                fontFamily: SERIF,
                letterSpacing: '0.08em',
                lineHeight: 1.1,
              }}
            />
            <ZhumoSeal />
          </div>

          {/* Title (role) */}
          {title && (
            <div
              style={{
                fontSize: '1em',
                color: palette.inkSoft,
                fontFamily: SERIF,
                letterSpacing: '0.1em',
                marginBottom: '0.9em',
              }}
            >
              {title}
            </div>
          )}

          {/* Base info as serif line separated by red dots */}
          {fields.length > 0 && (
            <div
              className="flex flex-wrap"
              style={{
                gap: '4px 0',
                marginTop: '0.4em',
                fontSize: '0.92em',
                color: palette.inkSoft,
              }}
            >
              {fields.map((f, i) => (
                <span key={f.key} className="inline-flex items-center">
                  {i > 0 && (
                    <span
                      aria-hidden
                      style={{
                        color: palette.red,
                        margin: '0 0.75em',
                        fontSize: '0.6em',
                        lineHeight: 1,
                      }}
                    >
                      ●
                    </span>
                  )}
                  <FieldChip
                    field={f}
                    header={header}
                    deleteColor={palette.red}
                    className="inline-flex items-baseline gap-1.5"
                  >
                    <span style={{ color: palette.mute, letterSpacing: '0.05em' }}>
                      {f.label}
                    </span>
                    <span style={{ color: palette.ink, fontWeight: 500 }}>{f.value}</span>
                  </FieldChip>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Avatar — 标准证件照 5:7 */}
        <AvatarSlot
          header={header}
          render={({ image, uploadOverlay }) => (
            <div
              className="relative overflow-hidden shrink-0"
              style={{
                width: 100,
                height: 140,
                borderRadius: 2,
                border: `1px solid ${palette.rule}`,
                padding: 4,
                backgroundColor: palette.paper,
                boxShadow: `0 2px 14px ${palette.red}25`,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  border: `2px solid ${palette.red}`,
                  overflow: 'hidden',
                }}
              >
                {image}
              </div>
              {uploadOverlay}
            </div>
          )}
        />
      </div>

      {/* Bottom rule — thin red line */}
      <div
        aria-hidden
        style={{
          marginTop: '1.6em',
          height: 2,
          background: `linear-gradient(90deg, ${palette.red} 0%, ${palette.red} 12%, ${palette.rule} 12%, ${palette.rule} 100%)`,
        }}
      />
    </header>
  )
}

// ---------------------------------------------------------------------------
// Seal — small red square with a serif character (印)
// ---------------------------------------------------------------------------
function ZhumoSeal(): ReactElement {
  const palette = usePalette()
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '1.5em',
        height: '1.5em',
        backgroundColor: palette.red,
        color: palette.paper,
        fontFamily: SERIF,
        fontSize: '0.8em',
        fontWeight: 700,
        letterSpacing: 0,
        borderRadius: 3,
        transform: 'rotate(-4deg)',
        boxShadow: `0 2px 6px ${palette.red}40`,
      }}
    >
      印
    </span>
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
      style={{ padding: `${18 * spacingScale}px ${horizontalPadding}px ${6 * spacingScale}px` }}
    >
      <ZhumoSectionHeading numeral="序" tag="Objective" title="求职意向" />

      <button
        type="button"
        className="opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
        onClick={(e) => { e.stopPropagation(); openEditModal() }}
        style={{
          position: 'absolute',
          top: 8,
          right: horizontalPadding,
          fontFamily: SERIF,
          fontSize: '0.82em',
          color: palette.red,
          padding: '2px 12px',
          border: `1px solid ${palette.red}`,
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
        style={{ paddingLeft: 28, gap: '8px 24px', fontSize: '1em' }}
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
              <span style={{ color: palette.mute, letterSpacing: '0.06em' }}>{f.label}</span>
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

function ZhumoSection(props: SectionProps): ReactElement {
  const { section, index, dragRef, dragAttrs, dragListeners, themeColor, spacingScale } = props
  const editable = useEditableSection(section)
  const {
    title, canEditTitle, onCommitTitle,
    isTextOnly, onAddBlock, onRequestDelete,
    isHovered, setHovered,
    isDeleteDialogOpen, setDeleteDialogOpen, confirmDelete,
  } = editable
  const numeral: string = toChineseNumeral(index)
  const tag: string = resolveSectionTag(section)

  return (
    <section
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <ZhumoSectionHeading
        numeral={numeral}
        tag={tag}
        title={title}
        onCommitTitle={canEditTitle ? onCommitTitle : undefined}
      />

      <ZhumoHoverActions
        visible={isHovered}
        canAdd={!isTextOnly}
        onAdd={onAddBlock}
        onDelete={onRequestDelete}
        dragRef={dragRef}
        dragAttrs={dragAttrs}
        dragListeners={dragListeners}
      />

      <div style={{ paddingLeft: 28 }}>
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
// Section heading — Chinese numeral + bilingual title
// ---------------------------------------------------------------------------
interface HeadingProps {
  readonly numeral: string
  readonly tag: string
  readonly title: string
  readonly onCommitTitle?: (v: string) => void
}

function ZhumoSectionHeading(props: HeadingProps): ReactElement {
  const palette = usePalette()
  const { numeral, title, onCommitTitle } = props
  // 题签式：红色方印数字 + 标题，标题下有一对红色双横线装饰（仅在标题宽度内）
  return (
    <div className="inline-flex items-baseline gap-3" style={{ marginBottom: '0.9em' }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '1.6em',
          height: '1.6em',
          padding: '0 0.3em',
          backgroundColor: palette.red,
          color: palette.paper,
          fontFamily: SERIF,
          fontSize: '0.92em',
          fontWeight: 700,
          letterSpacing: 0,
          borderRadius: 2,
        }}
      >
        {numeral}
      </span>
      <span
        style={{
          display: 'inline-block',
          position: 'relative',
          paddingBottom: '0.3em',
        }}
      >
        <EditableText
          as="span"
          value={title}
          onCommit={onCommitTitle}
          style={{
            fontSize: '1.28em',
            fontWeight: 700,
            color: palette.ink,
            fontFamily: SERIF,
            letterSpacing: '0.1em',
          }}
        />
        {/* 红色双横线装饰 —— 仅横跨标题宽度 */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 1,
            backgroundColor: palette.red,
          }}
        />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: -3,
            height: 1,
            backgroundColor: palette.red,
          }}
        />
      </span>
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

function ZhumoHoverActions(props: HoverActionsProps): ReactElement {
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
        border: `1px solid ${palette.red}`,
        borderRadius: 2,
        padding: '2px 4px',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 120ms ease',
        zIndex: 5,
      }}
    >
      {canAdd && <ZhumoIconBtn label="+" onClick={onAdd} />}
      <ZhumoIconBtn label="×" onClick={onDelete} danger />
      <button
        type="button"
        ref={dragRef}
        {...(dragAttrs as Record<string, unknown>)}
        {...(dragListeners as Record<string, unknown>)}
        className="h-5 w-5 text-xs cursor-grab active:cursor-grabbing flex items-center justify-center"
        style={{ color: palette.red }}
        title="拖动"
        aria-label="拖动"
      >
        ⋮⋮
      </button>
    </div>
  )
}

function ZhumoIconBtn(p: { label: string; onClick: () => void; danger?: boolean }): ReactNode {
  const palette = usePalette()
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); p.onClick() }}
      className="h-5 w-5 flex items-center justify-center font-bold"
      style={{
        fontSize: 14,
        color: p.danger ? '#dc2626' : palette.red,
      }}
      title={p.label}
    >
      {p.label}
    </button>
  )
}
