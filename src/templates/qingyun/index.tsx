/**
 * 青云 — Qingyun (flagship for fresh graduates)
 *
 * 面向中国校招 / 应届生的旗舰模板。
 *
 * 签名视觉元素：
 *  1. Hero 右上角「应届毕业生」暖橙徽章（自动根据字段判断显示）
 *  2. 左侧天青色时间轴竖线贯穿全文，每个 section 起点有圆点
 *  3. 双语 section 标题（EDUCATION · 教育背景）
 *  4. 期望薪资使用暖橙色（整份简历唯一的暖色锚点）
 *
 * 推荐品牌色为天青蓝（locksPrimaryColor 在 theme-panel 中展示推荐文案，
 * 用户仍可在需要时自定义 primaryColor —— 会自动衍生 deep / light 两档）。
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
//  - 默认 sky = 天青蓝（品牌默认）
//  - 若用户在主题面板自定义了 primaryColor，将自动衍生 deep / light
//  - accent（暖橙）固定，它是第二色，与主色构成对比
// ---------------------------------------------------------------------------
// 青 — 传统青色（介于蓝与绿之间），使用 cyan-600 呼应「青云」之名
const QINGYUN_DEFAULT_SKY = '#0891b2'

const QINGYUN_STATIC = {
  accent: '#f97316',
  accentLight: '#ffedd5',
  ink: '#0f172a',
  mute: '#64748b',
  rule: '#e2e8f0',
  paper: '#ffffff',
} as const

interface QingyunPalette {
  readonly sky: string
  readonly skyDeep: string
  readonly skyLight: string
  readonly accent: string
  readonly accentLight: string
  readonly ink: string
  readonly mute: string
  readonly rule: string
  readonly paper: string
}

function buildPalette(primaryColor: string): QingyunPalette {
  const sky: string = /^#([0-9a-f]{3}){1,2}$/i.test(primaryColor) ? primaryColor : QINGYUN_DEFAULT_SKY
  return {
    sky,
    skyDeep: darkenHex(sky, 0.7),
    skyLight: lightenHex(sky, 0.85),
    ...QINGYUN_STATIC,
  }
}

const DEFAULT_PALETTE: QingyunPalette = buildPalette(QINGYUN_DEFAULT_SKY)
const PaletteCtx = createContext<QingyunPalette>(DEFAULT_PALETTE)
const usePalette = (): QingyunPalette => useContext(PaletteCtx)

const SANS = '"Inter", "Noto Sans SC", "PingFang SC", "Helvetica Neue", sans-serif'

// ---------------------------------------------------------------------------
// Section title heuristics: map common Chinese keywords to English
// ---------------------------------------------------------------------------
function resolveEnglishTitle(section: Section): string {
  const t = section.title.toLowerCase()
  if (t.includes('教育') || t.includes('学历')) return 'EDUCATION'
  if (t.includes('工作') || t.includes('实习') || t.includes('经历')) return 'EXPERIENCE'
  if (t.includes('项目')) return 'PROJECTS'
  if (t.includes('校园')) return 'CAMPUS LIFE'
  if (t.includes('技能')) return 'SKILLS'
  if (t.includes('证书')) return 'CERTIFICATES'
  if (t.includes('获奖') || t.includes('荣誉')) return 'HONORS'
  if (t.includes('自我') || t.includes('评价')) return 'ABOUT ME'
  return 'SECTION'
}

// ---------------------------------------------------------------------------
// Fresh-grad badge detection
// ---------------------------------------------------------------------------
function detectFreshGradLabel(
  currentStatus: string | undefined,
  workStartTime: string | undefined
): string | null {
  if (currentStatus && /应届|在读|实习|校招/.test(currentStatus)) {
    return currentStatus
  }
  if (workStartTime && /^\d{4}/.test(workStartTime)) {
    return `预计毕业 · ${workStartTime}`
  }
  return null
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
export default function QingyunTemplate(props: TemplateProps): ReactElement {
  const { resume, theme } = props
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null)
  const objective = useEditableJobIntention(resume.jobIntention ?? null)
  const jobIntentionVisible: boolean = resume.jobIntentionVisible ?? Boolean(resume.jobIntention)
  const pagePad = usePagePadding(theme, 28, 40)

  const freshGradLabel: string | null = detectFreshGradLabel(
    resume.jobIntention?.currentStatus,
    resume.baseInfo?.workStartTime
  )
  const palette: QingyunPalette = buildPalette(theme.primaryColor)

  return (
    <PaletteCtx.Provider value={palette}>
    <ResumeFrame
      resume={resume}
      theme={theme}
      bleed
      style={{ backgroundColor: palette.paper, color: palette.ink, fontFamily: SANS }}
    >
      {/* ——— HERO ———————————————————————————————————————————— */}
      <QingyunHero
        header={header}
        horizontalPadding={pagePad.paddingLeft as number}
        freshGradLabel={freshGradLabel}
      />

      {/* ——— CONTENT AREA with unified timeline —————————————— */}
      <div style={{ position: 'relative' }}>
        {/* 左侧时间轴竖线（贯穿求职意向 + 所有 sections） */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 20,
            bottom: 28,
            left: (pagePad.paddingLeft as number) - 2,
            width: 1,
            backgroundColor: palette.rule,
          }}
        />

        {/* ——— OBJECTIVE SECTION (求职意向，视觉统一) ——— */}
        {jobIntentionVisible && objective.jobIntention && (
          <ObjectiveSection
            objective={objective}
            horizontalPadding={pagePad.paddingLeft as number}
            spacingScale={theme.spacingScale}
          />
        )}

        {/* ——— MAIN SECTIONS ————————————————————————— */}
        <main style={{ ...pagePad, paddingTop: jobIntentionVisible ? 12 * theme.spacingScale : pagePad.paddingTop, display: 'flex', flexDirection: 'column', gap: 26 * theme.spacingScale }}>
          {resume.sections.map((section: Section) => (
            <SortableSection key={section.id} sectionId={section.id}>
              {(dragProps) => (
                <QingyunSection
                  section={section}
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
      </div>

      {header.modals}
      {objective.modals}
    </ResumeFrame>
    </PaletteCtx.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hero — sky gradient, avatar on the left, name large, fresh-grad badge right
// ---------------------------------------------------------------------------
interface HeroProps {
  readonly header: ReturnType<typeof useEditableHeader>
  readonly horizontalPadding: number
  readonly freshGradLabel: string | null
}

function QingyunHero({ header, horizontalPadding, freshGradLabel }: HeroProps): ReactElement {
  const palette = usePalette()
  const { name, onCommitName, fields, openEditModal, baseInfo } = header
  const title: string = baseInfo?.title ?? ''

  return (
    <header
      className="relative group"
      onClick={openEditModal}
      style={{
        cursor: 'pointer',
        padding: `2.6em ${horizontalPadding}px 2em`,
        background: `linear-gradient(135deg, ${palette.sky} 0%, ${palette.skyDeep} 100%)`,
      }}
    >
      {/* 应届毕业徽章 —— 签名元素 */}
      {freshGradLabel && (
        <div
          className="absolute flex items-center gap-1.5 print:bg-orange-500"
          style={{
            top: '1.4em',
            right: horizontalPadding,
            backgroundColor: palette.accent,
            color: '#ffffff',
            padding: '0.35em 0.85em',
            borderRadius: 999,
            fontSize: '0.78em',
            fontWeight: 600,
            letterSpacing: '0.05em',
            boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
          }}
        >
          <span aria-hidden style={{ fontSize: '0.92em' }}>🎓</span>
          <span>{freshGradLabel}</span>
        </div>
      )}

      <div className="flex items-center gap-6">
        {/* 头像 — 标准证件照比例 5:7 */}
        <AvatarSlot
          header={header}
          render={({ image, uploadOverlay }) => (
            <div
              className="relative overflow-hidden shrink-0"
              style={{
                width: 100,
                height: 140,
                borderRadius: 10,
                border: '3px solid rgba(255,255,255,0.9)',
                boxShadow: '0 4px 18px rgba(30,64,175,0.35)',
              }}
            >
              {image}
              {uploadOverlay}
            </div>
          )}
        />

        {/* 姓名 + title + 基本信息 */}
        <div className="flex-1 min-w-0">
          <EditableText
            as="h1"
            value={name}
            onCommit={onCommitName}
            style={{
              fontSize: '2.5em',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '0.02em',
              lineHeight: 1.1,
            }}
          />
          {title && (
            <div
              style={{
                fontSize: '1em',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.85)',
                marginTop: '0.4em',
                letterSpacing: '0.02em',
              }}
            >
              {title}
            </div>
          )}

          {/* 基本信息行 */}
          <div
            className="flex flex-wrap"
            style={{
              gap: '4px 14px',
              marginTop: '1em',
              fontSize: '0.86em',
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            {fields.map((f) => (
              <FieldChip
                key={f.key}
                field={f}
                header={header}
                deleteColor={palette.accent}
                className="inline-flex items-center gap-1"
              >
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{f.label}</span>
                <span style={{ color: '#ffffff', fontWeight: 500 }}>{f.value}</span>
              </FieldChip>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}

// ---------------------------------------------------------------------------
// Objective section — styled like other sections with bilingual header + dot
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
      style={{ padding: `${24 * spacingScale}px ${horizontalPadding}px` }}
      onClick={openEditModal}
    >
      {/* Timeline dot (aligned with other sections) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: horizontalPadding - 6,
          top: `${26 * spacingScale}px`,
          width: 9,
          height: 9,
          borderRadius: '50%',
          backgroundColor: palette.sky,
          boxShadow: `0 0 0 3px ${palette.skyLight}`,
        }}
      />

      {/* Bilingual header matching section style */}
      <div className="flex items-center gap-3" style={{ paddingLeft: 14, marginBottom: '0.5em' }}>
        <span
          className="font-bold uppercase"
          style={{
            fontSize: '1.07em',
            letterSpacing: '0.15em',
            color: palette.sky,
          }}
        >
          OBJECTIVE
        </span>
        <span style={{ fontSize: '1em', fontWeight: 600, color: palette.ink }}>求职意向</span>
        <span style={{ flex: 1, height: 1, backgroundColor: palette.rule }} />
      </div>

      {/* Absolute-positioned edit button — zero layout impact on hover */}
      <button
        type="button"
        className="opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
        onClick={(e) => { e.stopPropagation(); openEditModal() }}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          fontSize: '0.85em',
          color: palette.mute,
          padding: '2px 8px',
          border: `1px solid ${palette.rule}`,
          borderRadius: 4,
          background: palette.paper,
          zIndex: 5,
        }}
      >
        编辑
      </button>

      {/* Field chips */}
      <div
        className="flex flex-wrap"
        style={{ paddingLeft: 14, fontSize: '1em', color: palette.ink, gap: '8px 12px' }}
      >
        {fields.map((f) => {
          const isHover: boolean = hoveredField === f.key
          return (
            <span
              key={f.key}
              className="relative inline-flex items-center"
              style={{ padding: '2px 6px', borderRadius: 4, transition: 'background-color 120ms' }}
              onMouseEnter={() => setHoveredField(f.key)}
              onMouseLeave={() => setHoveredField(null)}
            >
              <span style={{ color: palette.mute, marginRight: 6 }}>{f.label}</span>
              <span style={{ fontWeight: 500, color: palette.ink }}>
                {f.value}
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); deleteField(f.key) }}
                className="print:hidden"
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -8,
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
// Section — 双语标题 + 时间轴圆点
// ---------------------------------------------------------------------------
interface SectionProps {
  readonly section: Section
  readonly dragRef: (el: HTMLElement | null) => void
  readonly dragAttrs: unknown
  readonly dragListeners: unknown
  readonly themeColor: string
  readonly spacingScale: number
}

function QingyunSection(props: SectionProps): ReactElement {
  const palette = usePalette()
  const { section, dragRef, dragAttrs, dragListeners, themeColor, spacingScale } = props
  const editable = useEditableSection(section)
  const {
    title, canEditTitle, onCommitTitle,
    isTextOnly, onAddBlock, onRequestDelete,
    isHovered, setHovered,
    isDeleteDialogOpen, setDeleteDialogOpen, confirmDelete,
  } = editable
  const englishTitle: string = resolveEnglishTitle(section)

  return (
    <section
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 时间轴圆点（签名元素） —— 贴在 section 左侧 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: -6,
          top: 8,
          width: 9,
          height: 9,
          borderRadius: '50%',
          backgroundColor: palette.sky,
          boxShadow: `0 0 0 3px ${palette.skyLight}`,
        }}
      />

      {/* 双语标题 */}
      <div className="flex items-center gap-3" style={{ paddingLeft: 14, marginBottom: '0em' }}>
        <span
          className="font-bold uppercase"
          style={{
            fontSize: '1.07em',
            letterSpacing: '0.15em',
            color: palette.sky,
          }}
        >
          {englishTitle}
        </span>
        <EditableText
          as="span"
          value={title}
          onCommit={canEditTitle ? onCommitTitle : undefined}
          className="font-semibold"
          style={{
            fontSize: '1em',
            color: palette.ink,
          }}
        />
        <span style={{ flex: 1, height: 1, backgroundColor: palette.rule }} />
      </div>
      {/* Hover actions — absolutely positioned so layout never shifts */}
      <QingyunHoverActions
        visible={isHovered}
        canAdd={!isTextOnly}
        onAdd={onAddBlock}
        onDelete={onRequestDelete}
        dragRef={dragRef}
        dragAttrs={dragAttrs}
        dragListeners={dragListeners}
      />

      {/* Block list */}
      <div style={{ paddingLeft: 14 }}>
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

function QingyunHoverActions(props: HoverActionsProps): ReactElement {
  const palette = usePalette()
  const { visible, canAdd, onAdd, onDelete, dragRef, dragAttrs, dragListeners } = props
  return (
    <div
      className="flex items-center gap-1 print:hidden"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#ffffff',
        border: `1px solid ${palette.sky}`,
        borderRadius: 4,
        padding: '2px 4px',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 120ms ease',
        zIndex: 5,
      }}
    >
      {canAdd && <QingyunIconBtn label="+" onClick={onAdd} />}
      <QingyunIconBtn label="×" onClick={onDelete} danger />
      <button
        type="button"
        ref={dragRef}
        {...(dragAttrs as Record<string, unknown>)}
        {...(dragListeners as Record<string, unknown>)}
        className="h-5 w-5 text-xs cursor-grab active:cursor-grabbing flex items-center justify-center"
        style={{ color: palette.sky }}
        title="拖动"
        aria-label="拖动"
      >
        ⋮⋮
      </button>
    </div>
  )
}

function QingyunIconBtn(p: { label: string; onClick: () => void; danger?: boolean }): ReactNode {
  const palette = usePalette()
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); p.onClick() }}
      className="h-5 w-5 flex items-center justify-center font-bold"
      style={{
        fontSize: 14,
        color: p.danger ? '#dc2626' : palette.sky,
      }}
      title={p.label}
    >
      {p.label}
    </button>
  )
}
