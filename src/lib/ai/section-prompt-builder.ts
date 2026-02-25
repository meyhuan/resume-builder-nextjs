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

// ---------------------------------------------------------------------------
// Module-specific generation logic descriptions
// ---------------------------------------------------------------------------

const MODULE_LOGIC: Record<SectionModuleType, string> = {
  experience:
    '【工作/实习经历模块】遵循「动作+执行过程+业务支撑」逻辑。' +
    '去职责化，突出真实动作与能力。有用户提供数据的强化量化，无数据的绝不虚构。' +
    '每条经历以强动作动词开头，阐述具体做了什么、用了什么工具/方法、产出是什么。',
  project:
    '【项目经历模块】遵循「项目背景+个人职责+执行动作+项目结果」逻辑。' +
    '重点突出个人的真实贡献，绝不夸大个人在项目中的角色。' +
    '明确区分"个人负责"和"团队协作"的边界。',
  campus:
    '【校园经历模块】遵循「场景+个人动作+落地结果」逻辑。' +
    '把校园场景内容转化为职场可识别的能力（组织力、沟通力、执行力等）。' +
    '绝不虚构校园奖项或职务。',
  'self-evaluation':
    '【自我评价模块】遵循「1句话身份+2个核心匹配能力+1个求职意愿」逻辑。' +
    '100%基于用户真实经历生成，无空话套话。' +
    '避免使用"热爱学习"、"吃苦耐劳"等泛滥的无意义描述。' +
    '根据用户选择的目标岗位类型调整措辞风格和关键词侧重。',
  skills:
    '【专业技能模块】遵循「技能名称+掌握程度+应用场景」逻辑。' +
    '严格区分「了解/掌握/熟练」三个层级。' +
    '绝不虚构用户未提及的技能。',
};

// ---------------------------------------------------------------------------
// Core packaging strategy (default - encourages expansion and professionalization)
// ---------------------------------------------------------------------------

const PACKAGING_STRATEGY =
  '## 内容生成与包装策略\n' +
  '1. **合理发散与丰满细节**：用户通常只能提供简单的动作骨架。你需要基于这些有限的信息，结合该岗位的行业常规标准，合理推演并补充具体的执行细节、业务场景、使用工具和方法论，使经历看起来丰满且专业。\n' +
  '2. **专业化包装**：将口语化的表达转化为高级的职场术语（例如将“拉群聊天”包装为“搭建私域用户池与制定促活SOP”）。\n' +
  '3. **合理的数据修饰**：不要凭空捏造极度具体的敏感核心数据（如具体营收多少万），但可以补充合理的规模性描述（如“处理海量数据”、“服务数万规模用户”）或使用 [X]% 等占位符来提升专业感。\n' +
  '4. **提升经历含金量**：在合理范围内，将基础的执行工作包装为具备思考深度和业务价值的产出，体现求职者的主观能动性。\n';

// ---------------------------------------------------------------------------
// Strict compliance rules (used ONLY when realistic mode is enabled)
// ---------------------------------------------------------------------------

const STRICT_COMPLIANCE_RULES =
  '## 无成果纯写实模式（已开启，绝对不可违反以下红线）\n' +
  '1. **事实锚定**：所有内容100%基于用户输入的真实事实。绝对禁止新增用户未提及的任何动作、项目、数据、成果、身份。\n' +
  '2. **禁止虚构数据**：用户未提供的量化成果（营收、增长率、转化率等），绝对不可凭空编造。完全禁用量化数据生成、成果夸大、价值拔高类内容。彻底规避任何造假风险。\n' +
  '3. **禁止夸大身份**：用户为「协助/参与」时，不得改写为「主导/统筹/全链路负责」。用户为执行层时，不得使用管理层话术。\n' +
  '4. **禁止越界话术**：生成内容必须匹配用户的求职身份层级，不得出现远超其身份的动作词与内容深度。\n' +
  '5. **仅做事实梳理**：仅做事实梳理、语句优化、专业转译。禁止生成全网泛滥的无意义空话。\n';

// ---------------------------------------------------------------------------
// Polish-level instructions
// ---------------------------------------------------------------------------

const POLISH_LEVEL_INSTRUCTIONS: Record<PolishLevel, string> = {
  basic:
    '## 润色档位：原文优化\n' +
    '仅修正语病、优化语句通顺度、规范标点格式。100%保留用户原文内容与结构，不做任何增减。不改变原文的信息量和表达深度。',
  professional:
    '## 润色档位：专业润色\n' +
    '基于用户原始内容，进行逻辑梳理、职场专业术语转译、结构化优化。贴合对应模块的HR阅读习惯。不新增任何用户原文中没有的内容。',
  'jd-match':
    '## 润色档位：岗位匹配优化\n' +
    '基于用户原始内容和目标JD，调整内容呈现优先级，突出与岗位匹配的核心能力，优化ATS机筛关键词布局。不新增用户原文中没有的虚构内容。',
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
    '你是一位资深简历优化顾问，专注于帮助求职者将简历内容优化为专业、合规、真实的表达。',
    '',
    `## 用户身份\n${IDENTITY_CONTEXT[identity]}`,
    '',
    `## 模块逻辑\n${MODULE_LOGIC[moduleType]}`,
    '',
    realisticMode ? STRICT_COMPLIANCE_RULES : PACKAGING_STRATEGY,
    `## 动作词约束\n- 推荐使用的动作词：${allowed}\n- 禁止使用的动作词：${forbidden}\n`,
    POLISH_LEVEL_INSTRUCTIONS[polishLevel],
  ];

  parts.push(
    '',
    '## 输出要求',
    '- 直接输出润色后的内容，不要输出任何解释、前缀或后缀。',
    '- 使用 HTML 格式输出（<p>、<ul>、<li> 等标签），以便直接插入简历编辑器。',
    '- 每条经历描述以强动作动词开头。',
    '- 如果用户提供了量化数据，请保留并合理强化；如果没有，绝不虚构。',
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
    realisticMode ? STRICT_COMPLIANCE_RULES : PACKAGING_STRATEGY,
    `## 动作词约束\n- 推荐使用的动作词：${allowed}\n- 禁止使用的动作词：${forbidden}\n`,
    '',
    '## 输出要求',
    '- 直接输出生成的内容，不要输出任何解释、前缀或后缀。',
    '- 使用 HTML 格式输出（<p>、<ul>、<li> 等标签），以便直接插入简历编辑器。',
    '- 100%基于用户提供的信息生成。如果处于默认模式，请进行合理发散与包装；如果开启了写实模式，则严格基于事实。',
    '- 如果用户提供的信息极度匮乏，请基于已有信息做最大程度的专业化表达。',
    '- 如果某些信息缺失导致无法生成有意义的内容，使用占位符 [建议补充：xxx] 提示用户。',
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
