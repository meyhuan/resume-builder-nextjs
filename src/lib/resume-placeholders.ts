const PLACEHOLDER_TEXTS: ReadonlySet<string> = new Set([
  '公司名称',
  '职位名称',
  '学校名称',
  '专业',
  '学历',
  '项目名称',
  '项目角色',
  '行业',
  '实习岗位',
  '组织名称',
  '职务',
  '开始时间',
  '结束时间',
])

const PLACEHOLDER_HTML_TEXTS: ReadonlySet<string> = new Set([
  '详细描述你的职责范围、工作内容和工作成果。',
  '描述你的实习内容和收获。',
  '大学之前的教育经历建议不写，尽量写与求职行业或者求职岗位相关的课程。',
  '描述你参与的项目及你在项目中所做的工作。',
  '描述你在校园活动中的角色和贡献。',
  '技能1：描述你的熟练程度 技能2：描述你的熟练程度',
  '列出你获得的荣誉证书和资质认证。',
  '在此输入内容。',
])

export function normalizePlaceholderText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function isPlaceholderText(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return PLACEHOLDER_TEXTS.has(normalizePlaceholderText(value))
}

export function hasMeaningfulText(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const normalized = normalizePlaceholderText(value)
  if (!normalized) return false
  return !PLACEHOLDER_TEXTS.has(normalized)
}

export function hasMeaningfulHtml(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const normalized = htmlToPlainText(value)
  if (!normalized) return false
  return !PLACEHOLDER_HTML_TEXTS.has(normalized)
}

export function htmlToPlainText(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, ' ')
  const stripped = withBreaks.replace(/<[^>]+>/g, '')
  return normalizePlaceholderText(
    stripped
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"'),
  )
}

