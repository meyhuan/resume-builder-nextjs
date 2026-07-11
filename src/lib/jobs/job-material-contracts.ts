export const JOB_MATERIAL_TYPES = ['SELF_INTRO', 'COVER_LETTER', 'OUTREACH', 'PROJECT_STORY', 'INTERVIEW_PREP'] as const
export type JobMaterialType = (typeof JOB_MATERIAL_TYPES)[number]

interface JobMaterialMeta {
  readonly slug: string
  readonly label: string
  readonly title: string
  readonly description: string
  readonly outputGuide: string
}

export const JOB_MATERIAL_META: Record<JobMaterialType, JobMaterialMeta> = {
  SELF_INTRO: {
    slug: 'self-intro',
    label: '自我介绍',
    title: '岗位自我介绍',
    description: '准备 30 秒、1 分钟和 3 分钟三个面试开场版本。',
    outputGuide: '输出三个版本，使用“## 30 秒版本”“## 1 分钟版本”“## 3 分钟版本”作为标题。重点说明岗位方向、相关经历和可验证结果。',
  },
  COVER_LETTER: {
    slug: 'cover-letter',
    label: '求职信',
    title: '岗位求职信',
    description: '生成可继续编辑的正式求职信草稿。',
    outputGuide: '输出一封简洁、正式的中文求职信，包含应聘意图、匹配经历、真实优势和礼貌结尾，不虚构对公司的了解。',
  },
  OUTREACH: {
    slug: 'outreach',
    label: '沟通话术',
    title: '招聘沟通话术',
    description: '准备招聘平台首句、邮件正文、内推和跟进话术。',
    outputGuide: '依次输出“## 招聘平台首句”“## 邮件投递正文”“## 内推请求”“## 投递后跟进”，每段简洁自然，避免模板腔。',
  },
  PROJECT_STORY: {
    slug: 'project-story',
    label: '项目讲述卡',
    title: '项目讲述卡',
    description: '把真实项目整理成背景、行动、结果和追问素材。',
    outputGuide: '选择与岗位最相关的真实项目，按“背景、目标、个人职责、关键行动、结果证据、可能追问、仍需补充的事实”组织。没有结果数据时明确标注待补充。',
  },
  INTERVIEW_PREP: {
    slug: 'interview-prep',
    label: '面试准备',
    title: '岗位面试准备',
    description: '根据 JD 和简历准备问题、回答提纲与反问。',
    outputGuide: '输出“## 高概率问题”“## 基于事实的回答提纲”“## 需要补充准备”“## 反问面试官”。回答只给提纲，不冒充用户编造完整经历。',
  },
}

export function isJobMaterialType(value: string): value is JobMaterialType {
  return JOB_MATERIAL_TYPES.includes(value as JobMaterialType)
}

export function getJobMaterialTypeBySlug(slug: string): JobMaterialType | null {
  return JOB_MATERIAL_TYPES.find((type) => JOB_MATERIAL_META[type].slug === slug) ?? null
}

export interface JobMaterialContent {
  readonly format: 'markdown'
  readonly text: string
}

export function parseJobMaterialContent(value: unknown): JobMaterialContent {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    if (record.format === 'markdown' && typeof record.text === 'string') return { format: 'markdown', text: record.text }
  }
  return { format: 'markdown', text: '' }
}
