/**
 * Popular position/job title categories for autocomplete.
 * Ported from miniprogram fieldDic.wxs hotJobs + common additions.
 */

export interface PositionOption {
  readonly name: string
  readonly category: string
}

export const POSITION_OPTIONS: readonly PositionOption[] = [
  // 技术
  { name: '前端工程师', category: '技术' },
  { name: '后端工程师', category: '技术' },
  { name: 'Java 开发', category: '技术' },
  { name: 'Python 开发', category: '技术' },
  { name: '全栈工程师', category: '技术' },
  { name: '移动端开发', category: '技术' },
  { name: 'iOS 开发', category: '技术' },
  { name: 'Android 开发', category: '技术' },
  { name: '测试工程师', category: '技术' },
  { name: 'DevOps 工程师', category: '技术' },
  { name: '数据工程师', category: '技术' },
  { name: '算法工程师', category: '技术' },
  { name: 'AI 工程师', category: '技术' },
  // 产品
  { name: '产品经理', category: '产品' },
  { name: '产品运营', category: '产品' },
  { name: '用户研究', category: '产品' },
  // 设计
  { name: 'UI 设计师', category: '设计' },
  { name: 'UX 设计师', category: '设计' },
  { name: '视觉设计师', category: '设计' },
  // 市场/运营
  { name: '市场经理', category: '市场' },
  { name: '内容运营', category: '市场' },
  { name: '新媒体运营', category: '市场' },
  { name: '品牌经理', category: '市场' },
  // 销售
  { name: '客户经理', category: '销售' },
  { name: '销售经理', category: '销售' },
  { name: '商务拓展', category: '销售' },
  // 人力
  { name: 'HRBP', category: '人力' },
  { name: '招聘专员', category: '人力' },
  { name: '人力资源经理', category: '人力' },
  // 财务
  { name: '会计', category: '财务' },
  { name: '财务经理', category: '财务' },
  { name: '税务', category: '财务' },
  // 法律
  { name: '律师', category: '法律' },
  { name: '法务', category: '法律' },
  // 教育
  { name: '幼师', category: '教育' },
  { name: '教师', category: '教育' },
  { name: '培训师', category: '教育' },
  // 行政
  { name: '行政专员', category: '行政' },
  { name: '事业单位人员', category: '行政' },
  // 客服
  { name: '客服', category: '客服' },
  { name: '市场调研', category: '市场' },
]
