import type { ResumeData } from '@/entities/resume/resume-data'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import type { JobFitChange, JobFitPatch } from './types'

export interface OptimizableField {
  readonly sectionId: string
  readonly sectionTitle: string
  readonly blockId: string
  readonly field: 'contentHtml' | 'courseHtml' | 'html'
  readonly itemId?: string
  readonly html: string
  readonly text: string
}

export function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export function resumeToPlainText(resume: ResumeData): string {
  const parts = [
    resume.name,
    resume.contactHtml ? stripHtml(resume.contactHtml) : '',
    resume.jobIntention?.position ?? '',
    ...extractOptimizableFields(resume).map((field) => `${field.sectionTitle} ${field.text}`),
  ]
  for (const section of resume.sections) {
    for (const block of section.blocks) {
      if (block.type === 'experience') parts.push(block.company, block.position, block.startDate, block.endDate)
      if (block.type === 'project') parts.push(block.name, block.role ?? '', block.startDate, block.endDate)
      if (block.type === 'campus') parts.push(block.organization, block.position, block.startDate, block.endDate)
      if (block.type === 'education') parts.push(block.school, block.major ?? '', block.degree ?? '', block.startDate, block.endDate)
    }
  }
  return parts.filter(Boolean).join('\n')
}

export function hashResume(resume: ResumeData): string {
  return stableContentHash(JSON.stringify(resume))
}

export function extractOptimizableFields(resume: ResumeData): OptimizableField[] {
  const fields: OptimizableField[] = []
  for (const section of resume.sections) {
    for (const block of section.blocks) {
      if (block.type === 'experience' || block.type === 'project' || block.type === 'campus') {
        pushField(fields, section.id, section.title, block.id, 'contentHtml', block.contentHtml)
      } else if (block.type === 'education' && block.courseHtml) {
        pushField(fields, section.id, section.title, block.id, 'courseHtml', block.courseHtml)
      } else if (block.type === 'text') {
        pushField(fields, section.id, section.title, block.id, 'html', block.html)
      } else if (block.type === 'list') {
        for (const item of block.items) pushField(fields, section.id, section.title, block.id, 'html', item.html, item.id)
      }
    }
  }
  return fields
}

function pushField(
  fields: OptimizableField[], sectionId: string, sectionTitle: string, blockId: string,
  field: OptimizableField['field'], html: string, itemId?: string,
): void {
  const text = stripHtml(html)
  if (text.length < 4) return
  fields.push({ sectionId, sectionTitle, blockId, field, itemId, html, text })
}

export function sanitizeResumeHtml(value: string): string {
  return value
    .replace(/<\/?(?:script|style|iframe|object|embed|form)[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(?:style|class|id)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/<(?!\/?(?:p|br|strong|b|em|i|ul|ol|li)\b)[^>]+>/gi, '')
    .trim()
}

export function applyPatches(resume: ResumeData, patches: readonly JobFitPatch[]): ResumeData {
  const cloned = structuredClone(resume)
  for (const patch of patches) {
    const section = cloned.sections.find((item) => item.id === patch.sectionId)
    const block = section?.blocks.find((item) => item.id === patch.blockId) as ResumeBlock | undefined
    if (!block) continue
    const html = sanitizeResumeHtml(patch.optimizedHtml)
    if (block.type === 'list' && patch.itemId) {
      const item = block.items.find((candidate) => candidate.id === patch.itemId)
      if (item) item.html = html
      continue
    }
    if (patch.field === 'contentHtml' && (block.type === 'experience' || block.type === 'project' || block.type === 'campus')) {
      ;(block as { contentHtml: string }).contentHtml = html
    } else if (patch.field === 'courseHtml' && block.type === 'education') {
      ;(block as { courseHtml?: string }).courseHtml = html
    } else if (patch.field === 'html' && block.type === 'text') {
      block.html = html
    }
  }
  return cloned
}

export function buildChanges(resume: ResumeData, patches: readonly JobFitPatch[]): JobFitChange[] {
  const fields = extractOptimizableFields(resume)
  return patches.flatMap((patch, index) => {
    const original = fields.find((field) =>
      field.sectionId === patch.sectionId && field.blockId === patch.blockId && field.field === patch.field && field.itemId === patch.itemId,
    )
    if (!original) return []
    const optimizedText = stripHtml(patch.optimizedHtml)
    return [{
      ...patch,
      id: `change-${index + 1}`,
      originalHtml: original.html,
      originalText: original.text,
      optimizedText,
      originalStart: 0,
      originalEnd: original.text.length,
      optimizedStart: 0,
      optimizedEnd: optimizedText.length,
      contextHash: stableContentHash(`${original.text}|${optimizedText}`).slice(0, 16),
    }]
  })
}

/**
 * Deterministic, non-cryptographic 128-bit fingerprint for content identity.
 * This stays runtime-neutral so Job Fit can be bundled by Next instrumentation
 * without pulling the Node-only crypto module into the Edge compilation.
 */
function stableContentHash(value: string): string {
  const prime = BigInt('0x100000001b3')
  let first = BigInt('0xcbf29ce484222325')
  let second = BigInt('0x84222325cbf29ce4')
  for (let index = 0; index < value.length; index += 1) {
    const code = BigInt(value.charCodeAt(index))
    first = BigInt.asUintN(64, (first ^ code) * prime)
    second = BigInt.asUintN(64, (second ^ (code + BigInt(index & 0xff))) * prime)
  }
  return `${first.toString(16).padStart(16, '0')}${second.toString(16).padStart(16, '0')}`
}
