import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TableLayoutType,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx'
import type { ITableBordersOptions, ITableCellBorders } from 'docx'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { Section } from '@/entities/resume/section'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { normalizeJobIntention } from '@/entities/user/job-intention-fields'
import { prepareResumeForExport } from '@/lib/resume-export-visibility'
import { getSectionDisplayTitle } from '@/entities/resume/section-display-title'
import { isDocxTemplateSupported, type DocxTemplateId } from '@/lib/docx-template-support'

/** DOCX content type used by the export routes and object storage. */
export const DOCX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const PAGE = { width: 11906, height: 16838 }
const COLORS = {
  ink: '1F2937',
  muted: '64748B',
  lightMuted: '94A3B8',
  simpleAccent: '334155',
  jingruiAccent: '4C47FF',
  jingruiPale: 'EEF2FF',
  chengyanAccent: 'B6653A',
  chengyanPale: 'F6F4F1',
  white: 'FFFFFF',
}

const NO_BORDERS: ITableBordersOptions = {
  top: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
  bottom: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
  left: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
  right: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
}

const font = 'Noto Sans SC'

interface TextOptions {
  readonly size?: number
  readonly color?: string
  readonly bold?: boolean
  readonly italics?: boolean
}

/**
 * The browser preview is sized in CSS pixels while Word stores font sizes in
 * half-points and page geometry in twips. Keeping this conversion in one place
 * prevents the DOCX export from silently shrinking the typography compared to
 * the preview (the old renderer used 17 half-points for almost every line).
 */
interface DocxMetrics {
  readonly body: number
  readonly bodyLine: number
  readonly small: number
  readonly label: number
  readonly blockTitle: number
  readonly blockSubtitle: number
  readonly section: number
  readonly jobTitle: number
  readonly name: number
  readonly title: number
  readonly spacingScale: number
  readonly textColor: string
  readonly mutedColor: string
  readonly accent: string
}

function cssPxToHalfPoints(px: number): number {
  return Math.max(12, Math.round(px * 1.5))
}

function mmToTwips(mm: number): number {
  return Math.round(mm * 56.6929133858)
}

function normalizeColor(value: string | undefined, fallback: string): string {
  const candidate = value?.trim().replace(/^#/, '')
  return candidate && /^[0-9a-f]{6}$/i.test(candidate) ? candidate.toUpperCase() : fallback
}

function resolveMetrics(theme?: Partial<ThemeTokens>, accentFallback = COLORS.simpleAccent): DocxMetrics {
  const bodyPx = Math.max(11, theme?.fontSize ?? 15)
  const lineHeight = Math.max(1.2, theme?.lineHeight ?? 1.5)
  const scale = Math.max(0.7, Math.min(1.4, theme?.spacingScale ?? 1))
  const textColor = normalizeColor(theme?.textColor, COLORS.ink)
  const accent = normalizeColor(theme?.primaryColor, accentFallback)
  return {
    body: cssPxToHalfPoints(bodyPx),
    bodyLine: Math.round(bodyPx * 15 * lineHeight),
    small: cssPxToHalfPoints(bodyPx * 0.9),
    label: cssPxToHalfPoints(bodyPx * 0.96),
    blockTitle: cssPxToHalfPoints(bodyPx * 1.03),
    blockSubtitle: cssPxToHalfPoints(bodyPx * 0.97),
    section: cssPxToHalfPoints(bodyPx * 1.18 * (theme?.titleScale ?? 1)),
    jobTitle: cssPxToHalfPoints(bodyPx * 1.18),
    name: cssPxToHalfPoints(bodyPx * 1.86 * (theme?.titleScale ?? 1)),
    title: cssPxToHalfPoints(bodyPx * 0.96),
    spacingScale: scale,
    textColor,
    mutedColor: COLORS.muted,
    accent,
  }
}

interface ParagraphOptions {
  readonly after?: number
  readonly before?: number
  readonly line?: number
  readonly keepNext?: boolean
  readonly alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]
  readonly shading?: string
  readonly border?: Record<string, unknown>
  readonly indent?: { readonly left?: number; readonly hanging?: number }
}

interface BlockRenderOptions {
  /** Whether the block header owns the date column. Chengyan renders dates in its timeline column. */
  readonly showDate?: boolean
}

interface PlainLine {
  readonly text: string
  readonly bullet: boolean
}

interface AvatarAsset {
  readonly data: Buffer
  readonly type: 'jpg' | 'png' | 'gif' | 'bmp'
}

export class UnsupportedDocxTemplateError extends Error {
  readonly templateId: string

  constructor(templateId: string) {
    super(`DOCX export is currently supported for simple, jingrui, and chengyan only (received: ${templateId || 'unknown'})`)
    this.name = 'UnsupportedDocxTemplateError'
    this.templateId = templateId
  }
}

function run(text: string, options: TextOptions = {}): TextRun {
  return new TextRun({
    text,
    font,
    size: options.size ?? 18,
    color: options.color ?? COLORS.ink,
    bold: options.bold,
    italics: options.italics,
  })
}

function paragraph(children: TextRun[] | TextRun, options: ParagraphOptions = {}): Paragraph {
  return new Paragraph({
    children: Array.isArray(children) ? children : [children],
    spacing: { after: options.after ?? 35, before: options.before, line: options.line ?? 250 },
    keepNext: options.keepNext,
    alignment: options.alignment,
    shading: options.shading ? { fill: options.shading, type: ShadingType.CLEAR } : undefined,
    border: options.border,
    indent: options.indent,
  })
}

function heading(text: string, accent: string, options: { readonly size?: number; readonly shading?: string } = {}): Paragraph {
  return paragraph(run(text || '未命名模块', { size: options.size ?? 21, color: accent, bold: true }), {
    before: 75,
    after: 42,
    keepNext: true,
    line: 260,
    shading: options.shading,
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: accent, space: 3 },
    },
  })
}

function cell(children: Array<Paragraph | Table>, options: {
  readonly width?: number
  readonly shading?: string
  readonly margins?: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number }
  readonly borders?: ITableCellBorders
} = {}): TableCell {
  return new TableCell({
    children,
    width: options.width === undefined ? undefined : { size: options.width, type: WidthType.PERCENTAGE },
    shading: options.shading ? { fill: options.shading, type: ShadingType.CLEAR } : undefined,
    borders: options.borders ?? NO_BORDERS,
    margins: options.margins ?? { top: 100, right: 120, bottom: 100, left: 120 },
    verticalAlign: VerticalAlign.TOP,
  })
}

function baseDocument(children: Array<Paragraph | Table>, margins: { top: number; right: number; bottom: number; left: number }): Document {
  return new Document({
    creator: '智简简历',
    title: '简历',
    sections: [{
      properties: {
        page: {
          size: PAGE,
          margin: margins,
        },
      },
      children,
    }],
  })
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, digits: string) => String.fromCharCode(Number(digits)))
}

/**
 * The editor stores sanitized rich text as HTML. DOCX does not consume that
 * HTML directly, so we intentionally map the supported subset to semantic
 * paragraphs and bullets. Unsupported visual CSS is discarded here by design.
 */
function htmlToLines(html: string | undefined): PlainLine[] {
  if (!html) return []
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\u0001')
    .replace(/<\/li\s*>/gi, '\n')
    .replace(/<\/p\s*>|<\/div\s*>|<\/h[1-6]\s*>/gi, '\n')
  const plain = decodeEntities(withBreaks.replace(/<[^>]*>/g, ''))
  return plain
    .split(/\r?\n/)
    .map((line) => line.replace(/\u00a0/g, ' ').trim())
    .filter(Boolean)
    .map((line) => ({
      text: line.startsWith('\u0001') ? line.slice(1).trim() : line.replace(/^[-•]\s+/, '').trim(),
      bullet: line.startsWith('\u0001') || /^[-•]\s+/.test(line),
    }))
    .filter((line) => line.text.length > 0)
}

function richParagraphs(
  html: string | undefined,
  options: { readonly size?: number; readonly color?: string; readonly line?: number; readonly after?: number; readonly indent?: number } = {},
): Paragraph[] {
  return htmlToLines(html).map((line) => paragraph([
    ...(line.bullet ? [run('• ', { size: options.size ?? 22, color: options.color ?? COLORS.simpleAccent, bold: true })] : []),
    run(line.text, { size: options.size ?? 22, color: options.color ?? COLORS.ink }),
  ], {
    after: options.after ?? 30,
    line: options.line ?? 330,
    indent: line.bullet || options.indent ? { left: line.bullet ? 230 : options.indent, hanging: line.bullet ? 110 : undefined } : undefined,
  }))
}

function dateRange(startDate: string | undefined, endDate: string | undefined): string {
  return [startDate, endDate].filter(Boolean).join(' — ')
}

function contactLines(resume: ResumeData): Array<[string, string]> {
  const info = resume.baseInfo
  if (!info) return []
  const fields: Array<[string, string | number | undefined]> = [
    ['电话', info.phone],
    ['邮箱', info.email],
    ['所在地', info.location || info.currentLocation],
    ['性别', info.gender],
    ['年龄', info.age],
    ['民族', info.nation],
    ['政治面貌', info.politicalStatus],
    ...(info.customFields ?? []).map((field): [string, string] => [field.label, field.value]),
  ]
  return fields
    .filter(([, value]) => value !== undefined && String(value).trim() !== '')
    .map(([label, value]) => [label, String(value)])
}

function intentionLines(resume: ResumeData): Array<[string, string]> {
  if (!resume.jobIntention || resume.jobIntentionVisible === false) return []
  const intent = normalizeJobIntention(resume.jobIntention)
  const fields: Array<[string, string | undefined]> = [
    ['意向岗位', intent.position],
    ['意向城市', intent.city],
    ['期望薪资', intent.salary],
    ['工作性质', intent.type],
    ['招聘类型', intent.recruitmentType],
    ['期望行业', intent.industry],
    ['求职状态', intent.currentStatus],
    ...(intent.customFields ?? []).map((field): [string, string] => [field.label, field.value]),
  ]
  return fields.filter(([, value]) => Boolean(value && value.trim())).map(([label, value]) => [label, value as string])
}

function blockHeader(title: string, subtitle: string, date: string, metrics: DocxMetrics, options: BlockRenderOptions = {}): Paragraph | Table {
  const left = paragraph([
    run(title, { size: metrics.blockTitle, bold: true, color: metrics.textColor }),
    ...(subtitle ? [run(`  ${subtitle}`, { size: metrics.blockSubtitle, color: metrics.textColor })] : []),
  ], { after: 0, keepNext: true, line: metrics.bodyLine })
  if (options.showDate === false) return left
  const right = paragraph(
    run(date, { size: metrics.blockSubtitle, color: metrics.accent, bold: true }),
    { after: 0, keepNext: true, line: metrics.bodyLine, alignment: AlignmentType.RIGHT },
  )
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    columnWidths: [7000, 3206],
    borders: NO_BORDERS,
    rows: [new TableRow({
      children: [
        cell([left], { width: 70, margins: { top: 0, right: 40, bottom: Math.round(25 * metrics.spacingScale), left: 0 } }),
        cell([right], { width: 30, margins: { top: 0, right: 0, bottom: Math.round(25 * metrics.spacingScale), left: 40 } }),
      ],
    })],
  })
}

function renderBlock(block: ResumeBlock, metrics: DocxMetrics, contentColor = metrics.textColor, options: BlockRenderOptions = {}): Array<Paragraph | Table> {
  if (block.type === 'experience') {
    return [
      blockHeader(block.company, block.position, dateRange(block.startDate, block.endDate), metrics, options),
      ...richParagraphs(block.contentHtml, { color: contentColor, size: metrics.body, line: metrics.bodyLine, after: 28 * metrics.spacingScale }),
    ]
  }
  if (block.type === 'project') {
    return [
      blockHeader(block.name, block.role ?? '', dateRange(block.startDate, block.endDate), metrics, options),
      ...richParagraphs(block.contentHtml, { color: contentColor, size: metrics.body, line: metrics.bodyLine, after: 28 * metrics.spacingScale }),
    ]
  }
  if (block.type === 'education') {
    return [
      blockHeader(block.school, [block.major, block.degree].filter(Boolean).join(' · '), dateRange(block.startDate, block.endDate), metrics, options),
      ...richParagraphs(block.courseHtml, { color: contentColor, size: metrics.body, line: metrics.bodyLine, after: 28 * metrics.spacingScale }),
    ]
  }
  if (block.type === 'campus') {
    return [
      blockHeader(block.organization, block.position, dateRange(block.startDate, block.endDate), metrics, options),
      ...richParagraphs(block.contentHtml, { color: contentColor, size: metrics.body, line: metrics.bodyLine, after: 28 * metrics.spacingScale }),
    ]
  }
  if (block.type === 'text') return richParagraphs(block.html, { color: contentColor, size: metrics.body, line: metrics.bodyLine, after: 28 * metrics.spacingScale })
  if (block.type === 'list') return block.items.flatMap((item) => richParagraphs(item.html, { color: contentColor, size: metrics.body, line: metrics.bodyLine, after: 28 * metrics.spacingScale }).map((p) => p))
  return []
}

function renderSectionBlocks(section: Section, metrics: DocxMetrics, contentColor = metrics.textColor): Array<Paragraph | Table> {
  return section.blocks.flatMap((block) => renderBlock(block, metrics, contentColor))
}

function renderPairLines(lines: Array<[string, string]>, color = COLORS.ink, size = 20, line = 300): Paragraph[] {
  return lines.map(([label, value]) => paragraph([
    run(`${label}：`, { size, color, bold: true }),
    run(value, { size, color }),
  ], { after: 22, line }))
}

function avatarParagraph(avatar: AvatarAsset, width: number, height: number): Paragraph {
  return paragraph(new ImageRun({
    type: avatar.type,
    data: avatar.data,
    transformation: { width, height },
  }) as unknown as TextRun, { after: 0, alignment: AlignmentType.CENTER })
}

function lineGrid(
  lines: Array<[string, string]>,
  columns: number,
  metrics: DocxMetrics,
  options: { readonly color?: string; readonly labelColor?: string; readonly valueSize?: number; readonly columnWidths?: number[] } = {},
): Table {
  const rows: TableRow[] = []
  const columnWidth = Math.floor(100 / columns)
  for (let index = 0; index < lines.length; index += columns) {
    const rowLines = lines.slice(index, index + columns)
    const cells = rowLines.map(([label, value]) => cell([
      paragraph([
        run(`${label}：`, { size: options.valueSize ?? metrics.label, color: options.labelColor ?? options.color ?? metrics.mutedColor, bold: true }),
        run(value, { size: options.valueSize ?? metrics.label, color: options.color ?? metrics.textColor }),
      ], { after: 0, line: metrics.bodyLine }),
    ], {
      width: columnWidth,
      margins: { top: 12, right: 55, bottom: 12, left: 0 },
    }))
    while (cells.length < columns) {
      cells.push(cell([paragraph(run('', { size: metrics.label }), { after: 0 })], {
        width: columnWidth,
        margins: { top: 12, right: 55, bottom: 12, left: 0 },
      }))
    }
    rows.push(new TableRow({ children: cells }))
  }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    columnWidths: options.columnWidths?.map((width) => Math.round(10206 * width / 100)),
    borders: NO_BORDERS,
    rows,
  })
}

function simpleHeader(resume: ResumeData, metrics: DocxMetrics, avatar?: AvatarAsset): Table {
  const title = resume.baseInfo?.title
  const bottomBorder = { style: BorderStyle.SINGLE, size: 9, color: metrics.accent, space: 5 }
  const content: Array<Paragraph | Table> = [paragraph([
    run(resume.name || '姓名', { size: metrics.name, bold: true, color: metrics.textColor }),
    ...(title ? [run(`    意向岗位：${title}`, { size: metrics.title, bold: true, color: metrics.accent })] : []),
  ], { after: 50, line: metrics.bodyLine })]
  const contacts = contactLines(resume)
  if (contacts.length > 0) content.push(lineGrid(contacts, 3, metrics, { valueSize: metrics.small, columnWidths: [30, 43, 27] }))
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    columnWidths: avatar ? [1500, 8706] : [10206],
    borders: NO_BORDERS,
    rows: [new TableRow({
      children: [
        ...(avatar ? [cell([avatarParagraph(avatar, 88, 106)], {
          width: 16,
          margins: { top: 0, right: 90, bottom: 60, left: 0 },
          borders: { ...NO_BORDERS, bottom: bottomBorder },
        })] : []),
        cell(content, {
          width: avatar ? 84 : 100,
          margins: { top: 0, right: 0, bottom: 60, left: avatar ? 0 : 0 },
          borders: { ...NO_BORDERS, bottom: bottomBorder },
        }),
      ],
    })],
  })
}

function englishSectionTitle(title: string): string {
  const normalized = title.trim()
  if (normalized.includes('教育')) return 'Education background'
  if (normalized.includes('校园')) return 'Campus experience'
  if (normalized.includes('工作') || normalized.includes('实习')) return 'Work experience'
  if (normalized.includes('项目')) return 'Project experience'
  if (normalized.includes('技能')) return 'Professional skills'
  if (normalized.includes('评价') || normalized.includes('介绍')) return 'Self introduction'
  return 'Resume section'
}

function jingruiSectionHeading(title: string, metrics: DocxMetrics): Table {
  const mark = cell([
    paragraph(run('◆', { size: 16, color: metrics.accent, bold: true }), { after: 0, line: 210, alignment: AlignmentType.CENTER }),
  ], {
    width: 6,
    margins: { top: 45, right: 45, bottom: 45, left: 45 },
  })
  const copy = cell([
    paragraph(run(title || '未命名模块', { size: metrics.section, color: metrics.accent, bold: true }), {
      after: 0,
      line: 245,
      keepNext: true,
    }),
    paragraph(run(englishSectionTitle(title), { size: metrics.small, color: COLORS.lightMuted }), {
      before: 0,
      after: 25,
      line: 180,
    }),
  ], {
    width: 94,
    margins: { top: 0, right: 0, bottom: 25, left: 120 },
    borders: {
      ...NO_BORDERS,
      bottom: { style: BorderStyle.SINGLE, size: 5, color: 'D9DBE8', space: 3 },
    },
  })
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    columnWidths: [612, 9594],
    borders: NO_BORDERS,
    rows: [new TableRow({ children: [mark, copy] })],
  })
}

function jingruiSidebarContent(resume: ResumeData, metrics: DocxMetrics, avatar?: AvatarAsset): Array<Paragraph | Table> {
  const top = cell([
    paragraph(run('RESUME', { size: metrics.small, color: '29354B', bold: true }), {
      after: 110,
      line: 220,
      alignment: AlignmentType.CENTER,
    }),
    ...(avatar ? [avatarParagraph(avatar, 150, 178)] : []),
  ], {
    width: 100,
    shading: 'E9EEF5',
    margins: { top: 180, right: 170, bottom: 180, left: 170 },
  })
  const topPanel = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    columnWidths: [10000],
    borders: NO_BORDERS,
    rows: [new TableRow({ height: { value: 4700, rule: HeightRule.ATLEAST }, children: [top] })],
  })
  const bottom: Array<Paragraph | Table> = [
    paragraph(run(resume.name || '姓名', { size: Math.round(metrics.name * 0.8), bold: true, color: COLORS.white }), {
      alignment: AlignmentType.CENTER,
      after: 30,
      line: metrics.bodyLine,
    }),
    ...(resume.baseInfo?.title ? [paragraph(run(resume.baseInfo.title, { size: metrics.small, bold: true, color: 'E0E7FF' }), {
      alignment: AlignmentType.CENTER,
      after: 130,
      line: metrics.bodyLine,
    })] : []),
    paragraph(run('━━━━━━━━', { size: 13, color: 'E0E7FF' }), { alignment: AlignmentType.CENTER, after: 100, line: 180 }),
    ...renderPairLines(contactLines(resume), COLORS.white, metrics.small, metrics.bodyLine),
    ...(intentionLines(resume).length > 0 ? [
      paragraph(run('求职意向', { size: metrics.jobTitle, color: COLORS.white, bold: true }), {
        before: 100,
        after: 45,
        line: metrics.bodyLine,
        border: { bottom: { style: BorderStyle.SINGLE, size: 5, color: 'FFFFFF', space: 3 } },
      }),
      ...renderPairLines(intentionLines(resume), COLORS.white, metrics.small, metrics.bodyLine),
    ] : []),
  ]
  return [topPanel, ...bottom]
}

function renderSimple(resume: ResumeData, avatar?: AvatarAsset, theme?: Partial<ThemeTokens>): Document {
  const metrics = resolveMetrics(theme, COLORS.simpleAccent)
  const children: Array<Paragraph | Table> = [simpleHeader(resume, metrics, avatar)]
  const intention = intentionLines(resume)
  if (intention.length > 0) {
    children.push(heading('求职意向', metrics.accent, { size: metrics.jobTitle }))
    children.push(lineGrid(intention, 2, metrics, { columnWidths: [50, 50] }))
  }
  for (const section of resume.sections) {
    children.push(heading(getSectionDisplayTitle(section) || section.title, metrics.accent, { size: metrics.section }))
    children.push(...renderSectionBlocks(section, metrics))
  }
  return baseDocument(children, {
    top: mmToTwips(theme?.pagePaddingVertical ?? 19),
    right: mmToTwips(theme?.pagePaddingHorizontal ?? 15),
    bottom: mmToTwips(theme?.pagePaddingVertical ?? 19),
    left: mmToTwips(theme?.pagePaddingHorizontal ?? 15),
  })
}

function renderJingrui(resume: ResumeData, avatar?: AvatarAsset, theme?: Partial<ThemeTokens>): Document {
  const metrics = resolveMetrics(theme, COLORS.jingruiAccent)
  const right: Array<Paragraph | Table> = []
  for (const section of resume.sections) {
    right.push(jingruiSectionHeading(getSectionDisplayTitle(section) || section.title, metrics))
    right.push(...renderSectionBlocks(section, metrics))
  }
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    columnWidths: [4130, 7776],
    borders: NO_BORDERS,
    rows: [new TableRow({
      cantSplit: true,
      height: { value: PAGE.height, rule: HeightRule.ATLEAST },
      children: [
        cell(jingruiSidebarContent(resume, metrics, avatar), {
          width: 35,
          shading: metrics.accent,
          margins: { top: 0, right: 170, bottom: 230, left: 170 },
        }),
        cell(right, { width: 65, margins: { top: 210, right: 230, bottom: 210, left: 240 } }),
      ],
    })],
  })
  return baseDocument([table], { top: 0, right: 0, bottom: 0, left: 0 })
}

function renderChengyan(resume: ResumeData, avatar?: AvatarAsset, theme?: Partial<ThemeTokens>): Document {
  const metrics = resolveMetrics(theme, COLORS.chengyanAccent)
  const accent = metrics.accent
  const topBand = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    columnWidths: [10625],
    borders: NO_BORDERS,
    rows: [new TableRow({
      height: { value: 95, rule: HeightRule.EXACT },
      children: [cell([paragraph(run('', { size: 1 }), { after: 0, line: 1 })], {
        width: 100,
        shading: accent,
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
      })],
    })],
  })
  const headerContent = paragraph([
    run(resume.name || '姓名', { size: Math.round(metrics.name * 0.85), bold: true, color: metrics.textColor }),
    ...(resume.baseInfo?.title ? [run(`  ${resume.baseInfo.title}`, { size: metrics.title, color: metrics.mutedColor })] : []),
    ...(contactLines(resume).length > 0 ? [run(`\n${contactLines(resume).map(([label, value]) => `${label}：${value}`).join('   ')}`, { size: metrics.small, color: metrics.textColor })] : []),
  ], { line: metrics.bodyLine, after: 0 })
  const header = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    columnWidths: avatar ? [8500, 2125] : [10625],
    borders: NO_BORDERS,
    rows: [new TableRow({
      children: [
        cell([headerContent], {
          width: avatar ? 80 : 100,
          shading: COLORS.chengyanPale,
          margins: { top: 180, right: 220, bottom: 180, left: 220 },
          borders: { ...NO_BORDERS, bottom: { style: BorderStyle.SINGLE, size: 5, color: 'D9D4CE', space: 3 } },
        }),
        ...(avatar ? [cell([avatarParagraph(avatar, 78, 93)], {
          width: 20,
          shading: COLORS.chengyanPale,
          margins: { top: 130, right: 220, bottom: 130, left: 80 },
          borders: { ...NO_BORDERS, bottom: { style: BorderStyle.SINGLE, size: 5, color: 'D9D4CE', space: 3 } },
        })] : []),
      ],
    })],
  })
  const children: Array<Paragraph | Table> = [topBand, header]
  const intention = intentionLines(resume)
  if (intention.length > 0) {
    children.push(heading('求职意向', accent, { size: metrics.jobTitle, shading: COLORS.chengyanPale }))
    children.push(lineGrid(intention, 2, metrics))
  }
  for (const section of resume.sections) {
    const title = getSectionDisplayTitle(section) || section.title
    const sectionTitle = cell([
      paragraph(run(title, { size: metrics.section, color: accent, bold: true }), {
        after: 0,
        line: metrics.bodyLine,
      }),
    ], {
      width: 20,
      margins: { top: 65, right: 100, bottom: 65, left: 0 },
      borders: { ...NO_BORDERS, right: { style: BorderStyle.SINGLE, size: 9, color: accent } },
    })
    const sectionBody = cell(renderSectionBlocks(section, metrics), {
      width: 80,
      margins: { top: 65, right: 0, bottom: 65, left: 160 },
      borders: { ...NO_BORDERS, top: { style: BorderStyle.SINGLE, size: 5, color: 'CFCAC4', space: 3 } },
    })
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      columnWidths: [2125, 8501],
      borders: NO_BORDERS,
      rows: [new TableRow({ cantSplit: true, children: [sectionTitle, sectionBody] })],
    }))
  }
  return baseDocument(children, { top: 0, right: 640, bottom: 500, left: 640 })
}

/** Build a WordprocessingML document for one of the verified templates. */
export async function exportResumeToDocx(
  resumeInput: ResumeData,
  templateId: string,
  theme?: Partial<ThemeTokens>,
): Promise<Buffer> {
  if (!isDocxTemplateSupported(templateId)) throw new UnsupportedDocxTemplateError(templateId)
  const resume = prepareResumeForExport(resumeInput)
  const avatar = await loadAvatar(resume.baseInfo?.avatarUrl, resume.baseInfo?.showAvatar !== false)
  const document = templateId === 'simple'
    ? renderSimple(resume, avatar, theme)
    : templateId === 'jingrui'
      ? renderJingrui(resume, avatar, theme)
      : renderChengyan(resume, avatar, theme)
  return Packer.toBuffer(document)
}

async function loadAvatar(url: string | undefined, enabled: boolean): Promise<AvatarAsset | undefined> {
  if (!enabled || !url) return undefined
  try {
    let data: Buffer
    let contentType = ''
    if (url.startsWith('data:image/')) {
      const match = url.match(/^data:image\/(png|jpe?g|gif|bmp);base64,(.+)$/i)
      if (!match) return undefined
      contentType = `image/${match[1].toLowerCase()}`
      data = Buffer.from(match[2], 'base64')
    } else {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined
      const response = await fetch(parsed, { signal: AbortSignal.timeout(5000) })
      if (!response.ok) return undefined
      const arrayBuffer = await response.arrayBuffer()
      if (arrayBuffer.byteLength > 4 * 1024 * 1024) return undefined
      contentType = response.headers.get('content-type') || ''
      data = Buffer.from(arrayBuffer)
    }
    const type = contentType.toLowerCase().includes('png')
      ? 'png'
      : contentType.toLowerCase().includes('gif')
        ? 'gif'
        : contentType.toLowerCase().includes('bmp')
          ? 'bmp'
          : contentType.toLowerCase().includes('jpeg') || contentType.toLowerCase().includes('jpg')
            ? 'jpg'
            : undefined
    return type ? { data, type } : undefined
  } catch {
    return undefined
  }
}

export type { DocxTemplateId }
