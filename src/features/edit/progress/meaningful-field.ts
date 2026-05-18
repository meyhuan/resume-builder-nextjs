const PLACEHOLDER_VALUES: ReadonlySet<string> = new Set([
  '姓名',
  '同学',
  '电话号码',
  '手机号',
  '邮箱',
  '求职岗位',
  '意向城市',
  '期望薪资',
  '求职类型',
  '性别',
  '公司名称',
  '职位名称',
  '学校名称',
  '专业',
  '开始时间',
  '结束时间',
  '项目名称',
  '项目角色',
  '行业',
  '月薪',
  '学历',
  '实习岗位',
  '组织名称',
  '职务',
])

/**
 * Returns whether a field contains user-provided content rather than a visible
 * placeholder copied from the template/demo state.
 */
export function isMeaningfulText(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const normalized = value.trim()
  if (!normalized) return false
  return !PLACEHOLDER_VALUES.has(normalized)
}
