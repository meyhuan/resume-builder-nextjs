import type { ResumeData } from '@/entities/resume/resume-data'

export interface ResumeScenario {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly resume: ResumeData
}

const productFullResume: ResumeData = {
  id: 'scenario-product-full',
  name: '李小满',
  baseInfo: {
    title: '初级产品经理',
    phone: '188-8888-8888',
    email: 'lixiaoman@example.com',
    gender: '女',
    age: 23,
    currentLocation: '上海',
    workStartTime: '2025.07',
    nation: '汉族',
    household: '江苏南京',
    politicalStatus: '中共党员',
    height: '165',
    weight: '50',
    showAvatar: true,
    customFields: [
      { label: '个人主页', value: 'portfolio.example.com' },
      { label: '到岗时间', value: '两周内' },
    ],
  },
  jobIntention: {
    position: '产品助理',
    city: '上海 / 杭州',
    salary: '8k-12k',
    type: '全职',
    industry: '互联网 / AI应用',
    currentStatus: '应届毕业生',
    customFields: [
      { label: '方向', value: 'B端SaaS / 增长产品' },
    ],
  },
  jobIntentionVisible: true,
  sections: [
    {
      id: 'scenario-product-education',
      title: '教育经历',
      columns: 1,
      blocks: [
        {
          id: 'scenario-product-edu-1',
          type: 'education',
          school: '夸克大学',
          major: '计算机科学与技术',
          degree: '本科',
          startDate: '2020.09',
          endDate: '2024.06',
          courseHtml: '<p>GPA：3.7/4.0。主修课程：数据结构与算法、操作系统、数据库系统、计算机网络、编译原理、人工智能、机器学习、软件工程、计算机图形学、分布式系统。</p>',
        },
      ],
    },
    {
      id: 'scenario-product-intern',
      title: '实习经历',
      columns: 1,
      blocks: [
        {
          id: 'scenario-product-intern-1',
          type: 'experience',
          company: '上海星河智能科技有限公司',
          position: '产品助理',
          industry: '人工智能',
          startDate: '2024.03',
          endDate: '2024.08',
          contentHtml: '<p>产品需求分析：协助产品经理完成市场调研与用户访谈，梳理18份竞品分析和32条核心需求，输出需求池与优先级评估表。</p><p>产品开发支持：参与PRD撰写、原型评审和测试验收，跟进设计、前端、后端与测试排期，推动3个功能按期上线。</p><p>数据分析与优化：基于埋点数据分析转化漏斗，提出注册流程优化方案，使关键步骤完成率提升12%。</p>',
        },
      ],
    },
    {
      id: 'scenario-product-projects',
      title: '项目经历',
      columns: 1,
      blocks: [
        {
          id: 'scenario-product-project-1',
          type: 'project',
          name: '校园社交应用MVP',
          role: '项目负责人',
          startDate: '2023.09',
          endDate: '2024.01',
          contentHtml: '<p>项目概述：面向大学生的校园社交应用，包含公告板、活动发布、兴趣小组与私信模块。</p><p>核心职责：完成用户调研、需求拆解、信息架构、Figma高保真原型和版本排期，组织5人团队进行开发测试。</p><p>成果亮点：上线后一个月累计注册用户520人，活动发布量86条，用户满意度问卷平均分4.5/5。</p>',
        },
        {
          id: 'scenario-product-project-2',
          type: 'project',
          name: 'AI简历优化助手',
          role: '产品策划',
          startDate: '2024.02',
          endDate: '2024.05',
          contentHtml: '<p>负责岗位画像、简历诊断、AI改写建议三个核心模块的需求设计；设计多轮引导流程，使用户从导入简历到生成优化建议的路径控制在3步内。</p>',
        },
      ],
    },
    {
      id: 'scenario-product-campus',
      title: '校园经历',
      columns: 1,
      blocks: [
        {
          id: 'scenario-product-campus-1',
          type: 'campus',
          organization: '学生会宣传部',
          position: '部长',
          startDate: '2021.09',
          endDate: '2023.06',
          contentHtml: '<p>负责公众号日常内容更新与活动宣传，组织20人团队完成校园文化节、新生入学宣讲等活动传播，单篇文章最高阅读量突破5000，活动报名人数提升35%。</p>',
        },
      ],
    },
    {
      id: 'scenario-product-skills',
      title: '职业技能',
      columns: 1,
      blocks: [
        {
          id: 'scenario-product-skills-text',
          type: 'text',
          html: '<p>市场调研：熟悉用户访谈、问卷设计、竞品分析与需求优先级评估。</p><p>产品设计：能够独立撰写PRD，熟练使用Figma、Axure绘制原型。</p><p>数据分析：掌握Excel、SQL基础，能够进行漏斗分析、留存分析与可视化表达。</p>',
        },
      ],
    },
    {
      id: 'scenario-product-summary',
      title: '自我评价',
      columns: 1,
      blocks: [
        {
          id: 'scenario-product-summary-text',
          type: 'text',
          html: '<p>计算机科学背景，理解技术实现边界，具备从用户需求到产品方案的完整思考能力。擅长跨角色沟通和项目推进，能够将复杂问题拆解为明确任务，并通过数据验证产品优化方向。</p>',
        },
      ],
    },
    {
      id: 'scenario-product-custom',
      title: '获奖证书',
      columns: 1,
      blocks: [
        {
          id: 'scenario-product-custom-text',
          type: 'text',
          html: '<p>校级一等奖学金、优秀学生干部、全国大学生创新创业训练计划省级立项、CET-6。</p>',
        },
      ],
    },
  ],
}

const longContentResume: ResumeData = {
  ...productFullResume,
  id: 'scenario-long-content',
  name: '欧阳晨曦',
  baseInfo: {
    ...productFullResume.baseInfo,
    title: '资深增长产品经理 / 商业化策略负责人',
    email: 'ouyang.chenxi.long.name@example-company-domain.com',
    customFields: [
      { label: 'LinkedIn', value: 'linkedin.com/in/ouyangchenxi-product-growth-strategy' },
      { label: '期望工作模式', value: '远程优先 / 可接受阶段性出差' },
      { label: '作品集', value: 'portfolio.example.com/product/growth/case-study' },
    ],
  },
  jobIntention: {
    position: '高级增长产品经理',
    city: '北京 / 上海 / 深圳 / 远程',
    salary: '35k-50k * 16薪',
    type: '全职',
    industry: 'AI工具、B端SaaS、企业服务、数据智能',
    currentStatus: '在职，机会合适可一个月内到岗',
    customFields: [
      { label: '管理经验', value: '带过4人产品小组' },
      { label: '核心能力', value: '增长策略、商业化、数据分析、跨团队推进' },
    ],
  },
  sections: [
    {
      id: 'scenario-long-experience',
      title: '工作经历',
      columns: 1,
      blocks: [
        {
          id: 'scenario-long-exp-1',
          type: 'experience',
          company: '北京云启未来智能科技股份有限公司商业化增长产品中心',
          position: '高级增长产品经理',
          industry: 'AI SaaS',
          startDate: '2021.04',
          endDate: '至今',
          contentHtml: '<p>负责AI写作与数据分析产品的商业化增长，覆盖新用户激活、免费到付费转化、企业版线索收集、续费召回等链路。通过用户分层、行为埋点、A/B实验和销售线索评分模型，将免费用户到付费用户转化率从3.8%提升至6.1%。</p><p>牵头搭建增长实验流程，与数据、研发、设计、运营和销售团队协作，建立从问题定义、假设提出、实验设计、数据复盘到策略沉淀的闭环机制，季度内完成27个实验，其中9个实验进入长期策略。</p><p>推进企业版试用流程重构，将原本分散在官网、客服和销售表单中的线索收集路径统一为分步式试用引导，线索有效率提升28%，销售跟进效率提升19%。</p>',
        },
        {
          id: 'scenario-long-exp-2',
          type: 'experience',
          company: '上海海量增长网络科技有限公司用户增长平台部',
          position: '增长产品经理',
          industry: '互联网平台',
          startDate: '2018.07',
          endDate: '2021.03',
          contentHtml: '<p>负责内容社区用户增长工具建设，支持裂变活动、积分任务、权益发放和内容推荐策略配置。推动活动配置平台从人工开发模式升级为可视化配置模式，使运营活动平均上线周期从5天缩短至1.5天。</p><p>围绕新用户首日行为设计任务体系，通过关注推荐、兴趣选择、首评激励和连续签到组合策略，使新用户次日留存提升7.4个百分点。</p>',
        },
      ],
    },
    {
      id: 'scenario-long-projects',
      title: '项目经历',
      columns: 1,
      blocks: [
        {
          id: 'scenario-long-project-1',
          type: 'project',
          name: '企业版商业化线索评分与试用转化系统',
          role: '产品负责人',
          startDate: '2022.10',
          endDate: '2023.06',
          contentHtml: '<p>背景：企业版线索来源复杂，销售无法判断线索质量，导致大量时间消耗在低意向用户上。</p><p>方案：基于用户注册来源、团队成员数、功能使用深度、导出次数、协作行为和付费页面访问等指标构建评分模型，并在CRM中同步展示线索等级、推荐跟进动作和关键行为摘要。</p><p>结果：高意向线索识别准确率提升至72%，销售首响时间缩短31%，企业版试用到付费转化率提升18%。</p>',
        },
      ],
    },
    {
      id: 'scenario-long-education',
      title: '教育经历',
      columns: 1,
      blocks: [
        {
          id: 'scenario-long-edu-1',
          type: 'education',
          school: '华东师范大学',
          major: '信息管理与信息系统',
          degree: '本科',
          startDate: '2014.09',
          endDate: '2018.06',
          courseHtml: '<p>主修课程：管理信息系统、数据结构、数据库原理、统计学、消费者行为学、产品设计方法、运营管理。GPA 3.8/4.0，连续三年获得校级奖学金。</p>',
        },
      ],
    },
    {
      id: 'scenario-long-summary',
      title: '自我评价',
      columns: 1,
      blocks: [
        {
          id: 'scenario-long-summary-text',
          type: 'text',
          html: '<p>具备7年互联网产品经验，长期聚焦增长、商业化和B端SaaS产品。擅长在复杂业务中定位关键问题，基于数据提出策略并推动多团队落地。既能做用户研究和方案设计，也能深入数据口径、实验方案和转化漏斗细节，对结果负责。</p>',
        },
      ],
    },
  ],
}

const compactResume: ResumeData = {
  id: 'scenario-compact',
  name: '陈一',
  baseInfo: {
    title: '前端实习生',
    phone: '13900001111',
    email: 'chenyi@example.com',
    gender: '男',
    age: 21,
    currentLocation: '广州',
    showAvatar: true,
  },
  jobIntention: {
    position: '前端开发实习生',
    city: '广州',
    salary: '面议',
    type: '实习',
  },
  jobIntentionVisible: true,
  sections: [
    {
      id: 'scenario-compact-education',
      title: '教育经历',
      columns: 1,
      blocks: [
        {
          id: 'scenario-compact-edu-1',
          type: 'education',
          school: '华南理工大学',
          major: '软件工程',
          degree: '本科',
          startDate: '2022.09',
          endDate: '2026.06',
          courseHtml: '<p>主修课程：Web开发、数据结构、数据库系统。</p>',
        },
      ],
    },
    {
      id: 'scenario-compact-project',
      title: '项目经历',
      columns: 1,
      blocks: [
        {
          id: 'scenario-compact-project-1',
          type: 'project',
          name: '个人博客系统',
          role: '前端开发',
          startDate: '2024.03',
          endDate: '2024.05',
          contentHtml: '<p>使用React完成文章列表、详情页和后台编辑功能。</p>',
        },
      ],
    },
    {
      id: 'scenario-compact-skills',
      title: '职业技能',
      columns: 1,
      blocks: [
        { id: 'scenario-compact-skills-text', type: 'text', html: '<p>熟悉HTML、CSS、JavaScript、React。</p>' },
      ],
    },
  ],
}

const edgeCaseResume: ResumeData = {
  id: 'scenario-edge-case',
  name: '无头像边界测试',
  baseInfo: {
    title: '测试岗位',
    phone: '10086',
    email: 'edge@example.com',
    showAvatar: false,
    customFields: [
      { label: '超长自定义字段名称用于测试换行', value: '这是一个很长很长的字段值，用来观察头部信息是否会撑破布局或者出现遮挡' },
      { label: '空白边界', value: '仅用于布局测试' },
    ],
  },
  jobIntention: {
    position: '隐藏求职意向测试',
    city: '不限',
    salary: '不限',
    type: '灵活',
  },
  jobIntentionVisible: false,
  sections: [
    {
      id: 'scenario-edge-two-column',
      title: '双列能力',
      columns: 2,
      blocks: [
        { id: 'scenario-edge-text-1', type: 'text', html: '<p>左侧短文本。</p>' },
        { id: 'scenario-edge-text-2', type: 'text', html: '<p>右侧稍长一点的文本，用于观察双列模块在不同模板里的排列情况。</p>' },
      ],
    },
    {
      id: 'scenario-edge-emptyish',
      title: '极短模块',
      columns: 1,
      blocks: [
        { id: 'scenario-edge-short', type: 'text', html: '<p>短。</p>' },
      ],
    },
    {
      id: 'scenario-edge-custom',
      title: '自定义很长很长的模块标题用于测试标题换行',
      columns: 1,
      blocks: [
        {
          id: 'scenario-edge-custom-text',
          type: 'text',
          html: '<p>自定义模块内容，包含中文、English words、数字123456和标点符号，用来测试字体、行高、换行与导出表现。</p>',
        },
      ],
    },
  ],
}

export const RESUME_SCENARIOS: readonly ResumeScenario[] = [
  {
    id: 'product-full',
    name: '完整产品岗',
    description: '覆盖基础信息、求职意向、教育、实习、项目、校园、技能、自评和自定义模块。',
    resume: productFullResume,
  },
  {
    id: 'long-content',
    name: '长内容压力',
    description: '长公司名、长字段、长段落，测试换行、溢出和分页。',
    resume: longContentResume,
  },
  {
    id: 'compact',
    name: '短内容简历',
    description: '内容很短，测试模板空白、节奏和模块间距。',
    resume: compactResume,
  },
  {
    id: 'edge-case',
    name: '边界场景',
    description: '隐藏头像、隐藏求职意向、双列模块和长自定义字段。',
    resume: edgeCaseResume,
  },
]

