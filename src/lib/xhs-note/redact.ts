import { toResumeContext } from '@/lib/ai/resume-context'
import type { ResumeData } from '@/entities/resume/resume-data'

const PHONE = /1[3-9]\d{9}/g
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const ID_CARD = /\b\d{17}[\dXx]\b/g
const WECHAT = /(?:微信|vx|v信|VX)\s*[:：]?\s*[A-Za-z0-9_-]{4,}/gi

function scrub(value: string, personName = ''): string {
  let next = value
    .replace(/<[^>]+>/g, ' ')
    .replace(ID_CARD, '')
    .replace(PHONE, '')
    .replace(EMAIL, '')
    .replace(WECHAT, '')
  if (personName.length >= 2) next = next.split(personName).join('')
  return next.replace(/\s+/g, ' ').trim()
}

function generalize(key: string, value: string, personName: string): string {
  if (key === 'name') return '某同学'
  if (key === 'phone' || key === 'email') return ''
  if (key === 'company') return '某大厂'
  if (key === 'school') return '某211'
  if (key === 'organization') return '某组织'
  return scrub(value, personName)
}

function walk(value: unknown, key = '', personName = ''): unknown {
  if (typeof value === 'string') return generalize(key, value, personName)
  if (Array.isArray(value)) return value.map((item) => walk(item, '', personName))
  if (value && typeof value === 'object') {
    const next: Record<string, unknown> = {}
    for (const [childKey, child] of Object.entries(value)) {
      next[childKey] = walk(child, childKey, personName)
    }
    const meta = next.meta
    if (meta && typeof meta === 'object') {
      const record = meta as Record<string, unknown>
      if (record.company === '某大厂') next.label = '某大厂'
      else if (record.school === '某211') next.label = '某211'
      else if (record.organization === '某组织') next.label = '某组织'
    }
    return next
  }
  return value
}

export function redactResume(resume: ResumeData): { text: string; usable: boolean } {
  const personName = typeof resume.name === 'string' ? resume.name.trim() : ''
  const redacted = walk(toResumeContext({ ...resume, name: '某同学' }), '', personName)
  const text = JSON.stringify(redacted)
  const material = text.replace(/某同学|某大厂|某211|某组织/g, '')
  return { text, usable: material.replace(/\W/g, '').length >= 40 }
}
