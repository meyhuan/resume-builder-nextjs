import type { AutocompleteOption } from '@/components/ui/autocomplete-input'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import { POSITION_OPTIONS } from './positions'
import { INDUSTRY_OPTIONS } from './industries'
import { DEGREE_OPTIONS, POLITICAL_STATUS_OPTIONS } from './base-enums'
import { SCHOOL_OPTIONS, MAJOR_OPTIONS } from './education'

const fromNames = (names: readonly string[]): readonly AutocompleteOption[] => names.map(value => ({ value, label: value }))

export const POSITION_SUGGESTIONS: readonly AutocompleteOption[] = POSITION_OPTIONS.map(option => ({
  value: option.name, label: option.name, description: option.category, aliases: option.aliases,
}))
export const INDUSTRY_SUGGESTIONS = fromNames(INDUSTRY_OPTIONS)
export const DEGREE_SUGGESTIONS = fromNames(DEGREE_OPTIONS)
export const POLITICAL_STATUS_SUGGESTIONS = fromNames(POLITICAL_STATUS_OPTIONS)

// Product-maintained examples for each context; never constrain the user's title.
export const PROJECT_ROLE_SUGGESTIONS = fromNames([
  '项目负责人', '项目经理', '项目成员', '产品负责人', '产品设计',
  '前端负责人', '前端开发', '后端负责人', '后端开发', '全栈开发',
  'UI 设计', 'UX 设计', '测试负责人', '软件测试', '数据分析', '算法研发',
  '运营负责人', '内容运营', '研究负责人', '研究助理',
])
export const CAMPUS_POSITION_SUGGESTIONS = fromNames([
  '班长', '副班长', '团支书', '学习委员', '生活委员', '文体委员',
  '学生会主席', '学生会副主席', '部长', '副部长', '干事',
  '社长', '副社长', '会长', '副会长', '活动负责人', '志愿者', '成员',
])

interface FieldSuggestions {
  readonly options: readonly AutocompleteOption[]
  readonly listLabel: string
}

/** `position` means a campus duty for campus blocks and an occupation elsewhere. */
export function getEditorFieldSuggestions(field: string, blockType?: ResumeBlock['type']): FieldSuggestions | undefined {
  switch (field) {
    case 'school': return { options: SCHOOL_OPTIONS, listLabel: '学校建议' }
    case 'major': return { options: MAJOR_OPTIONS, listLabel: '专业建议' }
    case 'degree': return { options: DEGREE_SUGGESTIONS, listLabel: '学历建议' }
    case 'industry': return { options: INDUSTRY_SUGGESTIONS, listLabel: '行业建议' }
    case 'position': return blockType === 'campus'
      ? { options: CAMPUS_POSITION_SUGGESTIONS, listLabel: '校园职务建议' }
      : { options: POSITION_SUGGESTIONS, listLabel: '岗位建议' }
    case 'role': return { options: PROJECT_ROLE_SUGGESTIONS, listLabel: '项目角色建议' }
  }
}
