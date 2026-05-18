/**
 * Module configuration for the mobile edit pages. Mirrors the miniprogram
 * moduleActionsHelper.js so that both clients share the same module taxonomy.
 */

/**
 * Single source of truth for every section title stored in ResumeData.sections.
 * Import these constants instead of hardcoding strings in page components so
 * that a rename only requires changing one place.
 */
export const MODULE_SECTION_TITLES = {
  workExp: '工作经历',
  eduExp: '教育经历',
  programExp: '项目经历',
  internExp: '实习经历',
  schoolExp: '校园经历',
  summary: '自我评价',
  skill: '相关技能',
  qualifications: '奖项证书',
} as const

export type SectionTitleKey = keyof typeof MODULE_SECTION_TITLES

export type ModuleKey =
  | 'base'
  | 'intention'
  | 'summary'
  | 'workExp'
  | 'eduExp'
  | 'schoolExp'
  | 'internExp'
  | 'programExp'
  | 'skill'
  | 'qualifications'
  | 'custom'

export type ModuleGroup = 'required' | 'experience' | 'supplementary'

export interface ModuleConfig {
  readonly key: ModuleKey
  readonly label: string
  readonly route: string
  readonly group: ModuleGroup
  readonly required: boolean
  readonly isList: boolean
  readonly sortable: boolean
  /** Section title in ResumeData.sections to attach experience blocks. */
  readonly sectionTitle?: string
  /** Legacy mojibake titles already stored in some imported records. */
  readonly legacySectionTitles?: readonly string[]
}

/**
 * Ordered list of modules displayed on the edit home.
 */
const T = MODULE_SECTION_TITLES

export const MODULES: readonly ModuleConfig[] = [
  { key: 'base',          label: '基本信息', route: '/m/edit/base',          group: 'required',      required: true,  isList: false, sortable: false },
  { key: 'intention',     label: '求职意向', route: '/m/edit/intention',     group: 'required',      required: true,  isList: false, sortable: false },
  { key: 'workExp',       label: '工作经历', route: '/m/edit/work',          group: 'experience',    required: false, isList: true,  sortable: true,  sectionTitle: T.workExp },
  { key: 'eduExp',        label: '教育经历', route: '/m/edit/edu',           group: 'experience',    required: false, isList: true,  sortable: true,  sectionTitle: T.eduExp },
  { key: 'programExp',    label: '项目经历', route: '/m/edit/project',       group: 'experience',    required: false, isList: true,  sortable: true,  sectionTitle: T.programExp,    legacySectionTitles: ['项目经验'] },
  { key: 'internExp',     label: '实习经历', route: '/m/edit/intern',        group: 'experience',    required: false, isList: true,  sortable: true,  sectionTitle: T.internExp },
  { key: 'schoolExp',     label: '校园经历', route: '/m/edit/school',        group: 'experience',    required: false, isList: true,  sortable: true,  sectionTitle: T.schoolExp,     legacySectionTitles: ['在校经历'] },
  { key: 'summary',       label: '自我评价', route: '/m/edit/summary',       group: 'supplementary', required: false, isList: false, sortable: false, sectionTitle: T.summary },
  { key: 'skill',         label: '相关技能', route: '/m/edit/skill',         group: 'supplementary', required: false, isList: false, sortable: false, sectionTitle: T.skill },
  { key: 'qualifications',label: '奖项证书', route: '/m/edit/qualifications',group: 'supplementary', required: false, isList: false, sortable: false, sectionTitle: T.qualifications },
  { key: 'custom',        label: '自定义',   route: '/m/edit/custom',        group: 'supplementary', required: false, isList: false, sortable: false },
]

/**
 * Get module config by key.
 */
export function getModule(key: ModuleKey): ModuleConfig | undefined {
  return MODULES.find((m) => m.key === key)
}

/**
 * Group modules for display on the edit home.
 */
export function groupModules(): Record<ModuleGroup, readonly ModuleConfig[]> {
  return {
    required: MODULES.filter((m) => m.group === 'required'),
    experience: MODULES.filter((m) => m.group === 'experience'),
    supplementary: MODULES.filter((m) => m.group === 'supplementary'),
  }
}

/**
 * Find the module config that owns a given section title.
 * Supports legacy mojibake titles already stored in older resume records.
 */
export function findModuleBySectionTitle(title: string): ModuleConfig | undefined {
  const normalized: string = normalizeTitle(title)
  return MODULES.find((m) =>
    getSectionTitleCandidates(m).some((candidate) => normalizeTitle(candidate) === normalized),
  )
}

export function getSectionTitleCandidates(module: ModuleConfig): readonly string[] {
  return [module.sectionTitle, ...(module.legacySectionTitles ?? [])].filter(Boolean) as string[]
}

function normalizeTitle(title: string): string {
  return title.replace(/\s/g, '')
}
