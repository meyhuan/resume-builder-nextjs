import { toResumeContext } from '@/lib/ai/resume-context'
import type { ResumeData } from '@/entities/resume/resume-data'

const PHONE = /1[3-9]\d{9}/g
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const ID_CARD = /\b\d{17}[\dXx]\b/g
const WECHAT = /(?:微信|vx|v信|VX)\s*[:：]?\s*[A-Za-z0-9_-]{4,}/gi

export interface RedactedResumeResult {
  text: string
  usable: boolean
  roleHint: string
  recommendedTopics: string[]
}

const SCHOOL_REPRESENTATIVES = [
  '某综合大学',
  '某理工院校',
  '某财经院校',
  '某师范大学',
  '某重点高校',
  '某本科院校',
] as const

const COMPANY_REPRESENTATIVES = [
  '某互联网公司',
  '某行业头部企业',
  '某消费品品牌',
  '某科技创新企业',
  '某知名机构',
  '某中型企业',
] as const

function hashPick<T>(candidates: readonly T[], seed: string): T {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return candidates[Math.abs(hash) % candidates.length]
}

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

function generalizeSchool(school: string): string {
  const clean = school.trim()
  if (!clean) return '某高校'
  if (/理工|工业|科技|工程|电子|航空|邮电/i.test(clean)) return '某理工院校'
  if (/财经|经贸|商学院|经济|金融/i.test(clean)) return '某财经院校'
  if (/师范/i.test(clean)) return '某师范院校'
  if (/医科|中医药|医学院/i.test(clean)) return '某医科院校'
  if (/政法|法律/i.test(clean)) return '某政法院校'
  if (/学院$/i.test(clean)) return '某本科院校'
  return hashPick(SCHOOL_REPRESENTATIVES, clean)
}

function generalizeCompany(company: string): string {
  const clean = company.trim()
  if (!clean) return '某企业'
  if (/科技|网络|信息|软件|互联网|字节|腾讯|阿里|美团|快手|百度/i.test(clean)) return '某互联网公司'
  if (/银行|证券|基金|保险|投资|信托/i.test(clean)) return '某金融机构'
  if (/文化|传媒|广告|影视|出版/i.test(clean)) return '某传媒公司'
  if (/星巴克|瑞幸|肯德基|喜茶|零售|餐饮|服饰|快消/i.test(clean)) return '某连锁品牌公司'
  if (/医疗|生物|制药/i.test(clean)) return '某生物医药企业'
  return hashPick(COMPANY_REPRESENTATIVES, clean)
}

function generalize(key: string, value: string, personName: string): string {
  if (key === 'name') return '某同学'
  if (key === 'phone' || key === 'email') return ''
  if (key === 'company') return generalizeCompany(value)
  if (key === 'school') return generalizeSchool(value)
  if (key === 'organization') return '某学生社团'
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
      if (typeof record.company === 'string' && record.company) next.label = record.company
      else if (typeof record.school === 'string' && record.school) next.label = record.school
      else if (typeof record.organization === 'string' && record.organization) next.label = record.organization
    }
    return next
  }
  return value
}

function extractRoleHint(resume: ResumeData, personName: string): string {
  const ctx = toResumeContext(resume)
  const parts: string[] = []
  if (ctx.jobIntention?.position) {
    parts.push(`目标岗位：${scrub(ctx.jobIntention.position, personName)}`)
  }
  for (const sec of ctx.sections) {
    for (const block of sec.blocks) {
      if (block.meta?.position && parts.length < 2) {
        parts.push(`经历岗位：${scrub(block.meta.position, personName)}`)
      }
      if (block.meta?.major && parts.length < 3) {
        parts.push(`专业背景：${scrub(block.meta.major, personName)}`)
      }
    }
  }
  return parts.join('；')
}

function recommendTopicsFromResume(resume: ResumeData): string[] {
  const ctx = toResumeContext(resume)
  const sections = ctx.sections || []
  let totalBlocks = 0
  let hasExperience = false
  let hasCampus = false
  let hasProject = false

  for (const sec of sections) {
    totalBlocks += (sec.blocks || []).length
    for (const block of sec.blocks || []) {
      if (block.type === 'experience') hasExperience = true
      if (block.type === 'campus') hasCampus = true
      if (block.type === 'project') hasProject = true
    }
  }

  const list: string[] = []
  if (!hasExperience && (hasCampus || hasProject)) {
    list.push('pitfalls') // 应届生没大厂实习怎么写
  }
  if (totalBlocks >= 6) {
    list.push('one-page-fit') // 一页半怎么收进一页纸
  }
  if (hasExperience) {
    list.push('before-after') // 我用 AI 把简历从流水账改清楚
  }
  list.push('template-share') // 清爽一页纸模板分享
  list.push('jd-align') // 投递前对照 JD 查漏补缺
  list.push('pdf-import') // 旧 PDF 简历一键导入
  return Array.from(new Set(list)).slice(0, 3)
}

export function redactResume(resume: ResumeData): RedactedResumeResult {
  const personName = typeof resume.name === 'string' ? resume.name.trim() : ''
  const redacted = walk(toResumeContext({ ...resume, name: '某同学' }), '', personName)
  const text = JSON.stringify(redacted)
  const material = text.replace(/某同学|某院校|某高校|某企业|某公司|某大学/g, '')
  const roleHint = extractRoleHint(resume, personName)
  const recommendedTopics = recommendTopicsFromResume(resume)
  return {
    text,
    usable: material.replace(/\W/g, '').length >= 40,
    roleHint,
    recommendedTopics,
  }
}
