export const TAXONOMY_OPTIONS = {
  stages: {
    internship: '实习',
    graduate: '应届',
    experienced: '有工作经验',
    executive: '资深管理',
  },
  roles: {
    general: '通用',
    technical: '技术工程',
    business: '产品运营',
    creative: '设计内容',
    education: '教育教学',
  },
  styles: {
    minimal: '极简',
    business: '商务',
    formal: '正式',
    fresh: '清爽',
    creative: '创意',
    classic: '经典',
  },
  layouts: { single: '单栏', double: '双栏', table: '表格' },
  densities: { standard: '标准', compact: '紧凑' },
  languages: { zh: '中文', en: '英文', bilingual: '双语' },
} as const

export type TaxonomyDimension = keyof typeof TAXONOMY_OPTIONS
export type TemplateTaxonomy = {
  readonly [K in TaxonomyDimension]: readonly (keyof (typeof TAXONOMY_OPTIONS)[K])[]
}
export type TemplateFilters = {
  readonly [K in TaxonomyDimension]?: readonly (keyof (typeof TAXONOMY_OPTIONS)[K])[]
}
export interface ClassifiedTemplate {
  readonly id: string
  readonly taxonomy: TemplateTaxonomy
}

export const QUICK_FILTERS = [
  { id: 'all', label: '全部模板', filters: {} },
  {
    id: 'campus',
    label: '校招实习',
    filters: { stages: ['graduate', 'internship'] },
  },
  {
    id: 'work',
    label: '职场通用',
    filters: { stages: ['experienced'], roles: ['general', 'business'] },
  },
  { id: 'tech', label: '技术求职', filters: { roles: ['technical'] } },
  { id: 'senior', label: '资深管理', filters: { stages: ['executive'] } },
  { id: 'english', label: '英文简历', filters: { languages: ['en'] } },
] as const satisfies readonly {
  id: string
  label: string
  filters: TemplateFilters
}[]

/** OR within a dimension, AND across dimensions. Never mutate input/order/content. */
export function filterTemplates<T extends ClassifiedTemplate>(
  templates: readonly T[],
  filters: TemplateFilters = {},
): T[] {
  const seen = new Set<string>()
  return templates.filter((template) => {
    if (seen.has(template.id)) return false
    seen.add(template.id)
    return (Object.keys(TAXONOMY_OPTIONS) as TaxonomyDimension[]).every(
      (key) => {
        const selected = filters[key] as readonly string[] | undefined
        const actual = template.taxonomy[key] as readonly string[]
        return (
          !selected?.length || selected.some((value) => actual.includes(value))
        )
      },
    )
  })
}

export function templateLabels(template: ClassifiedTemplate): string[] {
  return (['roles', 'layouts', 'styles', 'languages'] as const).flatMap((key) =>
    template.taxonomy[key]
      .slice(0, key === 'languages' ? undefined : 1)
      .map((value) => (TAXONOMY_OPTIONS[key] as Record<string, string>)[value]),
  )
}
