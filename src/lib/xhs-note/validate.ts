import { BRAND_TAGS, findTopic } from '@/lib/xhs-note/topics'

export interface XhsCover {
  line1: string
  line2: string
  badge: string
  badCase?: string
  goodCase?: string
}

export interface XhsBeforeAfterItem {
  label: string
  bad: string
  good: string
}

export interface XhsNotePackage {
  titles: [string, string, string]
  body: string
  tags: string[]
  cover: XhsCover
  beforeAfter?: XhsBeforeAfterItem[]
  checklist?: string[]
}

const FORBIDDEN = [
  '保过',
  '包offer',
  '包 offer',
  '100%',
  '必过',
  '通过率',
  '录用率',
  '最好',
  '最强',
  '保证拿到',
  '完全免费',
  '永久免费',
  '无限次免费',
]

const TOPIC_SIGNALS: Record<string, string[]> = {
  'template-share': ['模板', '一页', '单页', '版式', '排版', '留白', '分区', '字号', '行距'],
  'pdf-import': ['PDF', '导入', '上传', '拆分', '模块'],
  'clean-export': ['导出', 'PDF', '水印', 'A4', '排版'],
  'first-draft': ['初稿', '框架', '模块', '空白页', '结构'],
  'cross-device': ['手机', '电脑', '同步', '小程序', '网页'],
  'before-after': ['改前', '改后', '负责', '参与', '动作', '交付'],
  'jd-align': ['JD', '岗位', '关键词', '匹配', '能力'],
  'one-page-fit': ['一页', '单页', '第二页', '精简', '留白'],
  'pitfalls': ['应届', '课程', '校园', '项目', '实习'],
  'career-switch': ['转岗', '跨专业', '迁移', '目标岗位'],
  'job-hop-night': ['在职', '下班', '更新', '项目', '经历'],
  'hr-view': ['投递', '文件名', '首屏', '自查', '联系方式'],
}

const GENERIC_BEFORE_AFTER: XhsBeforeAfterItem[] = [
  {
    label: '动词具体',
    bad: '负责日常内容运营与活动协助（示例）',
    good: '搭建内容排期表，按周复盘阅读与转化（示例）',
  },
  {
    label: '模块拆解',
    bad: '参与团队项目开发与测试工作（示例）',
    good: '独立承担检索模块接口联调与自测清单（示例）',
  },
  {
    label: '版式呈现',
    bad: '大段文字堆砌，重点淹没在第二页（示例）',
    good: '单页分区排布，每段经历控制在3行内（示例）',
  },
]

const GENERIC_CHECKLIST: string[] = [
  '把笼统的“负责/参与”替换为具体动作词与交付物',
  '每段经历控制在 3 行以内，重点匹配经历放首屏',
  '删掉主观空洞的自我评价，用具体项目产出说话',
  '导出 PDF 前核对一页纸留白与文件命名（岗位-姓名）',
]

export function charCount(value: string): number {
  return Array.from(value).length
}

export function validateXhsPackage(raw: unknown, topicKey = ''): string | null {
  if (!raw || typeof raw !== 'object') return '生成结果不是 JSON'
  const value = raw as Record<string, unknown>
  if (!Array.isArray(value.titles) || value.titles.length !== 3) return '需要 3 个标题'
  for (const title of value.titles) {
    if (typeof title !== 'string' || charCount(title.trim()) === 0 || charCount(title.trim()) > 20) {
      return '标题需在 20 字以内'
    }
  }
  if (typeof value.body !== 'string') return '缺少正文'
  const bodyLength = charCount(value.body.trim())
  if (bodyLength < 300 || bodyLength > 600) return '正文需在 300 到 600 字'
  if (!Array.isArray(value.tags) || value.tags.length < 6) return '话题不足 6 个'
  for (const brand of BRAND_TAGS) {
    if (!value.tags.includes(brand)) return '缺少品牌话题'
  }
  const cover = value.cover as Record<string, unknown> | undefined
  if (!cover || typeof cover.line1 !== 'string' || typeof cover.line2 !== 'string' || typeof cover.badge !== 'string') {
    return '封面文案不完整'
  }
  if (charCount(cover.line1.trim()) === 0 || charCount(cover.line1.trim()) > 18) return '封面主标题过长'
  const haystack = `${value.titles.join(' ')} ${value.body} ${cover.line1} ${cover.line2}`
  const hit = FORBIDDEN.find((word) => haystack.toLowerCase().includes(word.toLowerCase()))
  if (hit) return `包含禁用词：${hit}`
  const signals = TOPIC_SIGNALS[topicKey]
  if (signals && signals.filter((signal) => haystack.toLowerCase().includes(signal.toLowerCase())).length < 2) {
    return `内容与选题“${findTopic(topicKey)?.name || topicKey}”关联不足`
  }
  return null
}

export function normalizeXhsPackage(raw: unknown, topicKey = ''): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const value = { ...(raw as Record<string, unknown>) }
  const tags = Array.isArray(value.tags)
    ? value.tags.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.replace(/^#+/, '').trim()).filter(Boolean)
    : []
  value.tags = [...BRAND_TAGS, ...tags.filter((tag) => !BRAND_TAGS.includes(tag as typeof BRAND_TAGS[number]))].slice(0, 8)

  const topic = findTopic(topicKey)
  const rawPairs = Array.isArray(value.beforeAfter) ? value.beforeAfter : []
  const validPairs = rawPairs
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => ({
      label: typeof item.label === 'string' && item.label.trim() ? item.label.trim().slice(0, 8) : `要点 0${idx + 1}`,
      bad: typeof item.bad === 'string' ? item.bad.trim().slice(0, 34) : '',
      good: typeof item.good === 'string' ? item.good.trim().slice(0, 42) : '',
    }))
    .filter((item) => item.bad && item.good)
    .slice(0, 3)

  if (validPairs.length >= 2) {
    value.beforeAfter = validPairs
  } else if (topic) {
    value.beforeAfter = [
      { label: topic.tagLabel, bad: topic.previewBad, good: topic.previewGood },
      ...GENERIC_BEFORE_AFTER.slice(0, 2),
    ]
  } else {
    value.beforeAfter = GENERIC_BEFORE_AFTER
  }

  const rawChecklist = Array.isArray(value.checklist) ? value.checklist : []
  const validChecklist = rawChecklist
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim().slice(0, 44))
    .slice(0, 4)
  value.checklist = validChecklist.length >= 3 ? validChecklist : GENERIC_CHECKLIST

  if (value.cover && typeof value.cover === 'object') {
    const cover = { ...(value.cover as Record<string, unknown>) }
    const firstPair = (value.beforeAfter as XhsBeforeAfterItem[])[0]
    if ((typeof cover.badCase !== 'string' || !cover.badCase.trim()) && firstPair) {
      cover.badCase = firstPair.bad
    }
    if ((typeof cover.goodCase !== 'string' || !cover.goodCase.trim()) && firstPair) {
      cover.goodCase = firstPair.good
    }
    value.cover = cover
  }

  return value
}
