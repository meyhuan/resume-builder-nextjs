import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const root = process.cwd();
const baseUrl = process.env.SCREENSHOT_BASE_URL || 'http://127.0.0.1:3004';
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const indexPath = path.join(root, 'screenshots/index/screenshot-index.json');
const skipEditorTemplates = process.env.SKIP_EDITOR_TEMPLATES === '1';

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const viewports = {
  desktop: { width: 1440, height: 1000, deviceScaleFactor: 1 },
  vertical: { width: 1080, height: 1440, deviceScaleFactor: 1 },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
};

const overlayCleanupCss = `
  nextjs-portal,
  [data-nextjs-toast],
  [data-sonner-toaster],
  [data-radix-popper-content-wrapper],
  .nextjs-toast,
  .__next-dev-overlay {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
  }
  * {
    scroll-behavior: auto !important;
  }
`;

const demoResume = {
  base_info: {
    name: '张明',
    gender: '男',
    age: '28',
    show_age_type: 1,
    phone: '13800008888',
    mail: 'zhangming@example.com',
    hide_avatar: false,
  },
  job_intention: {
    objective: 'AI产品经理',
    city: '上海',
    type: '全职',
    salary: '25K-35K',
    is_hide: false,
  },
  education: [
    {
      id: 'edu-demo-1',
      name: '上海交通大学',
      major: '计算机科学与技术',
      degree: '本科',
      recruit_type: '统招',
      course: '<p>数据结构、产品设计、机器学习、用户研究</p>',
      period: { start: '2016.09', end: '2020.06' },
      is_hide: false,
    },
  ],
  experience: [
    {
      id: 'exp-demo-1',
      name: '星河智能科技有限公司',
      position: 'AI产品经理',
      industry: '互联网 / SaaS',
      content:
        '<ul><li>负责企业知识库问答产品从 0 到 1 设计，拆解文档解析、向量检索、答案引用和反馈闭环等核心模块。</li><li>联合算法和后端团队优化召回策略，将高频问题首轮命中率提升至 82%，人工转接率下降 18%。</li><li>搭建模型评测指标体系，覆盖准确率、可引用性、拒答率、响应时延和 Token 成本。</li></ul>',
      period: { start: '2022.07', end: '至今' },
      is_hide: false,
    },
  ],
  program_experience: [
    {
      id: 'proj-demo-1',
      name: '销售线索跟进 Agent',
      role: '产品负责人',
      content:
        '<ul><li>设计线索评分、客户画像补全、跟进话术生成和 CRM 写回流程，使销售首次触达准备时间从 15 分钟降低到 4 分钟。</li><li>通过灰度实验验证自动化跟进效果，沉淀可复用 Prompt 模板和失败兜底策略。</li></ul>',
      period: { start: '2023.03', end: '2023.12' },
      is_hide: false,
    },
  ],
  self_evaluation: {
    content: '<p>具备 AI 产品从需求拆解、方案设计、模型评测到上线运营的完整经验，能把业务问题转化为可落地的产品功能。</p>',
    is_hide: false,
  },
  skills: {
    content: '<ul><li>产品方法：需求分析、PRD、原型设计、A/B 测试、跨团队协作</li><li>AI 技术理解：RAG、Prompt Engineering、AI Agent、模型评测、向量数据库</li><li>业务指标：命中率、采纳率、转化率、人工接管率、成本分析</li></ul>',
    is_hide: false,
  },
  qualifications: {
    content: '<p>PMP 项目管理认证、英语六级</p>',
    is_hide: false,
  },
  intern: [],
  school_exps: [],
  custom_module_info: [],
};

const jdText = `岗位职责：
1. 负责企业知识库、RAG 问答和 AI Agent 产品规划；
2. 结合业务场景完成需求分析、PRD、原型设计和版本规划；
3. 与算法、后端、运营团队协作，建立模型评测和反馈闭环；
4. 关注命中率、采纳率、响应时延、Token 成本和商业化指标。

任职要求：
熟悉大模型、Prompt Engineering、Embedding、向量数据库、A/B 测试，有 SaaS 或 B 端产品经验优先。`;

const resumeText = `张明，AI产品经理，负责企业知识库问答产品和销售线索跟进 Agent。
项目中完成需求分析、PRD、原型设计、版本规划，与算法和后端协作优化 RAG 检索、Prompt 模板和答案引用。
通过模型评测和反馈闭环提升高频问题命中率，降低人工转接率。熟悉大模型、AI Agent、SaaS、B端产品和跨团队协作。`;

const commonBestFor = ['小红书配图', '产品功能展示', '解决方案型笔记'];

const shotSpecs = [
  {
    id: 'landing-use-cases-desktop',
    dir: 'desktop',
    route: '/#use-cases',
    viewport: 'desktop',
    page: '首页使用场景区',
    summary: '展示产品针对应届生、职场人、AI 工具用户和多岗位投递的场景化解决方案。',
    visible_elements: ['使用场景卡片', '不同求职身份', 'AI 生成策略', '场景 CTA'],
    features: ['场景化简历生成', '身份定制 AI 引导', '岗位针对性优化'],
    scenarios: ['不知道自己适合哪种简历写法', '需要按求职身份定制内容', '想展示产品覆盖多种人群'],
    best_for: ['痛点场景图', '人群定位图', '解决方案型笔记'],
    not_for: ['编辑器细节', '移动端流程', '导出结果'],
    visual_notes: '四类使用场景信息集中，适合作为第二张痛点/人群覆盖图。',
    annotation_suggestions: ['圈出目标人群卡片', '强调按身份生成', '标注不同场景都有解法'],
  },
  {
    id: 'landing-why-free-desktop',
    dir: 'desktop',
    route: '/#why-free',
    viewport: 'desktop',
    page: '首页永久免费说明区',
    summary: '展示智简简历永久免费、保护隐私、独立开发者维护等信任背书。',
    visible_elements: ['永久免费说明', '隐私保护', '独立开发者', '免费生成简历按钮'],
    features: ['永久免费', '无水印导出', '隐私保护', '独立开发者产品'],
    scenarios: ['用户担心导出收费', '需要建立产品信任', '强调无套路免费'],
    best_for: ['信任背书图', '转化总结图', '免费卖点说明'],
    not_for: ['AI 生成流程', 'JD 匹配', '模板选择'],
    visual_notes: '文案信任感强，适合作为笔记末尾转化和承诺说明。',
    annotation_suggestions: ['突出永久免费', '突出没有付费墙', '弱化大段故事文字'],
  },
  {
    id: 'about-developer-desktop',
    dir: 'desktop',
    route: '/about',
    viewport: 'desktop',
    page: '关于开发者页面',
    summary: '展示独立开发者背景和产品故事，用于强调产品长期维护、有真实开发者负责。',
    visible_elements: ['开发者介绍', '产品故事', '免费承诺', '联系方式区域'],
    features: ['独立开发者背书', '产品温度', '长期维护', '用户反馈'],
    scenarios: ['用户担心工具不可靠', '需要讲创始人故事', '强调不是套壳产品'],
    best_for: ['信任背书图', '品牌故事图', '软性种草笔记'],
    not_for: ['核心编辑功能', '模板展示', 'AI 生成结果'],
    visual_notes: '适合偏故事型推广，不适合作为纯功能笔记封面。',
    annotation_suggestions: ['标注独立开发者作品', '突出产品故事', '少加营销贴纸'],
  },
  {
    id: 'compare-ai-resume-builders-desktop',
    dir: 'desktop',
    route: '/compare/ai-resume-builders',
    viewport: 'desktop',
    page: 'AI 简历工具对比页',
    summary: '展示智简简历与其他 AI 简历工具的对比入口，适合“怎么选简历工具”主题。',
    visible_elements: ['对比标题', '工具选择建议', '对比内容', '行动按钮'],
    features: ['工具对比', '免费定位', 'AI 简历选择建议'],
    scenarios: ['不知道哪个 AI 简历工具好用', '需要写工具测评', '做对比型 SEO/AEO 内容'],
    best_for: ['工具测评笔记', '对比种草图', 'SEO 承接图'],
    not_for: ['编辑器操作', '移动端制作', '导出状态'],
    visual_notes: '首屏对比主题明确，适合作为“AI 简历工具怎么选”的封面或正文图。',
    annotation_suggestions: ['强调免费可导出', '圈出对比结论', '不要遮挡标题'],
  },
  {
    id: 'tools-resume-builder-sites-desktop',
    dir: 'desktop',
    route: '/tools/resume-builder-sites',
    viewport: 'desktop',
    page: '简历制作网站推荐页',
    summary: '展示简历制作网站推荐和选择建议，适合免费工具合集类内容。',
    visible_elements: ['简历网站推荐标题', '选择建议', '工具入口', '行动按钮'],
    features: ['简历网站推荐', '免费简历制作', '工具合集承接'],
    scenarios: ['用户搜索简历制作网站', '想做工具合集推广', '需要自然承接到智简简历'],
    best_for: ['工具合集图', 'SEO 承接图', '免费工具推荐'],
    not_for: ['AI 生成细节', '模板编辑状态', '登录后管理'],
    visual_notes: '适合做“我试了几个简历网站”的笔记配图。',
    annotation_suggestions: ['突出免费在线制作', '标出推荐理由', '避免文字过密'],
  },
  {
    id: 'answers-free-ai-resume-builder-desktop',
    dir: 'desktop',
    route: '/answers/free-ai-resume-builder',
    viewport: 'desktop',
    page: '免费 AI 简历制作问答页',
    summary: '展示免费 AI 简历制作相关问答内容，用于回答用户对免费、导出、能力范围的疑问。',
    visible_elements: ['问答标题', '免费 AI 简历说明', 'FAQ 内容', '产品入口'],
    features: ['免费 AI 简历', '问答承接', '疑虑消除'],
    scenarios: ['用户搜索免费 AI 简历制作', '需要解释免费能力', '做 AEO 问答分发'],
    best_for: ['问答型笔记', '疑虑消除图', '免费卖点说明'],
    not_for: ['编辑器具体操作', '模板细节', '移动端步骤'],
    visual_notes: '问答主题明显，适合做“真的免费吗？”类内容。',
    annotation_suggestions: ['突出免费 AI 简历', '标出常见问题', '配合截图标题强化疑问'],
  },
  {
    id: 'answers-best-ai-resume-tool-desktop',
    dir: 'desktop',
    route: '/answers/best-ai-resume-tool',
    viewport: 'desktop',
    page: '最好用 AI 简历工具问答页',
    summary: '展示 AI 简历工具选择建议和问答内容，适合做工具推荐/测评主题。',
    visible_elements: ['AI 简历工具问答', '选择标准', '产品入口', '推荐说明'],
    features: ['工具选择建议', 'AI 简历推荐', 'AEO 承接'],
    scenarios: ['用户搜索 AI 简历工具哪个好', '写工具测评笔记', '解释选择标准'],
    best_for: ['测评类笔记', '推荐型配图', '问答承接图'],
    not_for: ['移动端编辑', '导出结果', '会员权益'],
    visual_notes: '适合作为“AI 简历工具怎么选”的正文图。',
    annotation_suggestions: ['突出选择标准', '强调免费/导出/模板', '避免遮挡结论'],
  },
  {
    id: 'articles-list-desktop',
    dir: 'desktop',
    route: '/articles',
    viewport: 'desktop',
    page: '求职攻略文章列表',
    summary: '展示求职攻略、简历写作文章和内容分类，用于说明产品不仅能做简历，也提供写作指导。',
    visible_elements: ['文章列表', '分类筛选', '攻略卡片', '更新时间'],
    features: ['求职攻略', 'SEO 内容矩阵', '简历写作指导'],
    scenarios: ['用户想学习简历怎么写', '需要内容矩阵展示', '强调工具和攻略结合'],
    best_for: ['内容生态图', '攻略入口图', 'SEO 内容复用'],
    not_for: ['AI 生成结果', '编辑器操作', '导出流程'],
    visual_notes: '适合搭配“不会写简历先看攻略”的主题。',
    annotation_suggestions: ['标出攻略分类', '强调模板+攻略联动', '少量箭头即可'],
  },
  {
    id: 'article-ai-product-manager-desktop',
    dir: 'desktop',
    route: '/articles/ai-product-manager-resume-guide',
    viewport: 'desktop',
    page: 'AI 产品经理简历攻略文章',
    summary: '展示 AI 产品经理简历写作攻略，包含项目经历、技能关键词和模板选择建议。',
    visible_elements: ['文章标题', 'AI 产品经理简历建议', '目录/正文', '模板链接'],
    features: ['岗位攻略', 'AI 新职业内容', '模板内链'],
    scenarios: ['AI 产品经理不知道简历怎么写', '需要岗位内容分发', 'SEO 文章转小红书笔记'],
    best_for: ['岗位攻略图', 'SEO 文章复用', '新职业求职笔记'],
    not_for: ['编辑器 UI 展示', '导出流程', '移动端操作'],
    visual_notes: '适合做“AI 产品经理简历怎么写”的内容证据图。',
    annotation_suggestions: ['突出岗位名', '标出项目经历/关键词', '避免覆盖正文标题'],
  },
  {
    id: 'examples-list-desktop',
    dir: 'desktop',
    route: '/examples',
    viewport: 'desktop',
    page: '简历范文列表',
    summary: '展示多个 AI 新职业简历范文入口，用于说明产品提供岗位范文参考。',
    visible_elements: ['范文列表', '岗位卡片', 'AI 新职业方向', '范文入口'],
    features: ['简历范文', '岗位案例', '新职业内容库'],
    scenarios: ['不知道简历内容怎么参考', '想找岗位范文', '做新职业简历攻略'],
    best_for: ['范文库展示', '岗位内容图', '攻略型笔记'],
    not_for: ['在线编辑操作', '导出结果', '会员权益'],
    visual_notes: '适合做“先看范文再生成简历”的流程图。',
    annotation_suggestions: ['圈出范文入口', '强调 AI 新职业覆盖', '避免文字过密'],
  },
  {
    id: 'example-ai-product-manager-desktop',
    dir: 'desktop',
    route: '/examples/ai-product-manager-resume-example',
    viewport: 'desktop',
    page: 'AI 产品经理简历范文详情',
    summary: '展示 AI 产品经理简历范文详情页，包括项目经历写法、技能关键词和提醒。',
    visible_elements: ['范文标题', '样例简历', '项目经历示例', '写作提醒'],
    features: ['岗位范文', '项目经历表达', '技能关键词参考'],
    scenarios: ['不会写 AI 产品经理项目经历', '需要范文辅助', '做岗位简历教程'],
    best_for: ['范文参考图', '岗位教程图', '内容种草图'],
    not_for: ['产品编辑界面', '移动端流程', '导出页'],
    visual_notes: '内容可信度高，适合正文补充图，不适合作为产品功能封面。',
    annotation_suggestions: ['标出范文结构', '强调真实经历要替换', '不要让标注遮挡示例'],
  },
  {
    id: 'templates-role-ai-product-manager-desktop',
    dir: 'desktop',
    route: '/templates/ai产品经理',
    viewport: 'desktop',
    page: 'AI 产品经理岗位模板页',
    summary: '展示 AI 产品经理专属简历模板页，包含岗位写作重点、模板推荐和 AI 生成入口。',
    visible_elements: ['岗位模板标题', '写作重点', '推荐模板', 'AI 生成入口'],
    features: ['岗位模板', '岗位关键词', '模板推荐', 'AI 生成入口'],
    scenarios: ['AI 产品经理需要专属模板', '想按岗位选择模板', '做新职业简历推广'],
    best_for: ['岗位模板图', '新职业场景图', '模板选择说明'],
    not_for: ['移动端编辑', '导出结果', '仪表盘管理'],
    visual_notes: '岗位名醒目，适合“AI 产品经理简历模板”主题。',
    annotation_suggestions: ['圈出岗位名和生成入口', '标出推荐模板', '强调岗位关键词'],
  },
  {
    id: 'templates-category-product-desktop',
    dir: 'desktop',
    route: '/templates/category/产品',
    viewport: 'desktop',
    page: '产品岗位模板分类页',
    summary: '展示产品类岗位模板集合，适合说明产品覆盖多个岗位方向。',
    visible_elements: ['产品类模板标题', '岗位列表', '模板入口', '分类说明'],
    features: ['岗位分类模板', '产品岗位覆盖', '模板集合'],
    scenarios: ['用户不确定具体岗位模板', '需要展示模板覆盖范围', '做模板合集推广'],
    best_for: ['模板合集图', '岗位覆盖图', '产品经理人群笔记'],
    not_for: ['单个模板编辑效果', 'AI 生成流程', '导出状态'],
    visual_notes: '适合展示模板库规模和岗位覆盖。',
    annotation_suggestions: ['突出产品类岗位', '标出多个岗位入口', '不要遮挡卡片标题'],
  },
  {
    id: 'templates-industry-internet-desktop',
    dir: 'desktop',
    route: '/templates/industry/互联网通信',
    viewport: 'desktop',
    page: '互联网通信行业模板页',
    summary: '展示互联网通信行业相关岗位模板集合，覆盖技术、产品、运营等方向。',
    visible_elements: ['互联网通信标题', '行业岗位列表', '模板入口', '岗位分类'],
    features: ['行业模板', '互联网岗位覆盖', '模板集合'],
    scenarios: ['互联网求职者选模板', '做行业求职内容', '展示模板库广度'],
    best_for: ['行业模板图', '互联网求职笔记', '模板库覆盖图'],
    not_for: ['单页编辑器', '移动端流程', '导出结果'],
    visual_notes: '适合“互联网岗位简历模板怎么选”主题。',
    annotation_suggestions: ['突出互联网通信行业', '圈出技术/产品/运营', '保持清爽'],
  },
  {
    id: 'ai-resume-wizard-vertical',
    dir: 'vertical',
    route: '/ai',
    viewport: 'vertical',
    page: 'AI 简历生成向导竖版',
    summary: '竖版视口展示 AI 简历生成入口，适合小红书封面重设计。',
    visible_elements: ['AI 生成标题', '步骤表单', '身份/岗位输入', '生成按钮'],
    features: ['AI 简历生成', '身份引导', '岗位定制'],
    scenarios: ['不会从零写简历', '希望 AI 自动生成初稿', '封面需要展示核心功能'],
    best_for: ['封面图', '功能入口图', '小红书竖版配图'],
    not_for: ['导出结果', '模板中心', '仪表盘管理'],
    visual_notes: '竖版空间适合叠加大标题和卖点标签。',
    annotation_suggestions: ['突出 AI 生成入口', '指向关键表单', '避免遮挡按钮'],
  },
  {
    id: 'import-resume-vertical',
    dir: 'vertical',
    route: '/import',
    viewport: 'vertical',
    page: 'AI 文本转简历竖版',
    summary: '竖版视口展示粘贴文本导入简历入口，适合“已有内容但排版差”的场景。',
    visible_elements: ['导入说明', '文本粘贴区域', '解析入口', '模板排版说明'],
    features: ['AI 文本转简历', '结构化解析', '自动排版'],
    scenarios: ['用 ChatGPT 写了简历但排版不好', '想把文本变成漂亮简历', '已有简历需要快速导入'],
    best_for: ['痛点转解决方案图', '竖版正文图', '导入功能展示'],
    not_for: ['从零生成简历', '岗位模板库', '导出页'],
    visual_notes: '适合重设计成“复制粘贴就能变成简历”的小红书图。',
    annotation_suggestions: ['突出粘贴文本', '强调自动解析排版', '标注支持多平台内容'],
  },
];

const editorTemplates = [
  ['simple', '简约模板'],
  ['xinghe', '星河模板'],
  ['lifeng', '砺锋模板'],
  ['qingsui', '青穗模板'],
  ['yuanshan', '远山模板'],
  ['hengjian', '衡简模板'],
  ['yiyetong', '一页通模板'],
  ['dense', '密排模板'],
  ['ziji', '紫记模板'],
  ['mashang', '码上模板'],
];

if (!skipEditorTemplates) {
  for (const [templateId, templateName] of editorTemplates) {
    shotSpecs.push({
      id: `editor-template-${templateId}-desktop`,
      dir: 'desktop',
      route: `/editor/new?template=${templateId}`,
      viewport: 'desktop',
      page: `编辑器 ${templateName}`,
      summary: `展示在线编辑器中 ${templateName} 的真实简历预览和编辑区域。`,
      visible_elements: ['左侧编辑区', '简历预览', '模板名称', '顶部工具栏', '导出按钮'],
      features: ['在线编辑器', '实时预览', '模板切换', '免费导出'],
      scenarios: ['想看模板真实效果', '需要展示所见即所得编辑', '担心简历排版不好看'],
      best_for: ['模板效果图', '核心功能图', '编辑器展示图'],
      not_for: ['文章攻略', '移动端流程', '开发者故事'],
      visual_notes: `${templateName} 的风格差异明显，适合模板选择或审美对比类笔记。`,
      annotation_suggestions: ['突出简历预览区', '标出模板名称', '必要时圈出导出按钮'],
      afterWaitMs: 2500,
    });
  }
}

const authenticatedDesktopSpecs = [
  {
    id: 'dashboard-filled-desktop',
    dir: 'desktop',
    route: '/dashboard',
    viewport: 'desktop',
    page: '登录后我的简历仪表盘',
    summary: '展示用户登录后管理简历的仪表盘，包含 AI 生成、创建新简历、导入简历和已有简历卡片。',
    visible_elements: ['我的简历标题', 'AI 生成简历入口', '创建新简历', '导入简历', '简历卡片'],
    features: ['简历管理', 'AI 生成入口', '导入入口', '多简历管理'],
    scenarios: ['需要管理多份简历', '想展示产品工作台', '用户已经有简历后继续编辑'],
    best_for: ['产品工作台图', '流程入口图', '多简历管理说明'],
    not_for: ['SEO 攻略', '岗位模板', '移动端表单'],
    visual_notes: '真实登录态页面，适合证明产品不是只有落地页。',
    annotation_suggestions: ['圈出三种创建方式', '标出已有简历卡片', '弱化旧版找回提示'],
  },
  {
    id: 'dashboard-membership-desktop',
    dir: 'desktop',
    route: '/dashboard/membership',
    viewport: 'desktop',
    page: '会员权益页',
    summary: '展示会员/权益页面，用于说明高级权益、额度或产品付费边界。',
    visible_elements: ['会员权益标题', '权益卡片', '使用额度', '开通/说明按钮'],
    features: ['会员权益', '额度说明', '高级功能边界'],
    scenarios: ['用户关心免费和会员差异', '需要解释权益', '做转化承接图'],
    best_for: ['权益说明图', '转化图', '产品边界说明'],
    not_for: ['免费承诺封面', '编辑器功能', '文章攻略'],
    visual_notes: '如果页面为空或异常，索引仍可标记为低优先级。',
    annotation_suggestions: ['突出权益差异', '标注免费可用功能', '避免误导为必须付费'],
  },
  {
    id: 'dashboard-exports-desktop',
    dir: 'desktop',
    route: '/dashboard/exports',
    viewport: 'desktop',
    page: '导出记录页',
    summary: '展示登录后的导出记录入口，用于说明简历导出与历史管理能力。',
    visible_elements: ['导出记录标题', '导出列表/空状态', '下载相关说明'],
    features: ['导出记录', 'PDF 导出', '文件管理'],
    scenarios: ['用户关心导出后怎么管理', '展示完整闭环', '强调可下载保存'],
    best_for: ['导出闭环图', '工作台补充图', '结果管理说明'],
    not_for: ['从零生成简历', '岗位攻略', '模板中心'],
    visual_notes: '适合放在流程末尾，作为生成后的管理闭环。',
    annotation_suggestions: ['突出导出记录', '标注下载/保存能力', '如为空状态可低调使用'],
  },
  {
    id: 'dashboard-feedback-desktop',
    dir: 'desktop',
    route: '/dashboard/feedback',
    viewport: 'desktop',
    page: '反馈页',
    summary: '展示用户反馈入口，用于说明产品可反馈问题、由开发者持续迭代。',
    visible_elements: ['反馈标题', '反馈表单/列表', '提交入口'],
    features: ['用户反馈', '产品迭代', '客服/支持'],
    scenarios: ['建立产品信任', '说明开发者会维护', '软性品牌背书'],
    best_for: ['信任背书图', '服务支持说明', '产品迭代图'],
    not_for: ['核心功能封面', '模板展示', '导出结果'],
    visual_notes: '适合较软的品牌信任内容，不建议用于强功能笔记首图。',
    annotation_suggestions: ['标注反馈入口', '强调持续维护', '避免过度营销'],
  },
];

const mobileSpecs = [
  {
    id: 'mobile-resumes-list',
    dir: 'mobile',
    route: '/m/resumes',
    viewport: 'mobile',
    page: '移动端我的简历列表',
    summary: '展示手机端简历列表，可创建、编辑、重命名、复制和删除简历。',
    visible_elements: ['移动端标题栏', '简历卡片', '创建按钮', '更多操作'],
    features: ['手机端简历管理', '移动端创建简历', '简历卡片列表'],
    scenarios: ['想在手机上做简历', '需要移动端管理多份简历', '小程序/H5 使用场景'],
    best_for: ['手机端功能图', '移动端流程图', '多端使用说明'],
    not_for: ['PC 编辑器细节', 'SEO 文章', '开发者故事'],
    visual_notes: '真实手机比例截图，适合直接作为小红书正文图底图。',
    annotation_suggestions: ['突出手机也能管理简历', '圈出创建入口', '保持界面清晰'],
  },
  {
    id: 'mobile-edit-home',
    dir: 'mobile',
    route: '/m/edit',
    viewport: 'mobile',
    page: '移动端编辑首页',
    summary: '展示移动端简历编辑首页，包含完成度、基础信息、求职意向、模块列表和预览导出入口。',
    visible_elements: ['简历完成度', '个人资料卡', '模块列表', '预览/导出入口'],
    features: ['移动端编辑', '模块化填写', '进度提示', '预览导出'],
    scenarios: ['用手机一步步完善简历', '不知道简历还缺什么', '需要展示移动端主流程'],
    best_for: ['核心移动端图', '流程说明图', '痛点解决图'],
    not_for: ['桌面模板展示', 'SEO 攻略', '会员权益'],
    visual_notes: '移动端核心页面，适合作为手机做简历主题的第 2 或第 3 张图。',
    annotation_suggestions: ['突出完成度', '圈出模块列表', '标注预览导出入口'],
  },
  {
    id: 'mobile-edit-base-form',
    dir: 'mobile',
    route: '/m/edit/base',
    viewport: 'mobile',
    page: '移动端基础信息编辑',
    summary: '展示手机端基础信息表单，可填写姓名、手机号、邮箱、性别、年龄、城市等。',
    visible_elements: ['基础信息标题', '头像入口', '姓名输入', '手机号输入', '城市选择'],
    features: ['手机端表单编辑', '基础信息填写', '字段校验'],
    scenarios: ['用手机补简历基础信息', '需要展示填写体验', '从零创建简历流程'],
    best_for: ['步骤说明图', '手机端输入图', '新手教程图'],
    not_for: ['AI 生成卖点', '模板选择', '导出结果'],
    visual_notes: '字段清楚，适合用于“手机也能填完整简历”的步骤图。',
    annotation_suggestions: ['突出必填字段', '标注自动校验', '不要遮挡输入框'],
  },
  {
    id: 'mobile-edit-work-list',
    dir: 'mobile',
    route: '/m/edit/work',
    viewport: 'mobile',
    page: '移动端工作经历列表',
    summary: '展示手机端工作经历模块列表，可添加和管理工作经历条目。',
    visible_elements: ['工作经历标题', '经历列表', '添加入口', '保存按钮'],
    features: ['工作经历管理', '模块化编辑', '手机端添加经历'],
    scenarios: ['不知道工作经历怎么分段', '需要逐条完善经历', '职场人简历优化'],
    best_for: ['模块编辑图', '职场人场景图', '手机端教程'],
    not_for: ['模板中心', '免费承诺', 'SEO 文章'],
    visual_notes: '适合做“按模块填，不用一次写完”的卖点图。',
    annotation_suggestions: ['圈出添加经历入口', '强调模块化填写', '必要时标注按时间倒序'],
  },
  {
    id: 'mobile-edit-skill-form',
    dir: 'mobile',
    route: '/m/edit/skill',
    viewport: 'mobile',
    page: '移动端技能特长编辑',
    summary: '展示手机端技能模块编辑页，用于整理岗位关键词和能力标签。',
    visible_elements: ['技能特长标题', '文本编辑区', '保存按钮', '提示文案'],
    features: ['技能关键词编辑', '模块化填写', '手机端完善简历'],
    scenarios: ['技能栏不会写', '需要补 JD 关键词', '手机端快速完善简历'],
    best_for: ['关键词优化图', '手机端步骤图', '模块编辑图'],
    not_for: ['模板库展示', '导出结果', '关于开发者'],
    visual_notes: '适合和 JD 匹配工具结果搭配使用。',
    annotation_suggestions: ['标出技能关键词', '提示对应目标岗位', '少量标签即可'],
  },
  {
    id: 'mobile-edit-summary-form',
    dir: 'mobile',
    route: '/m/edit/summary',
    viewport: 'mobile',
    page: '移动端个人优势编辑',
    summary: '展示手机端个人优势/自我评价模块，适合说明简历开头如何快速建立匹配度。',
    visible_elements: ['个人优势标题', '富文本编辑区', '保存按钮'],
    features: ['个人优势编辑', '自我评价模块', '移动端优化'],
    scenarios: ['不会写个人优势', '想突出岗位匹配度', '需要修改简历开头'],
    best_for: ['个人优势教程图', '手机端编辑图', '简历优化步骤'],
    not_for: ['导出流程', '模板合集', '会员权益'],
    visual_notes: '适合“简历开头怎么写”的小红书正文图。',
    annotation_suggestions: ['突出个人优势模块', '标注先写匹配度', '不要遮挡编辑区'],
  },
  {
    id: 'mobile-preview-xinghe',
    dir: 'mobile',
    route: '/m/preview?tpl=xinghe',
    viewport: 'mobile',
    page: '移动端简历预览',
    summary: '展示手机端只读预览页面，可切换模板、调整排版并准备导出。',
    visible_elements: ['简历预览', '底部操作栏', '模板设置入口', '导出按钮'],
    features: ['手机端预览', '模板切换', '排版设置', '导出入口'],
    scenarios: ['手机上检查简历效果', '导出前预览排版', '切换模板看成品'],
    best_for: ['结果展示图', '手机端闭环图', '导出前预览'],
    not_for: ['基础信息表单', 'SEO 文章', '开发者故事'],
    visual_notes: '手机端成品感强，适合作为移动端流程的结果图。',
    annotation_suggestions: ['突出预览成品', '圈出导出入口', '避免遮挡简历正文'],
  },
  {
    id: 'mobile-export-result',
    dir: 'mobile',
    route: '/m/export-result?type=pdf&url=%2Fmock-resume.pdf&id=demo-export&fileName=%E5%BC%A0%E6%98%8E-AI%E4%BA%A7%E5%93%81%E7%BB%8F%E7%90%86%E7%AE%80%E5%8E%86&expiresAt=2026-06-21T23%3A59%3A00.000Z',
    viewport: 'mobile',
    page: '移动端导出结果页',
    summary: '展示手机端 PDF 导出结果页，包含下载文件、复制下载链接和打开文件入口。',
    visible_elements: ['导出结果标题', 'PDF 已生成', '下载文件按钮', '复制下载链接按钮'],
    features: ['PDF 导出', '移动端下载', '复制链接', '导出闭环'],
    scenarios: ['用户关心能不能保存 PDF', '手机上导出简历', '展示最终结果'],
    best_for: ['结果转化图', '导出闭环图', '手机端功能证明'],
    not_for: ['AI 生成入口', '模板选择', '岗位攻略'],
    visual_notes: '适合作为流程最后一张图，强调简历已经可下载保存。',
    annotation_suggestions: ['突出 PDF 已生成', '圈出下载按钮', '避免误导展示真实文件预览'],
  },
  {
    id: 'mobile-pc-guide',
    dir: 'mobile',
    route: '/m/edit/pc',
    viewport: 'mobile',
    page: '移动端 PC 编辑引导页',
    summary: '展示移动端引导用户到 PC 端进行更精细编辑的页面，适合说明多端协作。',
    visible_elements: ['PC 编辑提示', '二维码/引导', '继续编辑说明'],
    features: ['多端协作', 'PC 精细编辑', '移动端引导'],
    scenarios: ['手机填信息，电脑精修排版', '需要展示跨端能力', '复杂简历建议 PC 编辑'],
    best_for: ['多端协作图', '流程补充图', '编辑体验说明'],
    not_for: ['免费承诺', '岗位攻略', '模板详情'],
    visual_notes: '作为补充图使用，说明产品支持手机和电脑不同使用场景。',
    annotation_suggestions: ['标注手机填资料 PC 精修', '少量箭头指向引导区', '不要遮挡二维码/说明'],
  },
];

function absoluteUrl(route) {
  return new URL(route, baseUrl).href;
}

function resolveScreenshotPath(relativePath) {
  return path.join(root, relativePath.split('/').join(path.sep));
}

async function setAuthCookie(page) {
  await page.setCookie({
    name: 'auth_uid',
    value: process.env.E2E_AUTH_DEFAULT_WX_ID || 'e2e_default_user',
    url: baseUrl,
    path: '/',
  });
}

function relativeFile(dir, id) {
  return `screenshots/raw/${dir}/${id}.png`;
}

async function ensureDirFor(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function waitForFonts(page) {
  await page.evaluate(async () => {
    if ('fonts' in document) {
      await document.fonts.ready;
    }
  }).catch(() => undefined);
}

async function cleanupPage(page) {
  await page.addStyleTag({ content: overlayCleanupCss }).catch(() => undefined);
  await page.evaluate(() => {
    for (const selector of ['nextjs-portal', '[data-nextjs-toast]', '[data-sonner-toaster]', '.__next-dev-overlay']) {
      document.querySelectorAll(selector).forEach((node) => node.remove());
    }
  }).catch(() => undefined);
}

async function gotoStable(page, route, options = {}) {
  const url = absoluteUrl(route);
  const target = new URL(url);
  let navigationError = null;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (error) {
    navigationError = error;
    console.warn(`[goto timeout] ${route}: ${error.message}`);
  }
  const current = new URL(page.url());
  const reachedTarget =
    current.origin === target.origin &&
    current.pathname === target.pathname &&
    current.search === target.search;
  if (!reachedTarget) {
    throw navigationError ?? new Error(`navigation did not reach target: ${route}`);
  }
  await page.waitForSelector('body', { timeout: 15000 }).catch(() => undefined);
  await page.waitForFunction(() => document.readyState !== 'loading', { timeout: 10000 }).catch(() => undefined);
  await sleep(options.initialWaitMs ?? 1500);
  await waitForFonts(page);
  await cleanupPage(page);
  if (options.scrollSelector) {
    await page.evaluate((selector) => {
      const target = document.querySelector(selector);
      if (target) target.scrollIntoView({ block: 'start', inline: 'nearest' });
    }, options.scrollSelector).catch(() => undefined);
  }
  if (typeof options.scrollY === 'number') {
    await page.evaluate((y) => window.scrollTo(0, y), options.scrollY).catch(() => undefined);
  }
  await sleep(options.afterWaitMs ?? 600);
}

async function captureSpec(page, spec, extraRouteSuffix = '') {
  const viewport = viewports[spec.viewport];
  await page.setViewport(viewport);
  if (spec.authenticated) {
    await setAuthCookie(page);
  }
  const route = spec.authenticated && extraRouteSuffix && !spec.route.includes('?')
    ? `${spec.route}${extraRouteSuffix}`
    : spec.route;
  await gotoStable(page, route, spec);
  if (typeof spec.beforeCapture === 'function') {
    await spec.beforeCapture(page);
    await cleanupPage(page);
    await sleep(300);
  }
  const file = relativeFile(spec.dir, spec.id);
  const absoluteFile = resolveScreenshotPath(file);
  await ensureDirFor(absoluteFile);
  await page.screenshot({ path: absoluteFile, fullPage: spec.fullPage === true });
  const metadata = await sharp(absoluteFile).metadata();
  return {
    id: spec.id,
    file,
    viewport: { width: viewport.width, height: viewport.height },
    actual_size: { width: metadata.width ?? viewport.width, height: metadata.height ?? viewport.height },
    page: spec.page,
    summary: spec.summary,
    visible_elements: spec.visible_elements,
    features: spec.features,
    scenarios: spec.scenarios,
    best_for: spec.best_for ?? commonBestFor,
    not_for: spec.not_for ?? [],
    visual_notes: spec.visual_notes,
    annotation_suggestions: spec.annotation_suggestions ?? [],
  };
}

async function loginAndEnsureDemoResume(page) {
  await page.goto(baseUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  }).catch((error) => {
    console.warn(`[auth bootstrap] ${error.message}`);
  });
  await page.waitForSelector('body', { timeout: 15000 }).catch(() => undefined);
  await setAuthCookie(page);
  await sleep(1000);
  const resumeId = await page.evaluate(async (content) => {
    const listResponse = await fetch('/next-api/resumes', { credentials: 'include' });
    if (!listResponse.ok) {
      throw new Error(`resume list failed: ${listResponse.status}`);
    }
    const list = await listResponse.json();
    const existing = Array.isArray(list)
      ? list.find((item) => item.title === '截图演示简历' || item.title === '张明-AI产品经理简历')
      : null;
    if (existing?.id) return existing.id;
    const createResponse = await fetch('/next-api/resumes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: '截图演示简历',
        template: 'xinghe',
        content,
      }),
    });
    if (!createResponse.ok) {
      const message = await createResponse.text();
      throw new Error(`resume create failed: ${createResponse.status} ${message}`);
    }
    const created = await createResponse.json();
    return created.id;
  }, demoResume);
  return resumeId;
}

async function captureJdMatch(page) {
  await page.setViewport(viewports.desktop);
  await gotoStable(page, '/tools/jd-resume-match', { scrollSelector: 'form' });
  const inputHandle = await page.$('input');
  const textareas = await page.$$('textarea');
  if (!inputHandle || textareas.length < 2) {
    throw new Error('JD match form fields not found');
  }
  await inputHandle.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await inputHandle.type('AI产品经理');
  await textareas[0].click();
  await textareas[0].type(jdText);
  await textareas[1].click();
  await textareas[1].type(resumeText);
  await page.evaluate(() => document.querySelector('form')?.scrollIntoView({ block: 'start' }));
  await sleep(300);

  const inputFile = relativeFile('desktop', 'tools-jd-match-input-desktop');
  const inputAbsoluteFile = resolveScreenshotPath(inputFile);
  await ensureDirFor(inputAbsoluteFile);
  await page.screenshot({ path: inputAbsoluteFile });
  const inputMetadata = await sharp(inputAbsoluteFile).metadata();
  const inputEntry = {
    id: 'tools-jd-match-input-desktop',
    file: inputFile,
    viewport: { width: viewports.desktop.width, height: viewports.desktop.height },
    actual_size: { width: inputMetadata.width ?? viewports.desktop.width, height: inputMetadata.height ?? viewports.desktop.height },
    page: 'JD 匹配工具输入态',
    summary: '展示用户粘贴目标岗位 JD 和简历文本后，准备分析岗位关键词覆盖情况。',
    visible_elements: ['目标岗位输入', '岗位 JD 文本框', '简历文本框', '开始分析按钮'],
    features: ['JD 匹配分析', '岗位关键词提取', '简历文本检查'],
    scenarios: ['投递前不知道简历是否匹配 JD', '需要找缺失关键词', '想按岗位优化简历'],
    best_for: ['痛点入口图', '流程步骤图', 'JD 匹配功能图'],
    not_for: ['生成结果展示', '模板选择', '移动端编辑'],
    visual_notes: '输入框内容清楚，适合作为“先粘贴 JD 和简历”的步骤图。',
    annotation_suggestions: ['标出 JD 和简历两栏', '强调无需上传文件', '指向开始分析按钮'],
  };

  const mockJdMatchResult = {
    score: 67,
    matchedKeywords: ['AI产品经理', 'RAG', 'AI Agent', '需求分析', 'PRD', '原型设计', '版本规划', '大模型', 'Prompt Engineering', 'SaaS', 'B端', '跨团队协作'],
    missingKeywords: ['Embedding', '向量数据库', 'A/B测试', '商业化'],
    prioritySuggestions: [
      '优先补齐 JD 高频但简历缺失的关键词：Embedding、向量数据库、A/B测试、商业化。',
      '在项目经历中自然写入这些关键词，不要只堆在技能栏。',
      '围绕 AI产品经理 增加“业务问题、你的动作、使用方法/工具、最终结果”的表达。',
    ],
    sectionSuggestions: [
      {
        section: '个人优势',
        issue: '需要在开头更快说明你和 AI产品经理 的匹配度。',
        suggestion: '用 2-3 句话概括你的岗位方向、核心能力和代表性结果，并自然包含 AI产品经理、RAG、AI Agent、需求分析。',
      },
      {
        section: '项目经历',
        issue: '项目描述中缺少 Embedding、向量数据库、A/B测试、商业化 等 JD 关键词。',
        suggestion: '按“业务背景 + 个人动作 + 工具/方法 + 指标结果”重写项目 bullet，避免只描述职责。',
      },
      {
        section: '技能关键词',
        issue: '技能栏应服务岗位初筛，而不是罗列所有工具。',
        suggestion: '把 Embedding、向量数据库、A/B测试、商业化 拆到技能栏或项目标签中，但必须与真实经历对应。',
      },
    ],
    nextActions: [
      '先补缺失关键词对应的真实经历，避免虚构项目。',
      '把最匹配的项目放到简历前半部分，并量化结果。',
      '完成修改后再用 AI 一键优化或选择岗位模板生成投递版本。',
    ],
  };
  const requestHandler = (request) => {
    if (request.url().includes('/next-api/ai/jd-match') && request.method() === 'POST') {
      void request.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockJdMatchResult),
      });
      return;
    }
    void request.continue();
  };
  await page.setRequestInterception(true);
  page.on('request', requestHandler);
  try {
    await page.click('form button[type="submit"]');
    await page.waitForFunction(() => document.body.innerText.includes('已覆盖关键词'), { timeout: 15000 });
  } finally {
    page.off('request', requestHandler);
    await page.setRequestInterception(false).catch(() => undefined);
  }
  await page.evaluate(() => {
    const resultTitle = Array.from(document.querySelectorAll('*')).find((node) => node.textContent?.trim() === '匹配分');
    resultTitle?.scrollIntoView({ block: 'start', inline: 'nearest' });
  }).catch(() => undefined);
  await sleep(500);
  const resultFile = relativeFile('desktop', 'tools-jd-match-result-desktop');
  const resultAbsoluteFile = resolveScreenshotPath(resultFile);
  await ensureDirFor(resultAbsoluteFile);
  await page.screenshot({ path: resultAbsoluteFile });
  const resultMetadata = await sharp(resultAbsoluteFile).metadata();
  const resultEntry = {
    id: 'tools-jd-match-result-desktop',
    file: resultFile,
    viewport: { width: viewports.desktop.width, height: viewports.desktop.height },
    actual_size: { width: resultMetadata.width ?? viewports.desktop.width, height: resultMetadata.height ?? viewports.desktop.height },
    page: 'JD 匹配工具结果态',
    summary: '展示 JD 匹配分析完成后的匹配分、已覆盖关键词、建议补充关键词和分模块优化建议。',
    visible_elements: ['匹配分', '已覆盖关键词', '建议补充关键词', '优先优化建议', '下一步行动'],
    features: ['匹配分分析', '关键词覆盖检查', '缺失关键词建议', '简历优化建议'],
    scenarios: ['投递前检查简历和岗位是否匹配', '想知道简历该补哪些关键词', '需要按 JD 优化项目经历'],
    best_for: ['结果展示图', '核心功能图', '解决方案型笔记'],
    not_for: ['模板选择', '移动端基础信息填写', '关于开发者'],
    visual_notes: '结果信息完整，适合作为 JD 匹配主题笔记的第 3 或第 4 张图。',
    annotation_suggestions: ['突出匹配分', '圈出缺失关键词', '标出优先优化建议'],
  };
  return [inputEntry, resultEntry];
}

async function upsertIndex(entries) {
  const index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
  const byId = new Map((index.screenshots ?? []).map((item) => [item.id, item]));
  for (const entry of entries) {
    byId.set(entry.id, { ...byId.get(entry.id), ...entry });
  }
  const merged = Array.from(byId.values());
  for (const item of merged) {
    if (!item.file) continue;
    const filePath = resolveScreenshotPath(item.file);
    if (!existsSync(filePath)) {
      item.asset_status = 'missing';
      continue;
    }
    const metadata = await sharp(filePath).metadata();
    item.actual_size = { width: metadata.width ?? null, height: metadata.height ?? null };
    if (!item.viewport && metadata.width && metadata.height) {
      item.viewport = { width: metadata.width, height: metadata.height };
    }
    delete item.asset_status;
  }
  index.generated_at = new Date().toISOString();
  index.base_url = baseUrl;
  index.screenshots = merged;
  index.capture_notes = {
    ...(index.capture_notes ?? {}),
    last_supplemental_capture: {
      captured_at: new Date().toISOString(),
      added_or_updated: entries.length,
      viewport_presets: {
        desktop: '1440x1000',
        vertical: '1080x1440',
        mobile: '390x844@2x',
      },
      rule: 'Raw screenshots are unannotated master assets; Xiaohongshu redesign should use the screenshot index descriptions.',
    },
  };
  await fs.writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  return index;
}

async function makeContactSheet(entries, outputRelativePath) {
  const thumbs = [];
  const tileWidth = 320;
  const tileHeight = 260;
  const imageHeight = 210;
  for (const entry of entries) {
    const source = resolveScreenshotPath(entry.file);
    if (!existsSync(source)) continue;
    const labelSvg = Buffer.from(`
      <svg width="${tileWidth}" height="${tileHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f8fafc"/>
        <rect x="0" y="0" width="${tileWidth}" height="44" fill="#0f172a"/>
        <text x="12" y="27" font-family="Arial, sans-serif" font-size="13" fill="#ffffff">${entry.id.replaceAll('&', '&amp;')}</text>
      </svg>
    `);
    const image = await sharp(source)
      .resize(tileWidth, imageHeight, { fit: 'cover', position: 'top' })
      .png()
      .toBuffer();
    const tile = await sharp(labelSvg)
      .composite([{ input: image, left: 0, top: 48 }])
      .png()
      .toBuffer();
    thumbs.push(tile);
  }
  if (thumbs.length === 0) return null;
  const columns = 4;
  const rows = Math.ceil(thumbs.length / columns);
  const canvas = sharp({
    create: {
      width: columns * tileWidth,
      height: rows * tileHeight,
      channels: 4,
      background: '#e2e8f0',
    },
  });
  const composite = thumbs.map((input, index) => ({
    input,
    left: (index % columns) * tileWidth,
    top: Math.floor(index / columns) * tileHeight,
  }));
  const output = resolveScreenshotPath(outputRelativePath);
  await ensureDirFor(output);
  await canvas.composite(composite).png().toFile(output);
  return outputRelativePath;
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none',
      '--hide-scrollbars',
    ],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await setAuthCookie(page);

  const entries = [];
  const failures = [];

  try {
    for (const spec of shotSpecs) {
      try {
        console.log(`[capture] ${spec.id}`);
        entries.push(await captureSpec(page, spec));
      } catch (error) {
        failures.push({ id: spec.id, message: error.message });
        console.warn(`[failed] ${spec.id}: ${error.message}`);
      }
    }

    try {
      console.log('[capture] jd-match input/result');
      entries.push(...await captureJdMatch(page));
    } catch (error) {
      failures.push({ id: 'tools-jd-match-flow', message: error.message });
      console.warn(`[failed] tools-jd-match-flow: ${error.message}`);
    }

    let demoResumeId = null;
    try {
      console.log('[auth] login and create demo resume');
      demoResumeId = await loginAndEnsureDemoResume(page);
    } catch (error) {
      failures.push({ id: 'auth-demo-resume', message: error.message });
      console.warn(`[failed] auth-demo-resume: ${error.message}`);
    }

    if (demoResumeId) {
      const withId = `?id=${encodeURIComponent(demoResumeId)}`;

      for (const spec of authenticatedDesktopSpecs) {
        try {
          console.log(`[capture] ${spec.id}`);
          entries.push(await captureSpec(page, { ...spec, authenticated: true }));
        } catch (error) {
          failures.push({ id: spec.id, message: error.message });
          console.warn(`[failed] ${spec.id}: ${error.message}`);
        }
      }

      await page.setViewport(viewports.mobile);
      try {
        await setAuthCookie(page);
        await gotoStable(page, `/m/edit${withId}`);
      } catch (error) {
        failures.push({ id: 'mobile-edit-bootstrap', message: error.message });
        console.warn(`[failed] mobile-edit-bootstrap: ${error.message}`);
      }
      for (const spec of mobileSpecs) {
        try {
          await setAuthCookie(page);
          const route = spec.route.includes('?') ? spec.route : `${spec.route}${withId}`;
          console.log(`[capture] ${spec.id}`);
          entries.push(await captureSpec(page, { ...spec, route, authenticated: true }));
        } catch (error) {
          failures.push({ id: spec.id, message: error.message });
          console.warn(`[failed] ${spec.id}: ${error.message}`);
        }
      }
    }

    const updatedIndex = await upsertIndex(entries);
    const contactSheet = await makeContactSheet(entries, 'screenshots/index/contact-sheet-supplemental.png');
    console.log(JSON.stringify({
      baseUrl,
      captured: entries.length,
      totalIndexed: updatedIndex.screenshots.length,
      contactSheet,
      failures,
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
