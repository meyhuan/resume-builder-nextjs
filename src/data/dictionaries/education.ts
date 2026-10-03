import type { AutocompleteOption } from '@/components/ui/autocomplete-input'
import schools from './schools.json'
import majors from './major-suggestions.json'

// Education Ministry's 2026 mainland ordinary higher-education institutions.
// Source/provenance: education-sources.md. Older and overseas names remain free text.
const SCHOOL_ALIASES: Readonly<Record<string, readonly string[]>> = {
  北京大学: ['北大'], 清华大学: ['清华'], 中国人民大学: ['人大'], 北京师范大学: ['北师大'],
  北京航空航天大学: ['北航'], 北京理工大学: ['北理工'], 北京邮电大学: ['北邮'],
  复旦大学: ['复旦'], 上海交通大学: ['上海交大', '上交'], 同济大学: ['同济'],
  华东师范大学: ['华师大'], 南京大学: ['南大'], 南昌大学: ['南大'], 东南大学: ['东大'],
  浙江大学: ['浙大'], 中国科学技术大学: ['中科大'], 厦门大学: ['厦大'],
  武汉大学: ['武大'], 华中科技大学: ['华科', '华中大'], 华中师范大学: ['华师'],
  中山大学: ['中大'], 华南理工大学: ['华工'], 华南师范大学: ['华师'],
  四川大学: ['川大'], 电子科技大学: ['成电'], 西安交通大学: ['西安交大', '西交'],
  西北工业大学: ['西工大'], 西安电子科技大学: ['西电'], 哈尔滨工业大学: ['哈工大'],
  哈尔滨工程大学: ['哈工程'], 吉林大学: ['吉大'], 大连理工大学: ['大工'],
}

export const SCHOOL_OPTIONS: readonly AutocompleteOption[] = schools.map(([name, city]) => ({
  value: name, label: name, description: city, aliases: [...(SCHOOL_ALIASES[name] ?? []), city],
}))

// Common choices first, followed by the full 2026 undergraduate catalogue.
const COMMON_MAJORS = [
  '计算机科学与技术', '软件工程', '信息管理与信息系统', '电子信息工程', '人工智能',
  '数据科学与大数据技术', '信息安全', '网络工程', '物联网工程', '数字媒体技术',
  '通信工程', '电子科学与技术', '电气工程及其自动化', '自动化', '机械设计制造及其自动化',
  '机械工程', '车辆工程', '工业设计', '材料科学与工程', '土木工程', '建筑学',
  '环境工程', '化学工程与工艺', '生物工程', '食品科学与工程',
  '工商管理', '市场营销', '会计学', '财务管理', '人力资源管理', '电子商务',
  '物流管理', '供应链管理', '工程管理', '行政管理', '旅游管理',
  '经济学', '金融学', '国际经济与贸易', '统计学', '应用统计学',
  '法学', '社会学', '社会工作', '心理学', '应用心理学', '教育学', '学前教育',
  '小学教育', '汉语言文学', '英语', '日语', '新闻学', '广告学', '传播学',
  '网络与新媒体', '视觉传达设计', '环境设计', '产品设计', '数字媒体艺术',
  '数学与应用数学', '物理学', '化学', '生物科学', '临床医学', '护理学', '药学',
] as const

const commonOrder = new Map<string, number>(COMMON_MAJORS.map((name, index) => [name, index]))
export const MAJOR_OPTIONS: readonly AutocompleteOption[] = majors
  .map(([, name, category]) => ({ value: name, label: name, description: `本科 · ${category}`, aliases: [category] }))
  .sort((a, b) => (commonOrder.get(a.value) ?? COMMON_MAJORS.length) - (commonOrder.get(b.value) ?? COMMON_MAJORS.length))
