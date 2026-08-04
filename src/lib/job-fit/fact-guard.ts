import { extractOptimizableFields, stripHtml } from './resume-content'
import type { JobFitPatch } from './types'

const PROTECTED_TECHNICAL_TERMS: ReadonlySet<string> = new Set([
  'kubernetes', 'docker', 'python', 'typescript', 'javascript', 'react',
  'next.js', 'node.js', 'java', 'golang', 'sql', 'mongodb', 'postgresql',
  'mysql', 'redis', 'kafka', 'spark', 'hadoop', 'terraform', 'ansible',
  'aws', 'gcp', 'azure', 'api', 'saas', 'jira', 'confluence', 'tableau',
  'powerbi', 'figma', 'salesforce', 'snowflake', 'databricks', 'airflow',
  'agile', 'scrum', 'kanban', 'product owner', 'product manager',
  'product backlog', 'user stories', 'acceptance criteria', 'sprint planning',
  'backlog refinement', 'release planning', 'stakeholder management',
  'risk & compliance', 'data science', 'data delivery', 'data quality',
])

export function validateJobFitPatch(
  patch: JobFitPatch,
  fields: ReturnType<typeof extractOptimizableFields>,
  sourceText: string,
): { ok: true } | { ok: false; reason: string } {
  const field = fields.find((candidate) => candidate.sectionId === patch.sectionId
    && candidate.blockId === patch.blockId && candidate.field === patch.field && candidate.itemId === patch.itemId)
  if (!field) return { ok: false, reason: '有一处建议无法稳定定位，未自动修改。' }
  const optimizedText = stripHtml(patch.optimizedHtml)
  if (!optimizedText || normalizeHtml(patch.optimizedHtml) === normalizeHtml(field.html)) return { ok: false, reason: '有一处表达没有形成有效改动，已跳过。' }
  if (!normalize(sourceText).includes(normalize(patch.evidence))) return { ok: false, reason: '有一处建议缺少可验证的原简历证据，未自动写入。' }
  const sourceTokens = new Set(extractProtectedTokens(sourceText).map(normalize))
  const addedProtected = extractProtectedTokens(optimizedText).filter((token) => !sourceTokens.has(normalize(token)))
  if (addedProtected.length > 0) return { ok: false, reason: `检测到来源中不存在的数据（${addedProtected.slice(0, 2).join('、')}），未自动写入。` }
  return { ok: true }
}

function extractProtectedTokens(value: string): string[] {
  const factualValues = value.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|1[3-9]\d{9}|\d{4}[./-]\d{1,2}|\d+(?:\.\d+)?\s*(?:%|万|亿|元|人|次|个|天|月|年|k|w)/gi) ?? []
  const technicalTerms = (value.match(/[A-Za-z][A-Za-z0-9.+#/-]{1,}/g) ?? [])
    .filter((token) => isProtectedTechnicalTerm(token))
  const phraseTerms = [...PROTECTED_TECHNICAL_TERMS]
    .filter((term) => value.toLowerCase().includes(term))
  return [...factualValues, ...technicalTerms, ...phraseTerms]
}

function isProtectedTechnicalTerm(token: string): boolean {
  const normalized = token.toLowerCase()
  // Acronyms and product/tool names are evidence-bearing. Ordinary prose such
  // as "align", "prioritise" or French connective words is intentionally not
  // protected: rewriting those words does not invent a resume fact.
  if (/^[A-Z]{2,}[A-Z0-9+#/-]*$/.test(token)) return true
  return PROTECTED_TECHNICAL_TERMS.has(normalized)
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '')
}

function normalizeHtml(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}
