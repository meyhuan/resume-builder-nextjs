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
    outputGuide: '准备 30 秒、1 分钟、3 分钟三个独立版本；短版只选一个最强证据，标准版选 2-3 个证据，详细版最多选 5 个。表达应口语化，突出岗位方向、个人行动和可验证结果。',
  },
  COVER_LETTER: {
    slug: 'cover-letter',
    label: '求职信',
    title: '岗位求职信',
    description: '生成可继续编辑的正式求职信草稿。',
    outputGuide: '准备 250-450 字的简洁中文求职信，只选择 2-3 个最强匹配证据；包含应聘意图、真实优势和礼貌结尾，不虚构对公司文化、业务或团队的了解。',
  },
  OUTREACH: {
    slug: 'outreach',
    label: '沟通话术',
    title: '招聘沟通话术',
    description: '准备招聘平台首句、邮件正文、内推和跟进话术。',
    outputGuide: '分别准备招聘平台首句、邮件投递正文、内推请求和投递后跟进；平台首句不超过 100 字，内推请求不得假装与对方熟悉，每段只保留当前沟通场景需要的证据。',
  },
  PROJECT_STORY: {
    slug: 'project-story',
    label: '项目讲述卡',
    title: '项目讲述卡',
    description: '把真实项目整理成背景、行动、结果和追问素材。',
    outputGuide: '只选择一个与岗位最相关的真实项目或工作案例，梳理背景、目标、个人职责、关键行动和结果证据；严格保留原有动作强度，没有结果数据时转为具体补充问题，不在正文放占位符。',
  },
  INTERVIEW_PREP: {
    slug: 'interview-prep',
    label: '面试准备',
    title: '岗位面试准备',
    description: '根据 JD 和简历准备问题、回答提纲与反问。',
    outputGuide: '围绕 JD 准备 6-10 个重点可能问题、基于事实的回答提纲、需要补充准备的信息和反问面试官的问题；对于没有直接经验的要求，给出诚实的可迁移证据方向，不冒充用户编造经历。',
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
  readonly missingInfo?: readonly JobMaterialMissingInfo[]
}

export interface JobMaterialMissingInfo {
  readonly question: string
  readonly reason: string
}

export function parseJobMaterialContent(value: unknown): JobMaterialContent {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    if (record.format === 'markdown' && typeof record.text === 'string') {
      const missingInfo = Array.isArray(record.missingInfo)
        ? record.missingInfo.flatMap((item) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return []
          const value = item as Record<string, unknown>
          return typeof value.question === 'string' && typeof value.reason === 'string'
            ? [{ question: value.question, reason: value.reason }]
            : []
        })
        : []
      return { format: 'markdown', text: record.text, missingInfo }
    }
  }
  return { format: 'markdown', text: '' }
}
