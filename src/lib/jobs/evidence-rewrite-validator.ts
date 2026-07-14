const CONCRETE_CLAIM_TERMS = [
  '天猫', '淘宝', '京东', '拼多多', '抖音电商', '万相台', '无界', '直通车', '引力魔方',
  'sql', 'python', 'java', 'react', 'next.js', 'figma', 'axure', 'photoshop',
  'seo', 'sem', 'roi', 'gmv', 'okr', 'kpi', 'crm', 'erp', 'saas',
] as const

export interface RewriteEvidenceCheck {
  readonly safe: boolean
  readonly issues: readonly string[]
}

/** Block new measurable claims and concrete tools/platforms in strict factual mode. */
export function validateEvidenceBoundRewrite(
  sourceResumeHtml: string,
  proposedHtml: string,
): RewriteEvidenceCheck {
  const source = normalize(sourceResumeHtml)
  const proposed = normalize(proposedHtml)
  const issues: string[] = []

  const sourceNumbers = new Set(extractNumbers(source))
  const newNumbers = extractNumbers(proposed).filter((number) => !sourceNumbers.has(number))
  if (newNumbers.length > 0) issues.push(`出现已确认事实没有的数字：${[...new Set(newNumbers)].join('、')}`)

  const newClaims = CONCRETE_CLAIM_TERMS.filter((term) => {
    const normalizedTerm = normalize(term)
    return proposed.includes(normalizedTerm) && !source.includes(normalizedTerm)
  })
  if (newClaims.length > 0) issues.push(`出现已确认事实没有的工具或平台：${newClaims.join('、')}`)

  return { safe: issues.length === 0, issues }
}

function extractNumbers(value: string): string[] {
  return value.match(/\d+(?:\.\d+)?%?|\d+(?:\.\d+)?(?:万|亿|千|百)/g) ?? []
}

function normalize(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, '')
    .toLowerCase()
}
