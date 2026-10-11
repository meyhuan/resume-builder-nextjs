import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx'
import type { ITableBordersOptions, ITableCellBorders } from 'docx'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { Section } from '@/entities/resume/section'
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
    before: 120,
    after: 70,
    keepNext: true,
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

function richParagraphs(html: string | undefined, options: { readonly size?: number; readonly color?: string } = {}): Paragraph[] {
  return htmlToLines(html).map((line) => paragraph([
    ...(line.bullet ? [run('• ', { color: options.color ?? COLORS.simpleAccent, bold: true })] : []),
    run(line.text, { size: options.size ?? 17, color: options.color ?? COLORS.ink }),
  ], {
    after: 22,
    indent: line.bullet ? { left: 230, hanging: 110 } : undefined,
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

function blockHeader(title: string, subtitle: string, date: string, accent: string): Paragraph {
  return paragraph([
    run(title, { size: 18, bold: true, color: COLORS.ink }),
    ...(subtitle ? [run(`  ${subtitle}`, { size: 16, color: COLORS.muted })] : []),
    ...(date ? [run(`  ${date}`, { size: 15, color: accent })] : []),
  ], { after: 25, keepNext: true })
}

function renderBlock(block: ResumeBlock, accent: string, contentColor = COLORS.ink): Array<Paragraph> {
  if (block.type === 'experience') {
    return [
      blockHeader(block.company, block.position, dateRange(block.startDate, block.endDate), accent),
      ...richParagraphs(block.contentHtml, { color: contentColor }),
    ]
  }
  if (block.type === 'project') {
    return [
      blockHeader(block.name, block.role ?? '', dateRange(block.startDate, block.endDate), accent),
      ...richParagraphs(block.contentHtml, { color: contentColor }),
    ]
  }
  if (block.type === 'education') {
    return [
      blockHeader(block.school, [block.major, block.degree].filter(Boolean).join(' · '), dateRange(block.startDate, block.endDate), accent),
      ...richParagraphs(block.courseHtml, { color: contentColor }),
    ]
  }
  if (block.type === 'campus') {
    return [
      blockHeader(block.organization, block.position, dateRange(block.startDate, block.endDate), accent),
      ...richParagraphs(block.contentHtml, { color: contentColor }),
    ]
  }
  if (block.type === 'text') return richParagraphs(block.html, { color: contentColor })
  if (block.type === 'list') return block.items.flatMap((item) => richParagraphs(item.html, { color: contentColor }).map((p) => p))
  return []
}

function renderSectionBlocks(section: Section, accent: string, contentColor = COLORS.ink): Array<Paragraph> {
  return section.blocks.flatMap((block) => renderBlock(block, accent, contentColor))
}

function renderPairLines(lines: Array<[string, string]>, color = COLORS.ink, size = 16): Paragraph[] {
  return lines.map(([label, value]) => paragraph([
    run(`${label}：`, { size, color, bold: true }),
    run(value, { size, color }),
  ], { after: 22 }))
}

function avatarParagraph(avatar: AvatarAsset, width: number, height: number): Paragraph {
  return paragraph(new ImageRun({
    type: avatar.type,
    data: avatar.data,
    transformation: { width, height },
  }) as unknown as TextRun, { after: 0, alignment: AlignmentType.RIGHT })
}

function simpleHeader(resume: ResumeData, avatar?: AvatarAsset): Paragraph | Table {
  const title = resume.baseInfo?.title
  const contacts = contactLines(resume).map(([label, value]) => `${label}：${value}`).join('   ')
  const content = paragraph([
    run(resume.name || '姓名', { size: 33, bold: true, color: COLORS.ink }),
    ...(title ? [run(`  ${title}`, { size: 19, bold: true, color: COLORS.simpleAccent })] : []),
    ...(contacts ? [run(`\n${contacts}`, { size: 15, color: COLORS.muted })] : []),
  ], {
    after: 105,
    line: 260,
    border: { bottom: { style: BorderStyle.SINGLE, size: 9, color: COLORS.simpleAccent, space: 5 } },
  })
  if (!avatar) return content
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [new TableRow({
      children: [
        cell([content], { width: 84, margins: { top: 0, right: 100, bottom: 0, left: 0 } }),
        cell([avatarParagraph(avatar, 88, 106)], { width: 16, margins: { top: 0, right: 0, bottom: 0, left: 0 } }),
      ],
    })],
  })
}

function renderSimple(resume: ResumeData, avatar?: AvatarAsset): Document {
  const children: Array<Paragraph | Table> = [simpleHeader(resume, avatar)]
  const intention = intentionLines(resume)
  if (intention.length > 0) {
    children.push(heading('求职意向', COLORS.simpleAccent))
    children.push(...renderPairLines(intention))
  }
  for (const section of resume.sections) {
    children.push(heading(getSectionDisplayTitle(section) || section.title, COLORS.simpleAccent))
    children.push(...renderSectionBlocks(section, COLORS.simpleAccent))
  }
  return baseDocument(children, { top: 560, right: 680, bottom: 560, left: 680 })
}

function renderJingrui(resume: ResumeData, avatar?: AvatarAsset): Document {
  const left: Array<Paragraph | Table> = [
    ...(avatar ? [avatarParagraph(avatar, 150, 178)] : []),
    paragraph(run(resume.name || '姓名', { size: 29, bold: true, color: COLORS.white }), { alignment: AlignmentType.CENTER, after: 30 }),
    ...(resume.baseInfo?.title ? [paragraph(run(resume.baseInfo.title, { size: 17, bold: true, color: 'E0E7FF' }), { alignment: AlignmentType.CENTER, after: 150 })] : []),
    heading('联系方式', COLORS.white, { size: 18, shading: COLORS.jingruiAccent }),
    ...renderPairLines(contactLines(resume), COLORS.white, 15),
    ...(intentionLines(resume).length > 0 ? [heading('求职意向', COLORS.white, { size: 18, shading: COLORS.jingruiAccent }), ...renderPairLines(intentionLines(resume), COLORS.white, 15)] : []),
  ]
  const right: Array<Paragraph | Table> = []
  for (const section of resume.sections) {
    right.push(heading(getSectionDisplayTitle(section) || section.title, COLORS.jingruiAccent))
    right.push(...renderSectionBlocks(section, COLORS.jingruiAccent))
  }
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [new TableRow({
      children: [
        cell(left, { width: 35, shading: COLORS.jingruiAccent, margins: { top: 230, right: 170, bottom: 230, left: 170 } }),
        cell(right, { width: 65, margins: { top: 210, right: 230, bottom: 210, left: 240 } }),
      ],
    })],
  })
  return baseDocument([table], { top: 0, right: 0, bottom: 0, left: 0 })
}

function renderChengyan(resume: ResumeData, avatar?: AvatarAsset): Document {
  const header = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [new TableRow({
      children: [cell([
        paragraph([
          run(resume.name || '姓名', { size: 31, bold: true, color: COLORS.white }),
          ...(resume.baseInfo?.title ? [run(`  ${resume.baseInfo.title}`, { size: 18, color: 'FEF3C7' })] : []),
          ...(contactLines(resume).length > 0 ? [run(`\n${contactLines(resume).map(([label, value]) => `${label}：${value}`).join('   ')}`, { size: 15, color: 'FFF7ED' })] : []),
        ], { line: 260, after: 0 }),
        ...(avatar ? [avatarParagraph(avatar, 78, 93)] : []),
      ], { width: 100, shading: COLORS.chengyanAccent, margins: { top: 190, right: 220, bottom: 190, left: 220 } })],
    })],
  })
  const children: Array<Paragraph | Table> = [header]
  const intention = intentionLines(resume)
  if (intention.length > 0) {
    children.push(heading('求职意向', COLORS.chengyanAccent, { shading: COLORS.chengyanPale }))
    children.push(...renderPairLines(intention))
  }
  for (const section of resume.sections) {
    children.push(heading(getSectionDisplayTitle(section) || section.title, COLORS.chengyanAccent, { shading: COLORS.chengyanPale }))
    const rows = section.blocks.map((block) => {
      const rendered = renderBlock(block, COLORS.chengyanAccent)
      const date = 'startDate' in block ? dateRange(block.startDate, block.endDate) : ''
      return new TableRow({
        children: [
          cell([paragraph(run(date, { size: 14, color: COLORS.chengyanAccent, bold: true }), { after: 0 })], {
            width: 20,
            borders: { ...NO_BORDERS, right: { style: BorderStyle.SINGLE, size: 9, color: COLORS.chengyanAccent } },
            margins: { top: 65, right: 100, bottom: 65, left: 0 },
          }),
          cell(rendered, { width: 80, margins: { top: 65, right: 0, bottom: 65, left: 160 } }),
        ],
      })
    })
    if (rows.length > 0) {
      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: NO_BORDERS, rows }))
    }
  }
  return baseDocument(children, { top: 0, right: 640, bottom: 500, left: 640 })
}

/** Build a WordprocessingML document for one of the verified templates. */
export async function exportResumeToDocx(resumeInput: ResumeData, templateId: string): Promise<Buffer> {
  if (!isDocxTemplateSupported(templateId)) throw new UnsupportedDocxTemplateError(templateId)
  const resume = prepareResumeForExport(resumeInput)
  const avatar = await loadAvatar(resume.baseInfo?.avatarUrl, resume.baseInfo?.showAvatar !== false)
  const document = templateId === 'simple'
    ? renderSimple(resume, avatar)
    : templateId === 'jingrui'
      ? renderJingrui(resume, avatar)
      : renderChengyan(resume, avatar)
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
