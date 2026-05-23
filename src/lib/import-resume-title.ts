import type { ResumeData } from '@/entities/resume/resume-data'

const FILE_EXTENSION_RE = /\.(docx?|pdf|jpe?g|png|bmp|gif|txt)$/i
const INVALID_TITLE_CHARS_RE = /[\\/:*?"<>|]/g
const GENERIC_FILE_NAMES = new Set([
  'resume',
  'cv',
  'document',
  'scan',
  'image',
  'file',
  'untitled',
  'new',
  '姓名',
  '简历',
  '我的简历',
  '导入的简历',
  'ai 排版简历',
  'ai排版简历',
])

function normalizeTitlePart(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .trim()
    .replace(FILE_EXTENSION_RE, '')
    .replace(INVALID_TITLE_CHARS_RE, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 40)
}

function getDateFallback(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `导入的简历_${year}${month}${day}`
}

function isMeaningfulFileName(value: string): boolean {
  const lower = value.toLowerCase()
  const canonical = lower.replace(/[\s_-]*\(\d+\)$/, '').trim()
  return value.length > 0 && !GENERIC_FILE_NAMES.has(canonical)
}

export function buildImportResumeTitle(resumeData: ResumeData, sourceFileName?: string | null): string {
  const name = normalizeTitlePart(resumeData.name)
  const position = normalizeTitlePart(resumeData.jobIntention?.position)

  if (name && position) return `${name}_${position}`
  if (name) return `${name}的简历`

  const fileTitle = normalizeTitlePart(sourceFileName)
  if (isMeaningfulFileName(fileTitle)) return fileTitle

  return getDateFallback()
}
