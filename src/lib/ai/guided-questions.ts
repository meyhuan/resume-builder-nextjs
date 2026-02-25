/**
 * Guided questions configuration for AI section content generation.
 *
 * Questions are organized by module type × identity, with required/optional markers.
 * The "AI帮我写" flow uses these to collect user facts before generation.
 */
import type { SectionIdentity, SectionModuleType } from '@/lib/ai/section-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GuidedQuestion {
  readonly key: string;
  readonly label: string;
  readonly placeholder: string;
  readonly required: boolean;
  readonly multiline?: boolean;
  /** If set, this question can be auto-filled from the block's structured data. */
  readonly autoFillKey?: string;
}

export interface GuidedQuestionSet {
  readonly questions: readonly GuidedQuestion[];
}

// ---------------------------------------------------------------------------
// Experience module questions
// ---------------------------------------------------------------------------

const EXPERIENCE_QUESTIONS_STUDENT: GuidedQuestionSet = {
  questions: [
    { key: 'companyAndRole', label: '公司名称 + 实习岗位 + 实习时间', placeholder: '如：字节跳动 内容运营实习生 2025.01-2025.06', required: true, autoFillKey: 'companyAndRole' },
    { key: 'dailyWork', label: '你日常主要负责哪些具体工作？', placeholder: '请如实填写你每天做的事，越详细越好', required: true, multiline: true },
    { key: 'collaboration', label: '你配合/参与过哪些具体事项？', placeholder: '如：配合团队完成了XX活动的策划执行', required: true, multiline: true },
    { key: 'tools', label: '你用到了哪些工具/技能？', placeholder: '如：Excel、Figma、Python、飞书文档等', required: false },
    { key: 'standards', label: '这项工作需要遵循哪些规范/制度？', placeholder: '如：需要按照SOP流程执行、遵守内容审核规范等', required: false },
    { key: 'learning', label: '你在这段实习中学到了什么？', placeholder: '如：学会了数据分析的基本方法', required: false },
  ],
};

const EXPERIENCE_QUESTIONS_GRADUATE: GuidedQuestionSet = {
  questions: [
    { key: 'companyAndRole', label: '公司名称 + 岗位名称 + 任职时间', placeholder: '如：阿里巴巴 产品运营实习 2024.06-2024.12', required: true, autoFillKey: 'companyAndRole' },
    { key: 'dailyWork', label: '你主要负责哪些具体工作？', placeholder: '请详细描述你的核心工作内容', required: true, multiline: true },
    { key: 'achievements', label: '你独立完成或推动过哪些具体事项？', placeholder: '如：独立负责了XX模块的需求文档撰写', required: true, multiline: true },
    { key: 'tools', label: '你用到了哪些工具/技术栈？', placeholder: '如：SQL、Tableau、Axure、JIRA等', required: false },
    { key: 'results', label: '这些工作的产出/成果是什么？（如有数据请如实填写）', placeholder: '如：完成了3篇需求文档，覆盖2个核心功能模块', required: false, multiline: true },
  ],
};

const EXPERIENCE_QUESTIONS_PROFESSIONAL: GuidedQuestionSet = {
  questions: [
    { key: 'companyAndRole', label: '公司名称 + 岗位名称 + 任职时间', placeholder: '如：腾讯 高级产品经理 2023.03-至今', required: true, autoFillKey: 'companyAndRole' },
    { key: 'dailyWork', label: '你的核心工作职责是什么？', placeholder: '请描述你的核心业务和负责范围', required: true, multiline: true },
    { key: 'achievements', label: '你主导或负责过哪些重要项目/事项？', placeholder: '如：主导了XX系统的V2.0改版', required: true, multiline: true },
    { key: 'results', label: '取得了哪些业务成果？（如有数据请如实填写）', placeholder: '如：上线后用户活跃度提升了20%，日活从5万增长到6万', required: false, multiline: true },
    { key: 'tools', label: '核心技术栈/工具/方法论？', placeholder: '如：敏捷开发、OKR、数据驱动决策', required: false },
    { key: 'challenges', label: '遇到过什么难题？你是怎么解决的？', placeholder: '如：系统并发问题，通过引入缓存和消息队列解决', required: false, multiline: true },
  ],
};

// ---------------------------------------------------------------------------
// Project module questions
// ---------------------------------------------------------------------------

const PROJECT_QUESTIONS_STUDENT: GuidedQuestionSet = {
  questions: [
    { key: 'projectName', label: '项目名称 + 你的角色 + 项目时间', placeholder: '如：校园二手交易平台 前端开发 2024.09-2024.12', required: true, autoFillKey: 'projectNameAndRole' },
    { key: 'background', label: '这个项目的背景/目的是什么？', placeholder: '如：课程大作业，目标是搭建一个校内二手交易平台', required: true, multiline: true },
    { key: 'personalWork', label: '你个人具体做了什么？', placeholder: '请描述你在项目中的具体工作，不要写团队整体的工作', required: true, multiline: true },
    { key: 'tools', label: '用到了哪些技术/工具？', placeholder: '如：React、Node.js、MySQL', required: false },
    { key: 'result', label: '项目最终结果如何？', placeholder: '如：成功上线并在校内推广，获得XX名用户使用', required: false },
  ],
};

const PROJECT_QUESTIONS_GRADUATE: GuidedQuestionSet = {
  questions: [
    { key: 'projectName', label: '项目名称 + 你的角色 + 项目时间', placeholder: '如：智能客服系统 后端开发 2024.03-2024.08', required: true, autoFillKey: 'projectNameAndRole' },
    { key: 'background', label: '项目背景和目标是什么？', placeholder: '如：为解决客户咨询效率问题，搭建智能客服系统', required: true, multiline: true },
    { key: 'personalWork', label: '你个人负责哪些部分？', placeholder: '请只写你自己的贡献，不要写团队的', required: true, multiline: true },
    { key: 'tools', label: '核心技术栈？', placeholder: '如：Spring Boot、Redis、Elasticsearch', required: false },
    { key: 'result', label: '项目成果和你的贡献？（如有数据请如实填写）', placeholder: '如：系统上线后日处理咨询量达到XX条', required: false, multiline: true },
  ],
};

const PROJECT_QUESTIONS_PROFESSIONAL: GuidedQuestionSet = {
  questions: [
    { key: 'projectName', label: '项目名称 + 你的角色 + 项目周期', placeholder: '如：用户增长体系搭建 项目负责人 2023.06-2024.01', required: true, autoFillKey: 'projectNameAndRole' },
    { key: 'background', label: '项目背景和业务目标？', placeholder: '如：公司用户增长遇到瓶颈，需要搭建系统化的增长体系', required: true, multiline: true },
    { key: 'personalWork', label: '你主导/负责了哪些核心工作？', placeholder: '请描述你的核心贡献和决策', required: true, multiline: true },
    { key: 'result', label: '项目业务成果？（如有数据请如实填写）', placeholder: '如：3个月内新增注册用户5万，获客成本降低30%', required: false, multiline: true },
    { key: 'challenges', label: '遇到什么技术/业务难点？如何解决？', placeholder: '如：数据孤岛问题，通过建设统一数据中台解决', required: false, multiline: true },
  ],
};

// ---------------------------------------------------------------------------
// Campus module questions
// ---------------------------------------------------------------------------

const CAMPUS_QUESTIONS: GuidedQuestionSet = {
  questions: [
    { key: 'orgAndRole', label: '组织/社团名称 + 你的职务 + 时间', placeholder: '如：校学生会 外联部部长 2023.09-2024.06', required: true, autoFillKey: 'orgAndRole' },
    { key: 'activities', label: '你具体做了哪些事情？', placeholder: '如：策划组织了XX活动、负责联系赞助商等', required: true, multiline: true },
    { key: 'result', label: '活动/工作的结果如何？', placeholder: '如：活动吸引了500人参与、成功拉到3家赞助', required: false, multiline: true },
    { key: 'skills', label: '从中锻炼了什么能力？', placeholder: '如：沟通协调能力、活动策划能力', required: false },
  ],
};

// ---------------------------------------------------------------------------
// Self-evaluation module questions
// ---------------------------------------------------------------------------

const SELF_EVALUATION_QUESTIONS_STUDENT: GuidedQuestionSet = {
  questions: [
    { key: 'coreStrength', label: '你觉得自己最大的优势是什么？', placeholder: '如：学习能力强、沟通能力好、对XX领域有浓厚兴趣', required: true, multiline: true },
    { key: 'relevantExperience', label: '你有哪些与目标岗位相关的经历？', placeholder: '如：做过XX实习、参与过XX项目', required: true },
    { key: 'jobWish', label: '你对目标岗位的求职意愿？', placeholder: '如：希望在XX领域深耕，可长期实习', required: false },
  ],
};

const SELF_EVALUATION_QUESTIONS_GRADUATE: GuidedQuestionSet = {
  questions: [
    { key: 'coreStrength', label: '你的核心竞争力是什么？', placeholder: '如：有XX实习经验、掌握XX技能、XX方面能力突出', required: true, multiline: true },
    { key: 'relevantExperience', label: '你认为自己最匹配目标岗位的经历是？', placeholder: '如：在XX公司实习期间独立负责了XX项目', required: true },
    { key: 'jobWish', label: '你的职业发展意愿？', placeholder: '如：希望在XX行业长期发展', required: false },
  ],
};

const SELF_EVALUATION_QUESTIONS_PROFESSIONAL: GuidedQuestionSet = {
  questions: [
    { key: 'coreStrength', label: '你的核心专业能力和优势？', placeholder: '如：3年XX领域经验、擅长XX、具备XX方法论', required: true, multiline: true },
    { key: 'achievements', label: '你最有代表性的业务成果？', placeholder: '如：主导XX项目实现了XX结果', required: true },
    { key: 'jobWish', label: '你的求职方向和职业规划？', placeholder: '如：希望在XX方向继续深耕，目标是XX', required: false },
  ],
};

// ---------------------------------------------------------------------------
// Skills module questions
// ---------------------------------------------------------------------------

const SKILLS_QUESTIONS: GuidedQuestionSet = {
  questions: [
    { key: 'hardSkills', label: '你掌握的专业/技术技能？', placeholder: '如：Python（熟练）、SQL（掌握）、Photoshop（了解）', required: true, multiline: true },
    { key: 'softSkills', label: '你的软技能/通用能力？', placeholder: '如：团队协作、跨部门沟通、项目管理', required: false },
    { key: 'certifications', label: '相关证书/资质？', placeholder: '如：CET-6、PMP、AWS认证', required: false },
  ],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the guided question set for a given module type and identity.
 */
export function getGuidedQuestions(
  moduleType: SectionModuleType,
  identity: SectionIdentity,
): GuidedQuestionSet {
  switch (moduleType) {
    case 'experience':
      return identity === 'student'
        ? EXPERIENCE_QUESTIONS_STUDENT
        : identity === 'graduate'
          ? EXPERIENCE_QUESTIONS_GRADUATE
          : EXPERIENCE_QUESTIONS_PROFESSIONAL;
    case 'project':
      return identity === 'student'
        ? PROJECT_QUESTIONS_STUDENT
        : identity === 'graduate'
          ? PROJECT_QUESTIONS_GRADUATE
          : PROJECT_QUESTIONS_PROFESSIONAL;
    case 'campus':
      return CAMPUS_QUESTIONS;
    case 'self-evaluation':
      return identity === 'student'
        ? SELF_EVALUATION_QUESTIONS_STUDENT
        : identity === 'graduate'
          ? SELF_EVALUATION_QUESTIONS_GRADUATE
          : SELF_EVALUATION_QUESTIONS_PROFESSIONAL;
    case 'skills':
      return SKILLS_QUESTIONS;
    default:
      return SKILLS_QUESTIONS;
  }
}
