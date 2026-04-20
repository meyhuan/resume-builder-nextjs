/**
 * Module configuration for the mobile edit pages. Mirrors the miniprogram
 * moduleActionsHelper.js so that both clients share the same module taxonomy.
 */

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
  readonly emoji: string
  readonly route: string
  readonly group: ModuleGroup
  readonly required: boolean
  readonly isList: boolean
  readonly sortable: boolean
  /** Section title in ResumeData.sections to attach experience blocks. */
  readonly sectionTitle?: string
}

/**
 * Ordered list of modules displayed on the edit home.
 */
export const MODULES: readonly ModuleConfig[] = [
  { key: 'base', label: '基础信息', emoji: '👤', route: '/m/edit/base', group: 'required', required: true, isList: false, sortable: false },
  { key: 'intention', label: '求职意向', emoji: '🎯', route: '/m/edit/intention', group: 'required', required: true, isList: false, sortable: false },
  { key: 'workExp', label: '工作经历', emoji: '💼', route: '/m/edit/work', group: 'experience', required: false, isList: true, sortable: true, sectionTitle: '工作经历' },
  { key: 'eduExp', label: '教育经历', emoji: '🎓', route: '/m/edit/edu', group: 'experience', required: false, isList: true, sortable: true, sectionTitle: '教育经历' },
  { key: 'programExp', label: '项目经验', emoji: '🚀', route: '/m/edit/project', group: 'experience', required: false, isList: true, sortable: true, sectionTitle: '项目经验' },
  { key: 'internExp', label: '实习经历', emoji: '🧑‍💻', route: '/m/edit/intern', group: 'experience', required: false, isList: true, sortable: true, sectionTitle: '实习经历' },
  { key: 'schoolExp', label: '在校经历', emoji: '🏫', route: '/m/edit/school', group: 'experience', required: false, isList: true, sortable: true, sectionTitle: '在校经历' },
  { key: 'summary', label: '自我评价', emoji: '📝', route: '/m/edit/summary', group: 'supplementary', required: false, isList: false, sortable: false, sectionTitle: '自我评价' },
  { key: 'skill', label: '相关技能', emoji: '🛠️', route: '/m/edit/skill', group: 'supplementary', required: false, isList: false, sortable: false, sectionTitle: '相关技能' },
  { key: 'qualifications', label: '奖项证书', emoji: '🏆', route: '/m/edit/qualifications', group: 'supplementary', required: false, isList: false, sortable: false, sectionTitle: '奖项证书' },
  { key: 'custom', label: '自定义', emoji: '✨', route: '/m/edit/custom', group: 'supplementary', required: false, isList: false, sortable: false },
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
 * Find the module config that owns a given section title (e.g. "工作经历" → workExp).
 * Returns undefined for custom / unknown section titles.
 */
export function findModuleBySectionTitle(title: string): ModuleConfig | undefined {
  const normalized: string = title.replace(/\s/g, '')
  return MODULES.find((m) => m.sectionTitle && m.sectionTitle.replace(/\s/g, '') === normalized)
}
