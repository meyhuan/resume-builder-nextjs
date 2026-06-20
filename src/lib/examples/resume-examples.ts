export type ResumeExampleFaq = {
  readonly question: string;
  readonly answer: string;
};

export type ResumeExample = {
  readonly slug: string;
  readonly role: string;
  readonly title: string;
  readonly description: string;
  readonly keywords: readonly string[];
  readonly sampleResumeHtml: string;
  readonly writingTips: readonly string[];
  readonly commonMistakes: readonly string[];
  readonly audience: readonly string[];
  readonly relatedTemplateSlugs: readonly string[];
  readonly faq: readonly ResumeExampleFaq[];
  readonly updatedAt: string;
};

type SampleResumeParams = {
  readonly role: string;
  readonly profile: string;
  readonly summary: string;
  readonly projects: readonly string[];
  readonly skills: readonly string[];
};

function createSampleResumeHtml(params: SampleResumeParams): string {
  const projectItems = params.projects.map((project) => `<li>${project}</li>`).join('');
  const skillItems = params.skills.map((skill) => `<li>${skill}</li>`).join('');
  return `
<h2>基本信息</h2>
<p>匿名候选人｜${params.role}｜${params.profile}｜期望城市：北京/上海/深圳/杭州</p>
<h2>个人优势</h2>
<p>${params.summary}</p>
<h2>项目经历</h2>
<ul>${projectItems}</ul>
<h2>技能关键词</h2>
<ul>${skillItems}</ul>
<h2>简历写作提醒</h2>
<p>这是一份匿名示例，用户应替换为自己的真实经历、真实数据和真实项目结果，不要直接复制不存在的职责或成果。</p>
`;
}

const defaultFaq = (role: string): readonly ResumeExampleFaq[] => [
  {
    question: `${role}简历范文可以直接照抄吗？`,
    answer: '不建议照抄。范文的价值是提供结构和表达方式，项目、数据、工具和结果必须替换成你的真实经历。',
  },
  {
    question: `${role}简历最应该突出什么？`,
    answer: '优先突出与目标 JD 最相关的项目经历、关键词和可验证结果，让招聘方快速判断你是否匹配岗位。',
  },
  {
    question: `没有完整 ${role} 经历怎么办？`,
    answer: '可以从课程项目、实习项目、开源项目、内部转岗项目或个人作品中提炼相关能力，但要明确说明项目背景和个人贡献。',
  },
];

export const resumeExamples: readonly ResumeExample[] = [
  {
    slug: 'ai-product-manager-resume-example',
    role: 'AI产品经理',
    title: 'AI产品经理简历范文：RAG、Agent 与模型评测项目怎么写',
    description: '适合投递 AI 产品经理、大模型产品经理和 AIGC 产品经理的简历范文，示例展示如何写业务问题、AI 方案、评测指标和上线结果。',
    keywords: ['AI产品经理简历范文', 'AI产品经理项目经历', 'RAG', 'AI Agent', '模型评测'],
    sampleResumeHtml: createSampleResumeHtml({
      role: 'AI产品经理',
      profile: '2 年互联网产品经验，参与企业知识库和智能客服项目',
      summary: '具备从业务问题拆解到 AI 产品方案落地的经验，熟悉 RAG、Prompt 编排、反馈闭环和模型效果评估，能与算法、后端、运营团队协作推进上线。',
      projects: [
        '企业知识库问答：负责文档上传、切片策略、向量检索、答案引用和反馈纠错流程设计，将高频问题首轮命中率提升至 82%。',
        '销售线索跟进 Agent：设计线索评分、客户画像补全、跟进话术生成和 CRM 写回流程，使销售准备时间从 15 分钟降低到 4 分钟。',
        '模型评测看板：梳理准确率、人工接管率、响应时延和 Token 成本指标，支持产品迭代优先级判断。',
      ],
      skills: ['需求分析', 'PRD', 'RAG', 'Prompt Engineering', 'AI Agent', '模型评测', 'A/B 测试', '跨团队协作'],
    }),
    writingTips: ['用“业务问题 + AI 方案 + 评测指标 + 结果”写项目。', '技能栏要区分产品方法、AI 技术理解和数据评测。', '避免只写概念，必须写清楚上线场景。'],
    commonMistakes: ['把自己写成算法工程师，缺少产品判断。', '只堆大模型名词，没有业务结果。', '没有说明生成质量如何评估。'],
    audience: ['正在投 AI 产品经理的人', '从传统产品转 AI 产品的人', '做过智能客服、知识库或 Agent 项目的人'],
    relatedTemplateSlugs: ['ai产品经理', '大模型产品经理', 'aigc产品经理'],
    faq: defaultFaq('AI产品经理'),
    updatedAt: '2026-06-21',
  },
  {
    slug: 'large-model-product-manager-resume-example',
    role: '大模型产品经理',
    title: '大模型产品经理简历范文：模型平台、评测与企业应用经历',
    description: '展示大模型产品经理如何把模型能力、企业场景、评测体系和商业化交付写进简历。',
    keywords: ['大模型产品经理简历范文', '模型评测', '企业大模型', '大模型应用'],
    sampleResumeHtml: createSampleResumeHtml({
      role: '大模型产品经理',
      profile: '3 年 B 端产品经验，参与企业大模型平台和知识库产品',
      summary: '熟悉企业大模型应用从需求调研、能力边界确认、评测集构建到上线运营的流程，能平衡准确性、成本、响应速度和用户体验。',
      projects: [
        '企业大模型平台：梳理模型接入、Prompt 模板、权限管理、调用统计和成本看板需求，支持 4 个业务线试点接入。',
        '评测集建设：联合业务专家沉淀 300+ 高频问题，建立准确性、可引用性、拒答率和人工接管率指标。',
        '知识库商业化交付：输出标准化售前 Demo、实施清单和客户反馈闭环，缩短项目交付准备周期。',
      ],
      skills: ['B端产品', '大模型平台', 'Prompt 模板', '模型评测', '知识库', '权限管理', '成本分析', '客户调研'],
    }),
    writingTips: ['强调平台能力和业务落地，不只写模型接入。', '把评测指标写清楚，体现产品判断。', '写清楚你如何推动算法、工程和业务协作。'],
    commonMistakes: ['只写“负责大模型产品”，没有说明产品形态。', '没有成本、延迟和准确性意识。', '缺少企业客户或业务方反馈。'],
    audience: ['B 端产品经理', '企业 AI 应用产品经理', '从 SaaS 产品转大模型产品的人'],
    relatedTemplateSlugs: ['大模型产品经理', 'ai产品经理'],
    faq: defaultFaq('大模型产品经理'),
    updatedAt: '2026-06-21',
  },
  {
    slug: 'aigc-product-manager-resume-example',
    role: 'AIGC产品经理',
    title: 'AIGC产品经理简历范文：内容生成、审核流与增长指标',
    description: '适合投递 AIGC 产品经理的简历范文，重点展示内容生成链路、素材生产效率和审核机制。',
    keywords: ['AIGC产品经理简历范文', 'AIGC产品', '内容生成', '审核流'],
    sampleResumeHtml: createSampleResumeHtml({
      role: 'AIGC产品经理',
      profile: '2 年内容产品经验，参与营销文案和图片生成工具',
      summary: '熟悉 AIGC 内容生产流程，能围绕用户目标、品牌语气、审核规则和生成质量建立产品闭环。',
      projects: [
        '营销文案生成工具：设计目标人群、卖点、语气和渠道参数，使运营团队活动文案初稿产出时间减少 60%。',
        '内容审核流：定义敏感词、事实核验、人工复审和版本回溯机制，降低不合规素材流出风险。',
        '模板增长实验：根据行业和节日场景沉淀 Prompt 模板，提升高频模板复用率。',
      ],
      skills: ['AIGC', '内容产品', 'Prompt 模板', '审核流', '增长实验', '用户反馈', '素材生产', '数据复盘'],
    }),
    writingTips: ['写清楚生成对象：文案、图片、视频、商品描述或营销素材。', '体现审核和质量控制，而不是只写提效。', '用采纳率、复用率、产出时间等指标量化。'],
    commonMistakes: ['只写“会用 AI 工具”。', '忽略版权、审核和品牌一致性。', '没有说明用户如何使用生成结果。'],
    audience: ['内容产品经理', 'AIGC 产品经理', '从运营转产品的人'],
    relatedTemplateSlugs: ['aigc产品经理', 'ai产品经理'],
    faq: defaultFaq('AIGC产品经理'),
    updatedAt: '2026-06-21',
  },
  {
    slug: 'aigc-operations-resume-example',
    role: 'AIGC运营',
    title: 'AIGC运营简历范文：内容生产、Prompt 模板与数据复盘',
    description: '展示 AIGC 运营如何把内容提效、Prompt 模板、账号增长和活动复盘写得更像业务成果。',
    keywords: ['AIGC运营简历范文', 'AIGC运营', 'Prompt模板', '内容运营'],
    sampleResumeHtml: createSampleResumeHtml({
      role: 'AIGC运营',
      profile: '1 年内容运营经验，负责 AI 工具内容生产和社媒分发',
      summary: '熟悉小红书、公众号和短视频内容运营，能用 AIGC 工具提升选题、初稿、配图和复盘效率，并沉淀可复用模板。',
      projects: [
        'AIGC 内容矩阵：围绕求职、效率工具和 AI 新职业策划 60+ 篇内容，建立选题库和 Prompt 模板库。',
        '小红书测试：按封面、标题、正文结构拆分实验，使收藏率较基线内容提升。',
        '社群运营：整理用户反馈和高频问题，反向补充产品 FAQ 和教程内容。',
      ],
      skills: ['内容运营', 'AIGC 工具', 'Prompt 模板', '小红书', '公众号', '选题策划', '数据复盘', '社群运营'],
    }),
    writingTips: ['把 AIGC 写成生产流程，而不是工具清单。', '运营简历要写渠道、动作和指标。', '把 Prompt 模板沉淀写成方法论。'],
    commonMistakes: ['只列 Midjourney、ChatGPT 等工具名。', '没有内容数据和复盘。', '缺少用户反馈闭环。'],
    audience: ['AIGC 运营求职者', '内容运营转 AI 方向的人', '新媒体运营升级 AIGC 方向的人'],
    relatedTemplateSlugs: ['aigc运营', 'ai内容运营', 'ai工具运营'],
    faq: defaultFaq('AIGC运营'),
    updatedAt: '2026-06-21',
  },
  {
    slug: 'prompt-engineer-resume-example',
    role: '提示词工程师',
    title: '提示词工程师简历范文：Prompt 设计、评测与工作流优化',
    description: '适合提示词工程师和 AI 应用运营岗位的简历范文，展示 Prompt 设计、测试集和效果评估。',
    keywords: ['提示词工程师简历范文', 'Prompt Engineer', '提示词工程', 'Prompt评测'],
    sampleResumeHtml: createSampleResumeHtml({
      role: '提示词工程师',
      profile: 'AI 应用项目经验，负责 Prompt 模板和输出质量优化',
      summary: '熟悉 Prompt 结构化设计、few-shot 示例、输出格式约束和评测集构建，能结合业务场景提升生成结果稳定性。',
      projects: [
        '客服问答 Prompt 优化：拆解角色设定、知识引用、拒答边界和输出格式，降低无关回答比例。',
        '内容生成模板库：为营销、客服和知识库场景沉淀 40+ Prompt 模板，支持运营团队复用。',
        '评测流程：建立人工评分表，覆盖准确性、完整性、语气一致性和可执行性。',
      ],
      skills: ['Prompt Engineering', 'few-shot', '输出格式约束', '评测集', 'RAG', '工作流设计', '内容质量评估'],
    }),
    writingTips: ['写具体业务场景，不要只写“会写提示词”。', '强调评测方法和迭代过程。', '展示模板库、工作流或自动化成果。'],
    commonMistakes: ['把岗位写成纯内容编辑。', '没有评测指标。', '忽略模型边界和安全约束。'],
    audience: ['提示词工程师求职者', 'AI 应用运营', '内容/运营转 AI 工具方向的人'],
    relatedTemplateSlugs: ['提示词工程师', 'aigc运营'],
    faq: defaultFaq('提示词工程师'),
    updatedAt: '2026-06-21',
  },
  {
    slug: 'rag-engineer-resume-example',
    role: 'RAG工程师',
    title: 'RAG工程师简历范文：检索增强、向量库与知识库问答',
    description: '适合 RAG 工程师和大模型应用工程师的简历范文，重点展示文档处理、向量检索、重排和答案引用。',
    keywords: ['RAG工程师简历范文', 'RAG', '向量数据库', '知识库问答', '大模型应用'],
    sampleResumeHtml: createSampleResumeHtml({
      role: 'RAG工程师',
      profile: '后端/AI 应用开发经验，参与企业知识库问答系统',
      summary: '熟悉 RAG 链路中的文档解析、切片、Embedding、向量检索、重排、Prompt 组装和答案引用，能根据业务反馈优化召回和生成质量。',
      projects: [
        '企业知识库问答：实现 PDF/Word 文档解析、段落切片、Embedding 入库和相似度检索，支持答案来源引用。',
        '召回优化：调整切片粒度、topK、重排策略和过滤条件，提升高频问题命中率。',
        '监控与反馈：记录用户问题、召回片段、答案评分和人工修正，用于后续评测集建设。',
      ],
      skills: ['RAG', 'Embedding', '向量数据库', '文档解析', 'rerank', 'LangChain', 'Node.js/Python', '模型评测'],
    }),
    writingTips: ['把 RAG 链路拆清楚，避免只写“接入大模型”。', '写出召回、重排、引用和评测。', '明确你负责工程实现还是算法优化。'],
    commonMistakes: ['没有说明文档来源和处理方式。', '只写框架名，不写业务效果。', '缺少问题日志和反馈闭环。'],
    audience: ['RAG 工程师', '大模型应用开发工程师', '后端工程师转 AI 应用的人'],
    relatedTemplateSlugs: ['rag工程师', '大模型应用工程师'],
    faq: defaultFaq('RAG工程师'),
    updatedAt: '2026-06-21',
  },
  {
    slug: 'ai-agent-engineer-resume-example',
    role: 'AI Agent工程师',
    title: 'AI Agent工程师简历范文：工具调用、工作流与自动化任务',
    description: '展示 AI Agent 工程师如何写工具调用、任务拆解、状态管理和业务自动化项目。',
    keywords: ['AI Agent工程师简历范文', 'AI Agent', '工具调用', '工作流自动化'],
    sampleResumeHtml: createSampleResumeHtml({
      role: 'AI Agent工程师',
      profile: 'AI 应用开发经验，参与销售和客服自动化 Agent 项目',
      summary: '熟悉 Agent 任务规划、工具调用、上下文管理、执行日志和异常兜底，能把大模型能力接入真实业务流程。',
      projects: [
        '销售跟进 Agent：实现线索读取、客户画像补全、话术生成和 CRM 写回工具调用流程。',
        '任务编排：设计多步骤执行状态、重试策略和人工接管机制，降低自动化失败影响。',
        '效果追踪：记录任务完成率、人工接管率、响应时延和用户反馈，用于迭代 Prompt 和工具接口。',
      ],
      skills: ['AI Agent', 'Tool Calling', '工作流编排', '函数调用', '上下文管理', '异常兜底', 'API 集成', '日志监控'],
    }),
    writingTips: ['说明 Agent 做了哪些真实任务。', '写清楚工具调用和异常兜底。', '用任务完成率、接管率等指标量化。'],
    commonMistakes: ['把 Agent 写成聊天机器人。', '没有工具和业务系统集成细节。', '缺少执行日志和失败处理。'],
    audience: ['AI Agent 工程师', 'AI 应用开发工程师', '后端工程师转 Agent 方向的人'],
    relatedTemplateSlugs: ['ai-agent工程师', '大模型应用工程师'],
    faq: defaultFaq('AI Agent工程师'),
    updatedAt: '2026-06-21',
  },
  {
    slug: 'large-model-algorithm-engineer-resume-example',
    role: '大模型算法工程师',
    title: '大模型算法工程师简历范文：微调、评测与推理优化',
    description: '适合大模型算法工程师的简历范文，展示数据处理、微调、评测、推理优化和业务落地。',
    keywords: ['大模型算法工程师简历范文', '大模型微调', '模型评测', '推理优化'],
    sampleResumeHtml: createSampleResumeHtml({
      role: '大模型算法工程师',
      profile: '算法工程经验，参与领域模型微调和评测',
      summary: '熟悉训练数据清洗、指令微调、评测集构建和推理优化，能围绕业务场景提升模型效果和部署效率。',
      projects: [
        '领域问答模型微调：清洗标注问答数据，构建训练/验证集，完成指令微调和效果对比。',
        '评测体系：设计准确性、鲁棒性、安全性和拒答边界评测集，输出迭代报告。',
        '推理优化：配合工程团队优化批处理、缓存和量化策略，降低推理成本。',
      ],
      skills: ['Python', 'PyTorch', 'Transformers', 'SFT', 'LoRA', '评测集', '推理优化', '数据清洗'],
    }),
    writingTips: ['写清楚数据、方法、指标和部署结果。', '不要只列论文或模型名。', '把业务场景和模型效果连起来。'],
    commonMistakes: ['没有说明个人贡献。', '缺少实验对比和评测指标。', '只写训练，不写上线或推理成本。'],
    audience: ['大模型算法工程师', 'NLP 算法工程师', '算法岗校招/社招求职者'],
    relatedTemplateSlugs: ['大模型算法工程师'],
    faq: defaultFaq('大模型算法工程师'),
    updatedAt: '2026-06-21',
  },
  {
    slug: 'mlops-engineer-resume-example',
    role: 'MLOps工程师',
    title: 'MLOps工程师简历范文：模型部署、监控与自动化流水线',
    description: '展示 MLOps 工程师如何写模型部署、CI/CD、监控告警和资源成本优化。',
    keywords: ['MLOps工程师简历范文', '模型部署', '模型监控', 'CI/CD', '推理服务'],
    sampleResumeHtml: createSampleResumeHtml({
      role: 'MLOps工程师',
      profile: '平台工程经验，负责模型服务部署和监控',
      summary: '熟悉模型服务化、容器部署、自动化流水线、监控告警和资源成本优化，能提升模型上线稳定性和交付效率。',
      projects: [
        '模型部署流水线：搭建模型打包、灰度发布、回滚和版本管理流程，减少人工上线步骤。',
        '推理服务监控：接入 QPS、响应时延、错误率和资源使用率监控，支持异常告警。',
        '资源优化：根据峰谷流量调整副本和缓存策略，降低推理服务资源浪费。',
      ],
      skills: ['Docker', 'Kubernetes', 'CI/CD', '模型服务', '监控告警', '灰度发布', 'Python', '云资源管理'],
    }),
    writingTips: ['突出稳定性、自动化和成本指标。', '写清楚服务规模和责任边界。', '把模型工程和 DevOps 能力结合起来。'],
    commonMistakes: ['只写运维工具，不写模型场景。', '没有监控指标。', '没有上线效率或稳定性结果。'],
    audience: ['MLOps 工程师', '平台工程师', '运维/后端转 AI 基础设施方向的人'],
    relatedTemplateSlugs: ['mlops工程师', '运维'],
    faq: defaultFaq('MLOps工程师'),
    updatedAt: '2026-06-21',
  },
  {
    slug: 'ai-test-engineer-resume-example',
    role: 'AI测试工程师',
    title: 'AI测试工程师简历范文：模型效果、数据集与自动化测试',
    description: '适合 AI 测试工程师和生成式人工智能系统测试员的简历范文，展示模型效果测试和自动化测试能力。',
    keywords: ['AI测试工程师简历范文', 'AI测试', '模型评测', '生成式人工智能系统测试员'],
    sampleResumeHtml: createSampleResumeHtml({
      role: 'AI测试工程师',
      profile: '测试工程经验，参与 AI 应用和知识库问答测试',
      summary: '熟悉功能测试、接口测试、自动化测试和 AI 输出质量评估，能围绕准确性、安全性、稳定性和用户体验建立测试方案。',
      projects: [
        '知识库问答测试：构建高频问题、边界问题和异常问题测试集，覆盖答案准确性和引用一致性。',
        '自动化回归：编写接口测试脚本，验证文档上传、检索、生成和反馈流程。',
        '质量报告：按准确率、拒答率、响应时延和人工接管率输出测试报告，推动产品和算法迭代。',
      ],
      skills: ['功能测试', '接口测试', '自动化测试', '模型评测', '测试集构建', 'Python', 'Postman', '缺陷跟踪'],
    }),
    writingTips: ['AI 测试要写效果指标，不只写功能测试。', '说明测试集如何构建。', '把缺陷反馈和模型迭代联系起来。'],
    commonMistakes: ['只写传统测试流程。', '没有 AI 输出质量评估。', '缺少边界样例和安全测试。'],
    audience: ['AI 测试工程师', '生成式人工智能系统测试员', '测试工程师转 AI 应用方向的人'],
    relatedTemplateSlugs: ['ai测试工程师', '生成式人工智能系统测试员'],
    faq: defaultFaq('AI测试工程师'),
    updatedAt: '2026-06-21',
  },
];

export function getAllResumeExamples(): readonly ResumeExample[] {
  return resumeExamples;
}

export function getResumeExampleBySlug(slug: string): ResumeExample | undefined {
  return resumeExamples.find((example) => example.slug === slug);
}
