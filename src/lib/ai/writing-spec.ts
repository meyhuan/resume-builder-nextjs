import type { SectionModuleType } from '@/lib/ai/section-types';

/**
 * Shared resume writing specification across all modules and entry points
 * (Unified Assistant chat, Section Polish drawer, Section Generate drawer).
 *
 * Core Philosophy:
 * - Match or surpass WPS / professional resume writers in structure, workflow
 *   expansion, terminology translation, and value articulation.
 * - Strictly treat ALL unmentioned numbers/percentages/quantities as [X]
 *   placeholders requiring user confirmation.
 * - Zero fabrication of unmentioned tools, acronyms, system names, or role levels.
 */

export interface ModuleSpec {
  readonly title: string;
  readonly structure: string;
  readonly lengthRule: string;
  readonly maxPlaceholders: number;
  readonly coreGuidelines: string;
  readonly strictRedlines: string;
  readonly examples: string;
  readonly missingFactsHint?: string;
  readonly bannedPhrases?: readonly string[];
}

export const EVIDENCE_TIERS = `### 信息分级与生成边界（决定每个细节怎么写）
- L1 原文事实（严格保留）：职位、动作、业务对象、原文出现的技术/工具名称、职责级别（负责 vs 协助/跟着/帮忙/参与）、技能熟练度（会/了解/刚开始学）、能力边界说明（如未持证、不独立操作带电设备）——必须如实保留，严禁擅自升降级或反写。
- L2 专业流程展开（直接生成，达到专业简历写手深度）：
  1) 提炼 4~6 字专业维度小标题；
  2) 将原文简略动作展开为该岗位必然伴随的标准工作流程（例：「按需求写用例」→「依据需求梳理正常与异常测试场景，完成功能测试用例编写」；「测试提bug就改」→「同步跟进测试反馈的缺陷问题，快速定位并完成修复闭环」；「收货点数上架」→「按照仓管作业规范完成货物清点核验、标签张贴与库位上架全流程」）；
  3) 将口语表达转译为行业通用中文职场术语；
  4) 句末补充与本条工作直接相关的交付标准或业务支撑价值（如「保障页面视觉还原度与交互一致性」「避免问题货物流转至下一环节」）。
- L3 数据与量化结果（必须写 [X] 占位符，留待用户确认）：
  原文未出现的任何数量、百分比、时长、频次、人数、排名、页数、模块数、天数/小时数，以及原文未明确声明的“100%”等数字指标，绝对禁止直接写出具体数字！需要量化支撑时，必须写成「具体指标名 + [X]」（如「累计闭环 [X] 个缺陷」「视觉还原度达 [X]% 以上」「累计服务参会人员超 [X] 人次」「考核成绩位列前 [X]%」）。
- L4 严禁编造的新事实（零新增）：
  1) 严禁新增原文未提及的软件、工具、框架、协议、管理体系英文缩写（如原文未提则禁止写 Jira、Pytest、Axios、RESTful、Mock、Composition API、WMS、ERP、6S、5S、FIFO、ABC分类法、CET-4、SKU、SOP、SELECT、ls/grep 等）；
  2) 严禁凭空编造专有项目名、系统名、公众号名、学校名（如原文只写“软件公司/公众号/后台系统”，禁止编造「智能工单系统」「文化速递」「订单管理」「校团委公众号」「XX大学」）；
  3) 严禁把“帮忙/协助/跟着师傅/见习/学徒/干事/志愿者”拔高为“独立负责/主导/统筹”。`;

export const COMMON_SPEC = `### 通用约束与排版规范
1. 统一列表结构：整段内容必须且只能输出一个 \`<ul>\` 列表，格式为 \`<ul><li><strong>4~6字专业维度：</strong>具体内容</li></ul>\`。严禁在 \`<ul>\` 前后输出任何 \`<p>\` 标题行、公司/职位/时间抬头、或总结引导语！
2. 专有名称引号：仅当原文已经明确给出了专有项目/产品名称时，可用直角引号「」标注；若原文只是通用称呼（如“设备借用后台”“便利店进销存系统”“早餐店公众号”），直接自然表述，不要强行造名加引号。
3. 零新增阿拉伯数字：除原文已有的数字（如 Vue3、135编辑器、C1、四级）和明确允许的 \`[X]\` 占位符外，严禁在输出中新增任何阿拉伯数字（0~9）或中文数量词（如“每周三五篇”“两周内”“二十余项”全部禁止）。
4. 禁用空泛口号：禁止单独以“提升用户体验”“助力业务发展”等空话收尾，必须指明支撑的具体环节或质量目标。`;

export const MODULE_SPECS: Record<SectionModuleType, ModuleSpec> = {
  education: {
    title: '教育背景',
    structure:
      '输出单个 `<ul>` 包含 2~3 条 `<li>`：依次为 `<strong>主修课程：</strong>`、`<strong>学术实践：</strong>`、`<strong>语言能力：</strong>`（或 `<strong>技能证书：</strong>` / `<strong>资质备考：</strong>`，按原文实际提及内容取舍，未提及的维度不写）。',
    lengthRule: '每条 40~80 字，全部放入同一个 `<ul>` 中，禁止输出学校/专业/时间 `<p>` 抬头行。',
    maxPlaceholders: 1,
    coreGuidelines:
      '主修课程串联原文提及的课程并点明夯实的专业理论基础；学术实践将课程作业/实训展开为完整的实操流程与产出物（最多可用 1 处 [X] 占位，如实训合格率达 [X]% 或累计发布原创内容 [X] 篇）；语言与证书说明实际应用能力（若原文提及尚未取得某证书，如实写为“正在备考…，已掌握相关理论与安全规范”）。',
    strictRedlines:
      '严禁编造原文未提的课程名称、编程语言（如原文只写“做过网页”不得擅自写 HTML/CSS/JS）、奖学金或“XX大学”；原文写“英语四级”就写“大学英语四级考试”，不要改写为 CET-4。',
    examples: `参考范式（仅示范结构与展开深度，严禁照搬其它专业词汇）：
<ul>
<li><strong>主修课程：</strong>系统学习数据结构、数据库原理、计算机网络、软件工程等核心专业课程，夯实软件开发底层理论基础。</li>
<li><strong>学术实践：</strong>参与网页开发课程设计，完成页面布局、交互逻辑实现及基础功能调试，产出符合课程要求的可运行网页作品。</li>
<li><strong>语言能力：</strong>通过大学英语四级考试，具备阅读专业领域英文技术文档与查阅基础资料的能力。</li>
</ul>`,
    missingFactsHint: '在 answer 中追问 1~2 项可补充的真实信息（如：课程设计或实训的具体得分/排名百分比、累计产出的作业或文章篇数）。',
  },
  experience: {
    title: '工作经历',
    structure:
      '输出单个 `<ul>` 包含 3~4 条 `<li>`：格式为 `<ul><li><strong>4~6字业务/技术维度：</strong>具体动作 + 遵循的标准/流程/方法 + 业务支撑或质量结果</li></ul>`。',
    lengthRule: '每条 55~90 字；全部放入同一个 `<ul>` 中，严禁在 `<ul>` 上方输出职位/公司 `<p>` 标题段。',
    maxPlaceholders: 2,
    coreGuidelines:
      '将原文中的日常职责按工作模块拆分为 3~4 个专业维度（如开发执行/接口联调/团队协同，或商品运营/活动提报/库存监控/数据周报，或作业执行/质量管控/设备运维/安全合规），把每个动作展开为完整的标准执行链路，并在合适的结果处留出 1~2 处 [X] 指标占位符待用户确认。',
    strictRedlines:
      '严格保持原文职责级别（原文为初级/学徒/助理/协助时，不得写成主导或独立负责核心架构；原文明确写“不独立处理带电故障”等安全红线必须完整保留）。严禁新增原文未提的软件或协议名（如 RESTful、WMS、6S 等）。',
    examples: `参考范式（仅示范结构与展开深度）：
<ul>
<li><strong>前端开发执行：</strong>基于 Vue3 与 JavaScript 技术栈，配合 Element Plus 组件库完成后台管理系统的列表、查询、表单类核心页面开发，严格遵循 HTML/CSS 规范还原设计稿，保障页面视觉还原度达 [X]% 以上。</li>
<li><strong>接口联调与维护：</strong>按照前后端接口约定完成数据对接，实现页面动态数据渲染与交互逻辑；同步跟进测试反馈的缺陷问题，快速响应完成问题修复，确保上线后问题发生率低于 [X]%。</li>
<li><strong>团队协同交付：</strong>开发过程中针对复杂问题主动与资深同事沟通确认，高效对齐开发规范与需求细节，保障所负责模块按期保质交付，支持项目整体迭代推进。</li>
</ul>`,
    missingFactsHint: '在 answer 中针对正文里的 [X] 占位符给出 1~2 个具体确认项（如：负责模块的数量、准确率/问题率百分比、月均处理单量）。',
  },
  internship: {
    title: '实习经历',
    structure:
      '输出单个 `<ul>` 包含 2~3 条 `<li>`：格式为 `<ul><li><strong>4~6字维度：</strong>协助/参与动作 + 具体执行流程与规范 + 交付成果与支撑价值</li></ul>`。',
    lengthRule: '每条 55~90 字；全部放入同一个 `<ul>` 中，严禁输出公司/时间 `<p>` 抬头行。',
    maxPlaceholders: 2,
    coreGuidelines:
      '明确体现实习生在导师/资深同事指导下的执行落地、核对校验、素材/台账整理与进度同步能力。若原文说明了能力边界（如“主要做辅助操作，没有独立编程和调机”），必须如实写明实习定位与边界，体现严谨合规意识。',
    strictRedlines:
      '禁用“主导”“统筹”“全链路负责”；当原文写“跟着师傅/协助/帮忙”时，严禁出现“独立负责”；严禁新增原文未提的第三方库（如 Axios）或虚构系统名称（如「智能工单系统」）。',
    examples: `参考范式（仅示范结构与展开深度）：
<ul>
<li><strong>页面样式优化：</strong>协助前端团队完成 UI 还原工作，在导师指导下调整页面配色、间距等样式细节，累计迭代 [X] 个业务页面，保障页面视觉一致性。</li>
<li><strong>功能模块开发：</strong>参与表单校验规则的代码编写与简单业务接口联调，覆盖常用格式校验与交互反馈场景，保障相关功能正常可用。</li>
<li><strong>项目协同跟进：</strong>按日向带教同事同步开发进度与待协调问题，及时对齐工作要求，保障所承接任务按期准确交付。</li>
</ul>`,
    missingFactsHint: '在 answer 中针对 [X] 占位符给出 1~2 个确认项（如：累计参与的页面/用例/文章数量、核验记录条数）。',
  },
  project: {
    title: '项目经历',
    structure:
      '输出单个 `<ul>` 包含 4 条固定维度 `<li>`：依次为 `<li><strong>项目背景：</strong>…</li>`、`<li><strong>项目职责：</strong>…</li>`、`<li><strong>解决方案：</strong>…</li>`、`<li><strong>项目成果：</strong>…</li>`。',
    lengthRule: '每条 55~95 字；全部放入同一个 `<ul>` 中，严禁在 `<ul>` 外输出项目名称 `<p>` 标题行或散落的 Markdown 星号。',
    maxPlaceholders: 2,
    coreGuidelines:
      '1) 项目背景：基于原文项目主题自然提炼业务目标与覆盖的核心场景；2) 项目职责：明确个人负责的具体模块与团队协同边界（如“接口由同学编写，本人负责前端三类页面开发与联调”）；3) 解决方案：展开具体的实现步骤、校验规则、台账/工具使用方法与流程闭环；4) 项目成果：说明功能跑通/验收情况与实际价值，合理设置 1~2 处 [X] 占位符。',
    strictRedlines:
      '严禁新增原文未提的技术名词（如 Composition API、RESTful、Mock、WMS、6S）；严禁直接写“响应耗时低于200ms”“10+用户访谈”“产出10余篇”“排查3项差异”“提升15%”等原文没有的具体数字，所有此类数值必须写为 [X]！',
    examples: `参考范式（仅示范四段式结构与展开深度）：
<ul>
<li><strong>项目背景：</strong>为巩固前端开发技能并熟悉中后台系统开发流程，与同学协同开展设备借用后台练习项目，实现设备查询、借用申请、归还登记全流程线上化管理。</li>
<li><strong>项目职责：</strong>负责设备列表页、借用表单页、归还登记页的核心页面开发与功能自测工作，协同编写后端接口的同学完成前后端数据联调。</li>
<li><strong>解决方案：</strong>基于 Vue3 与 Element Plus 搭建页面结构，实现表单必填项校验、列表分页查询及设备借用状态多维度筛选功能，确保前端交互与数据逻辑一致。</li>
<li><strong>项目成果：</strong>项目在本地环境顺利跑通完整业务流程，覆盖 [X] 个核心功能模块，页面交互响应耗时低于 [X] ms，达到预期练习与验收标准。</li>
</ul>`,
    missingFactsHint: '在 answer 中针对项目成果中的 [X] 占位符给出 1~2 个确认项（如：覆盖的测试场景/缺陷数、产出内容篇数、转化或效率提升比例）。',
  },
  campus: {
    title: '校园经历',
    structure:
      '输出单个 `<ul>` 包含 2~3 条 `<li>`：格式为 `<ul><li><strong>4~6字维度：</strong>协助/负责动作 + 具体执行事项 + 现场/流程保障结果</li></ul>`。',
    lengthRule: '每条 50~85 字；必须拆分为 2~3 条 `<li>` 放入 `<ul>` 中，禁止合并成单段 `<p>`！',
    maxPlaceholders: 2,
    coreGuidelines:
      '将校园社团、学生助理、班委、志愿服务中的具体事务拆分为 2~3 个清晰的工作维度（如日常运营支持/活动现场保障，或行政事务协助/数据核对校验/数据汇总输出，或后勤保障/物资管理/账务管理），突出流程规范性、核对细致度与零差错交付意识。',
    strictRedlines:
      '当原文为“干事/助理/志愿者/帮忙/协助”时，动作词必须使用“协助/参与/承担/执行/负责具体某项事务”，严禁拔高为“独立负责社团日常活动”或“统筹全局”；严禁编造未提及的突发事件（如“临时变更教室”）。',
    examples: `参考范式（仅示范结构与展开深度）：
<ul>
<li><strong>日常运营支持：</strong>协助完成计算机社团日常活动筹备与落地执行，负责报名信息登记、活动教室协调申请及活动通知推送，累计支持社团活动 [X] 场。</li>
<li><strong>活动现场保障：</strong>承担编程分享会等活动的现场执行工作，负责参会同学签到核验、活动物资有序发放及到场人员动线引导，累计服务参会人员 [X] 人次，保障现场秩序顺畅。</li>
</ul>`,
    missingFactsHint: '在 answer 中针对 [X] 占位符追问：累计参与的活动场次、服务人数或核对处理的数据条数。',
  },
  'self-evaluation': {
    title: '自我评价',
    structure:
      '输出单个 `<ul>` 包含固定 3 条 `<li>`：依次为 `<li><strong>专业能力：</strong>…</li>`、`<li><strong>职业态度：</strong>…</li>`、`<li><strong>职业潜力：</strong>…</li>`。',
    lengthRule: '每条 50~85 字；必须使用 3 条 `<ul><li>` 结构，禁止写成一整段 `<p>`！',
    maxPlaceholders: 0,
    coreGuidelines:
      '1) 专业能力：基于原文提及的专业背景、核心技能与实操内容，说明能完成的岗位基础工作；2) 职业态度：将原文中的性格与做事特点（如认真、细心重复检查、主动问清需求、不怕被拒绝、接受改稿、适应车间倒班、重视安全不擅自操作）转化为具体的职场行为规范描述；3) 职业潜力：结合原文提到的学习方向与求职意愿，说明明确的成长路径与岗位适配性。',
    strictRedlines:
      '绝对禁止在自我评价中编造原文未提及的具体项目名称（如「订单管理」）、工具名称（如 Jira、Pytest、Postman、WMS）或任何具体数字（如“1段实习”“20+用例”“5类缺陷”）！禁用 [X] 占位符。',
    examples: `参考范式（仅示范三段式结构与转化方式）：
<ul>
<li><strong>专业能力：</strong>计算机相关专业背景，掌握 Vue 前端开发技术，能够完成业务页面的开发与样式适配，输出符合需求规范的代码，支撑前端功能顺利交付。</li>
<li><strong>职业态度：</strong>工作认真细致，严格按照开发排期与需求标准完成任务；沟通中主动向相关同事确认需求细节，避免理解偏差，保障开发产出契合业务预期。</li>
<li><strong>职业潜力：</strong>对前端技术保持强烈的学习意愿，能够积极吸收新技术与开发方法，目标在前端开发岗位扎实深耕、持续成长。</li>
</ul>`,
    bannedPhrases: ['吃苦耐劳', '性格开朗', '责任心极强'],
    missingFactsHint: '在 answer 中提示：若有过往代表性成果数据，建议在工作或项目经历模块中补充。',
  },
  skills: {
    title: '专业技能',
    structure:
      '输出单个 `<ul>` 包含 3~4 条按能力领域归类的 `<li>`：格式为 `<ul><li><strong>能力维度名称：</strong>熟练度与工具/技术 + 可完成的具体工作场景与作用</li></ul>`（若原文包含未持证/不会操作某设备的说明，单独列出第 4~5 条 `<strong>能力边界说明：</strong>` 或 `<strong>持证情况说明：</strong>`）。',
    lengthRule: '每条 45~80 字；全部放入同一个 `<ul>` 中，禁止在 `<ul>` 上方输出 `<p>` 引导句。',
    maxPlaceholders: 0,
    coreGuidelines:
      '将零散技能按岗位职能归类为 3~4 个维度（如前端核心技术栈/开发效率工具/跨领域能力储备，或测试工具/接口测试/数据与环境操作/代码基础）。严格对齐原文熟练度：原文“会/能”写为“掌握/熟练使用…可完成…”；原文“只会简单/基础”写为“掌握…基础操作，可完成…”；原文“了解”写为“了解…，可完成基础…”；原文“刚开始学”写为“正在系统学习…，逐步掌握…”。原文说明“没有叉车证/无低压电工证”必须如实保留！',
    strictRedlines:
      '绝对禁止新增原文未提及的命令、语法词或子模块（如原文只写“浏览器控制台看报错”禁止扩写 Console/Sources/Network；只写“SQL查数据”禁止扩写 SELECT/多表关联；只写“Linux常用命令”禁止扩写 ls/cd/grep/tail；只写“先进先出”禁止加英文 FIFO）。严禁使用 [X] 占位符或任何百分比数字。',
    examples: `参考范式（仅示范分类结构与熟练度对齐）：
<ul>
<li><strong>前端核心技术栈：</strong>熟练使用 HTML、CSS、JavaScript 进行基础开发，可基于 Vue3 与 Element Plus 组件库完成常规前端页面开发、交互逻辑实现与样式适配。</li>
<li><strong>开发与调试工具：</strong>熟练使用 Git 进行代码版本管理与分支提交，可通过浏览器开发者控制台完成常规前端报错定位与问题排查，保障开发问题及时闭环。</li>
<li><strong>跨领域能力储备：</strong>掌握 SQL 基础查询语法，可完成简单业务数据查询与校验；目前正在系统学习 TypeScript，逐步掌握基础类型语法与工程化应用。</li>
</ul>`,
    missingFactsHint: '在 answer 中提示：如有相关资格证书或重点掌握的进阶工具，可补充说明。',
  },
  honors: {
    title: '荣誉证书 / 资质认证',
    structure: '每行一项，格式：`<ul><li><strong>获得时间/级别：</strong>证书或荣誉完整官方全称</li></ul>`。',
    lengthRule: '每项 ≤ 40 字。',
    maxPlaceholders: 0,
    coreGuidelines: '统一时间格式（YYYY.MM）与官方命名标准，按时间倒序排列。',
    strictRedlines: '仅做规范化梳理与格式对齐，严禁扩写，严禁无中生有增添奖项或等级，禁用 [X] 占位符。',
    examples: '示例：<ul><li><strong>2024.06：</strong>大学英语四级证书</li><li><strong>2023.11：</strong>校级优秀学生奖学金</li></ul>',
  },
  generic: {
    title: '常规模块 / 自定义模块',
    structure: '使用 `<ul><li><strong>核心维度：</strong>具体内容</li></ul>` 结构化呈现。',
    lengthRule: '每条 40~80 字。',
    maxPlaceholders: 0,
    coreGuidelines: '纠正错别字与语病，理顺逻辑脉络，转译为规范的书面职场表达。',
    strictRedlines: '严禁无依据扩写，严禁新增原文没有的数字、专有名词或虚构事实，禁用 [X] 占位符。',
    examples: '仅做语言顺畅化与结构化梳理。',
  },
};

/**
 * Builds the modular writing specification prompt for a given module kind.
 */
export function buildWritingSpec(
  moduleKind: SectionModuleType,
  options?: {
    readonly realistic?: boolean;
    readonly withMissingFacts?: boolean;
  },
): string {
  const spec = MODULE_SPECS[moduleKind] || MODULE_SPECS.experience;
  const maxP = options?.realistic ? 0 : spec.maxPlaceholders;
  const parts: string[] = [
    `## 【${spec.title}】润色与生成规范`,
    EVIDENCE_TIERS,
    COMMON_SPEC,
    '',
    `### 模块具体要求`,
    `- 结构要求：${spec.structure}`,
    `- 长度规范：${spec.lengthRule}`,
    `- 占位符约束：${
      maxP > 0
        ? `本模块最多允许 ${maxP} 处 [X] 占位符（所有原文未提供的数量、比例、频次、时长等量化数据必须写为 [X]，严禁写出具体阿拉伯数字；且总 [X] 数不得超过 ${maxP} 处）。`
        : '本模块严禁使用任何 [X] 占位符，也严禁新增任何原文未出现的数字或百分比。'
    }`,
    `- 核心准则：${spec.coreGuidelines}`,
    `- 严格红线：${spec.strictRedlines}`,
  ];

  if (spec.bannedPhrases && spec.bannedPhrases.length > 0) {
    parts.push(`- 禁用套话：严禁出现【${spec.bannedPhrases.join('、')}】等空洞词汇。`);
  }

  if (spec.examples) {
    parts.push('', spec.examples);
  }

  if (options?.withMissingFacts && spec.missingFactsHint) {
    parts.push(
      '',
      `### 待确认数据与补充信息引导（必须在 missingFacts 与 answer 字段输出）`,
      `若正文中生成了 [X] 占位符，必须在 missingFacts 数组中为每一处 [X] 生成对应的待确认项（label 为该处指标名，如“闭环缺陷数量”，hint 为填写提示，如“请填写实际数量，如 30”）。${spec.missingFactsHint}`,
    );
  }

  if (options?.realistic) {
    parts.push(
      '',
      '### 写实模式强约束（已开启）',
      '完全基于用户输入的字面事实进行专业工作流展开与术语优化，禁用任何 [X] 占位符与量化结果推演。',
    );
  }

  return parts.join('\n');
}
