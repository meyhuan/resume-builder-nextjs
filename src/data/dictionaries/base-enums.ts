/**
 * Basic enumerations shared by the edit forms. Ported from the miniprogram
 * fieldDic.wxs to keep the two clients aligned.
 */

export const GENDER_OPTIONS: readonly string[] = ['男', '女']

export const JOB_TYPE_OPTIONS: readonly string[] = ['社招', '校招', '实习']

export const SALARY_OPTIONS: readonly string[] = [
  '面议',
  '3k以下',
  '3-5k',
  '5-10k',
  '10-20k',
  '20-50k',
  '50k以上',
]

export const DEGREE_OPTIONS: readonly string[] = [
  '小学', '初中', '高中', '中专', '大专', '本科', '硕士', '博士', '博士后', 'MBA',
]

export const CURRENT_STATUS_OPTIONS: readonly string[] = [
  '离职，可快速到岗',
  '在职，考虑好的机会',
  '在职，暂不考虑',
  '应届，求职中',
]

export const POLITICAL_STATUS_OPTIONS: readonly string[] = [
  '群众', '共青团员', '中共党员', '中共预备党员', '民主党派',
]
