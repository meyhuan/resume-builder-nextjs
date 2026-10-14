export interface XhsTopic {
  readonly key: string
  readonly name: string
  readonly exampleTitle: string
  readonly hint: string
  readonly recommended: boolean
  readonly icon: string
}

export const XHS_TOPICS: readonly XhsTopic[] = [
  {
    key: 'before-after',
    name: '我用 AI 把简历从流水账改清楚',
    exampleTitle: '简历只会写负责？改成这句',
    hint: '前后对比，方便别人照着改',
    recommended: true,
    icon: '✨',
  },
  {
    key: 'pitfalls',
    name: '应届生简历避坑 5 条',
    exampleTitle: '应届简历先别写这 5 句',
    hint: '干货清单，方便收藏',
    recommended: false,
    icon: '⚠️',
  },
  {
    key: 'hr-view',
    name: 'HR 筛简历到底看什么',
    exampleTitle: 'HR 翻简历先看这三行',
    hint: '讲筛选时看的结构，不讲录用结果',
    recommended: false,
    icon: '👀',
  },
  {
    key: 'template-share',
    name: '求职用的简历模板分享',
    exampleTitle: '我做简历时留下的模板',
    hint: '分享版式，不晒个人信息',
    recommended: false,
    icon: '📄',
  },
]

export const BRAND_TAGS = ['智简简历', '简历模板', '求职'] as const

export function findTopic(key: string): XhsTopic | undefined {
  return XHS_TOPICS.find((topic) => topic.key === key)
}

export function passphraseSentence(code: string): string {
  return `想要同款模板：小程序搜「智简简历」，输入口令 ${code}`
}
