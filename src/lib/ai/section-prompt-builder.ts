/**
 * Section-level prompt builder for AI polish & generation.
 *
 * Builds system prompts and user prompts that are:
 * - Identity-aware (student / graduate / professional)
 * - Module-aware (experience / project / campus / self-evaluation / skills)
 * - Compliance-first (fact-anchored, no fabrication)
 */
import type {
  SectionIdentity,
  SectionModuleType,
  PolishLevel,
  JobCategory,
} from '@/lib/ai/section-types';
import {
  ACTION_VERB_WHITELIST,
  ACTION_VERB_BLACKLIST,
} from '@/lib/ai/section-types';

// ---------------------------------------------------------------------------
// Identity descriptions (injected into system prompt)
// ---------------------------------------------------------------------------

const IDENTITY_CONTEXT: Record<SectionIdentity, string> = {
  student:
    '用户是一名在校大学生，正在寻找日常实习或寒暑假实习。' +
    '该用户缺乏正式工作经验，主要拥有校园社团、课程作业、兼职、竞赛等经历。' +
    '你需要帮助他/她将校园经历转化为职场可识别的能力表达，强调基础执行力、学习能力和可迁移技能。',
  graduate:
    '用户是一名应届毕业生，正在参加校园招聘。' +
    '该用户拥有0-1年经验，有1-2段零散实习经历，可能有毕设或竞赛项目。' +
    '你需要帮助他/她突出实习和项目中的实操经验、可迁移能力和成长性，体现能胜任正式岗位的能力。',
  professional:
    '用户是一名拥有1-3年工作经验的职场人，正在进行社会招聘。' +
    '该用户有正式工作经验，多为基层执行岗，需要从"岗位职责流水账"转化为"业务成就"表达。' +
    '你需要帮助他/她提炼工作的业务价值、核心业绩和问题解决能力，体现与应届生的差异化竞争力。',
};

import { buildWritingSpec } from '@/lib/ai/writing-spec';

// ---------------------------------------------------------------------------
// Module-specific generation logic descriptions
// ---------------------------------------------------------------------------

const MODULE_LOGIC: Record<SectionModuleType, string> = {
  education:
    '【教育背景模块】遵循 `<ul><li><strong>主修课程：</strong>…</li><li><strong>学术实践：</strong>…</li><li><strong>语言能力/技能证书：</strong>…</li></ul>` 结构化逻辑（按原文实际提及维度输出 2~3 条）。禁止输出学校/时间 `<p>` 抬头行。最多使用 1 处 [X] 占位符，严禁新增原文未提的语言或工具名。',
  experience:
    '【工作经历模块】遵循 `<ul><li><strong>核心维度：</strong>动作+标准执行流程+业务支撑/量化结果</li></ul>` 结构化逻辑（3~4条，全部在单个 `<ul>` 内，禁止输出 `<p>` 抬头）。' +
    '每条先提炼4~6字专业维度加粗前缀，再把日常动作展开为完整的岗位工作链路。原文未提供的数字/比例一律用 [X] 占位（最多 2 处），严禁编造实数或新增未提及的软件/协议缩写。',
  internship:
    '【实习经历模块】遵循 `<ul><li><strong>核心维度：</strong>协助/参与动作+执行细节与规范+交付结果</li></ul>` 结构化逻辑（2~3条，全部在单个 `<ul>` 内，禁止输出 `<p>` 抬头）。' +
    '严格保留协助/跟岗/在指导下等真实角色与能力边界说明，严禁使用“主导/统筹/独立负责全局”。原文未提供的数字用 [X] 占位（最多 2 处）。',
  project:
    '【项目经历模块】遵循四段式结构化列表：`<ul><li><strong>项目背景：</strong>…</li><li><strong>项目职责：</strong>…</li><li><strong>解决方案：</strong>…</li><li><strong>项目成果：</strong>…</li></ul>`（固定 4 条 `<li>` 放在单个 `<ul>` 内，禁止输出项目名 `<p>` 标题行）。' +
    '明确区分个人负责与团队协同边界，展开具体实现步骤与校验方法，所有原文未提及的数字指标一律写为 [X]（最多 2 处）。',
  campus:
    '【校园经历模块】遵循 `<ul><li><strong>核心维度：</strong>场景与动作+核验/协调细节+保障结果</li></ul>` 结构化逻辑（必须拆分为 2~3 条 `<li>` 放入单个 `<ul>`，禁止写成单段 `<p>`）。' +
    '将社团/班委/助理/志愿事务转化为规范的执行、核对与协同能力表达，保持干事/助理/志愿者的真实角色边界，最多使用 2 处 [X] 占位符。',
  'self-evaluation':
    '【自我评价模块】遵循三段式结构化列表：`<ul><li><strong>专业能力：</strong>…</li><li><strong>职业态度：</strong>…</li><li><strong>职业潜力：</strong>…</li></ul>`（固定 3 条 `<li>` 放入单个 `<ul>`）。' +
    '100%基于原文提到的专业、技能、做事习惯与求职方向生成，把性格特点转化为具体职场工作行为描述；严禁编造原文未提的项目、工具（如 Jira/Pytest）或任何数字，禁用 [X] 占位符。',
  skills:
    '【专业技能模块】遵循 `<ul><li><strong>能力维度：</strong>熟练度+技能/工具+可完成的具体工作场景</li></ul>`（3~4条放入单个 `<ul>`，禁止上方 `<p>` 引导语）。' +
    '严格保持原文熟练度（会/了解/刚开始学）及未持证/不操作某设备的能力边界说明；严禁新增原文未提的命令或英文缩写，禁用 [X] 占位符。',
  honors:
    '【荣誉证书模块】每项一行 `<ul><li>`，按时间倒序排列。仅做官方全称与格式对齐，严禁扩写或新增奖项。禁用 [X] 占位符。',
  generic:
    '【常规/自定义模块】使用 `<ul><li><strong>核心维度：</strong>具体内容</li></ul>` 梳理表达，修正语病与标点，严禁编造数字或新名词，禁用 [X] 占位符。',
};

// ---------------------------------------------------------------------------
// Strict compliance rules (used ONLY when realistic mode is enabled)
// ---------------------------------------------------------------------------

const STRICT_COMPLIANCE_RULES =
  '## 无成果纯写实模式（已开启，绝对不可违反以下红线）\n' +
  '1. **事实锚定**：所有内容100%基于用户输入的真实事实。绝对禁止新增用户未提及的任何动作、项目、数据、成果、身份。\n' +
  '2. **禁止虚构数据与占位符**：禁用 [X] 占位符，也绝对不可凭空编造任何数字或百分比。\n' +
  '3. **禁止夸大身份**：用户为「协助/参与/帮忙/跟着」时，不得改写为「独立负责/主导/统筹」。\n' +
  '4. **仅做专业工作流与术语转译**：将口语动作转化为规范的职场流程表达。\n';

// ---------------------------------------------------------------------------
// Polish-level instructions
// ---------------------------------------------------------------------------

const POLISH_LEVEL_INSTRUCTIONS: Record<PolishLevel, string> = {
  basic:
    '## 润色档位：原文优化\n' +
    '仅修正语病、优化语句通顺度、规范标点格式。100%保留用户原文内容与结构，不做任何增减。',
  professional:
    '## 润色档位：专业润色\n' +
    '基于用户原始内容，输出单个 `<ul>` 结构化列表，每条以 `<strong>核心维度：</strong>` 开头，结合岗位常规工作流展开「动作+标准执行步骤+业务支撑/质量结果」，完成口语到职场专业术语转译。原文未提供的任何数字/百分比统一用 `[X]` 占位（不超过模块上限），严禁编造具体实数或未提及的英文工具缩写，严禁越界拔高角色。',
  'jd-match':
    '## 润色档位：岗位匹配优化\n' +
    '基于用户原始内容和目标JD，输出单个 `<ul>` 结构化列表，提炼契合JD能力维度的 `<strong>核心维度：</strong>` 加粗小标题，突出与岗位匹配的执行流程与方法标准。原文未提供的数字统一用 `[X]` 占位，不新增虚构经历、未提及的工具或假数据。',
};

// ---------------------------------------------------------------------------
// Public API: buildPolishSystemPrompt
// ---------------------------------------------------------------------------

/**
 * Builds the system prompt for section-level polish.
 */
export function buildPolishSystemPrompt(
  identity: SectionIdentity,
  moduleType: SectionModuleType,
  polishLevel: PolishLevel,
  realisticMode: boolean,
): string {
  const allowed: string = ACTION_VERB_WHITELIST[identity].join('、');
  const forbidden: string = ACTION_VERB_BLACKLIST[identity].join('、');

  const parts: string[] = [
    '你是一位资深简历优化顾问，专注于帮助求职者将简历内容优化为专业、结构清晰、真实合规的表达。',
    '',
    `## 用户身份\n${IDENTITY_CONTEXT[identity]}`,
    '',
    `## 模块逻辑\n${MODULE_LOGIC[moduleType]}`,
    '',
    buildWritingSpec(moduleType, { realistic: realisticMode, withMissingFacts: false }),
    ...(realisticMode ? ['', STRICT_COMPLIANCE_RULES] : []),
    `## 动作词与角色对齐约束\n- 候选动作词：${allowed}\n- 禁用动作词：${forbidden}\n- 角色强绑定：若原文为“帮忙/协助/跟着/见习/学徒/干事/志愿者”，必须使用“协助/参与/配合/承担/执行”，严禁拔高为“独立负责”或“主导”！\n`,
    POLISH_LEVEL_INSTRUCTIONS[polishLevel],
  ];

  parts.push(
    '',
    '## 输出要求',
    '- 直接输出润色后的 HTML 内容（仅输出单个 `<ul><li><strong>维度：</strong>内容</li></ul>`），不要输出任何 `<p>` 标题行、公司/时间抬头、解释、前缀或 Markdown 代码块标记。',
    '- 原文未出现的任何数字、百分比、频次、时长，如需量化必须写为 `[X]`（严格遵守模块上限），绝对禁止自己写出 10、20、32、95%、100%、200ms 等具体数字！',
    '- 严禁新增原文未提及的第三方工具、框架、协议或英文缩写（如 Jira、Pytest、Axios、RESTful、WMS、6S、FIFO、CET-4 等）。',
  );

  return parts.join('\n');
}

/**
 * Builds the user prompt for section-level polish.
 */
export function buildPolishUserPrompt(
  content: string,
  jobDescription?: string,
): string {
  const parts: string[] = [
    '请对以下简历模块内容进行润色优化：',
    '',
    '---',
    content,
    '---',
  ];

  if (jobDescription?.trim()) {
    parts.push(
      '',
      '目标岗位JD：',
      '---',
      jobDescription.trim(),
      '---',
    );
  }

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Public API: buildGenerateSystemPrompt
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Job Category context for self-evaluation
// ---------------------------------------------------------------------------

const JOB_CATEGORY_CONTEXT: Record<JobCategory, string> = {
  functional:
    '目标岗位类型：职能岗（行政、人事、财务、法务等）。' +
    '自我评价应突出：严谨细致、制度合规意识、流程优化能力、跨部门协调与服务支撑能力。' +
    '关键词方向：合规意识、流程管理、数据报表、制度建设、内部协调。',
  business:
    '目标岗位类型：业务岗（运营、市场、产品、销售等）。' +
    '自我评价应突出：用户洞察力、数据驱动思维、增长导向、跨团队推动力、业务敏感度。' +
    '关键词方向：用户增长、转化优化、数据分析、需求洞察、业务闭环。',
  technical:
    '目标岗位类型：技术岗（前端、后端、算法、测试等）。' +
    '自我评价应突出：技术栈深度、工程实践能力、问题排查与解决、代码质量意识、技术视野。' +
    '关键词方向：架构设计、性能优化、代码质量、技术选型、持续学习。',
  'state-owned':
    '目标岗位类型：国企/体制内岗位（央企、国企、事业单位等）。' +
    '自我评价应突出：政治觉悟与大局观、服从组织安排、踏实肯干、团队协作精神、纪律性。' +
    '风格要求：措辞正式稳重，避免互联网黑话，体现「忠诚、担当、务实」的价值取向。' +
    '关键词方向：政治素养、组织纪律、团队协作、责任担当、学习能力。',
};

/**
 * Builds the system prompt for section-level content generation.
 */
export function buildGenerateSystemPrompt(
  identity: SectionIdentity,
  moduleType: SectionModuleType,
  jobCategory?: JobCategory,
  realisticMode: boolean = false,
): string {
  const allowed: string = ACTION_VERB_WHITELIST[identity].join('、');
  const forbidden: string = ACTION_VERB_BLACKLIST[identity].join('、');

  const parts: string[] = [
    '你是一位资深简历撰写顾问，专注于帮助求职者根据真实经历生成专业、合规的简历模块内容。',
    '',
    `## 用户身份\n${IDENTITY_CONTEXT[identity]}`,
    '',
    `## 模块逻辑\n${MODULE_LOGIC[moduleType]}`,
  ];

  if (jobCategory && moduleType === 'self-evaluation') {
    parts.push('', `## 目标岗位类型\n${JOB_CATEGORY_CONTEXT[jobCategory]}`);
  }

  parts.push(
    '',
    buildWritingSpec(moduleType, { realistic: realisticMode, withMissingFacts: false }),
    ...(realisticMode ? ['', STRICT_COMPLIANCE_RULES] : []),
    `## 动作词约束\n- 推荐使用的动作词：${allowed}\n- 禁止使用的动作词：${forbidden}\n`,
    '',
    '## 输出要求',
    '- 直接输出生成的内容，不要输出任何解释、前缀或后缀。',
    '- 使用 HTML 格式输出（<p>、<ul>、<li>、<strong> 等标签），以便直接插入简历编辑器。',
    '- 【核心结构要求】工作经历、实习经历、项目经历、校园经历模块必须生成 2~4 条结构饱满的要点（`<ul><li><strong>核心维度：</strong>具体内容</li></ul>`）。哪怕用户只填写了简短的 1~2 句话，也必须结合目标岗位常规工作流拆解为结构化专业要点，每条以 4~6 字加粗小标题开头，遵循「动作 + 执行方法/协同细节 + 业务支撑/结果」闭环。',
    '- 【量化留白要求】如果用户提供了具体数字则直接使用；如果未提供具体数字，在关键成果或规模处遵循对应模块的上限使用 `[X]%`、`[X]+` 等占位符留白引导用户填空（开启写实模式除外），绝不凭空编造具体实数。',
    '- 如果某些核心背景缺失，可使用占位符 `[建议补充：xxx]` 提示用户。',
  );

  return parts.join('\n');
}

/**
 * Builds the user prompt for section-level content generation from guided answers.
 */
export function buildGenerateUserPrompt(
  answers: Record<string, string>,
  jobDescription?: string,
): string {
  const parts: string[] = [
    '请根据以下信息为我生成简历模块内容：',
    '',
  ];

  for (const [question, answer] of Object.entries(answers)) {
    if (answer.trim()) {
      parts.push(`**${question}**：${answer}`);
    }
  }

  if (jobDescription?.trim()) {
    parts.push(
      '',
      '目标岗位JD：',
      '---',
      jobDescription.trim(),
      '---',
    );
  }

  return parts.join('\n');
}
