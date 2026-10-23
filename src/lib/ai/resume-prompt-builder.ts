/**
 * Prompt engineering for AI resume generation.
 *
 * Builds structured prompts from wizard inputs that instruct the AI
 * to return valid JSON matching the ExternalResume schema.
 */

export type UserIdentity = 'student' | 'graduate' | 'professional';

/**
 * Clean input extracted from the wizard store for prompt building.
 */
export interface WizardInput {
  readonly identity: UserIdentity;
  readonly workYears: string;
  readonly targetRole: string;
  readonly major: string;
  readonly projects: readonly string[];
  readonly campusActivities: readonly string[];
  readonly softSkills: readonly string[];
  readonly certificates: readonly string[];
  readonly additionalInfo: string;
}

/** Identity labels used inside prompts. */
const IDENTITY_LABELS: Record<UserIdentity, string> = {
  student: '在校生',
  graduate: '应届生',
  professional: '职场人',
};

/**
 * Build the complete system prompt for resume generation.
 */
export function buildSystemPrompt(): string {
  return `你是一位拥有10年经验的专业简历撰写专家。你擅长根据用户的身份、意向岗位和个人经历，撰写高质量、专业的中文简历内容。
你的输出必须是一个合法的JSON字符串，可以被JSON.parse直接解析。不得包含任何多余内容（如解释、注释、markdown标记、代码块标记等）。
真实性优先于篇幅与模块完整：只整理用户明确提供的经历与技能；求职岗位、专业和年限不是经历证据。不得新增公司、学校、实习、项目、证书、工具、成绩或日期。未提供的个人字段和时间留空，未提供的经历数组省略或为空。不能把一个项目拆成多个独立项目，也不能将课程项目改写为实习。用户否认的经历不得生成。`;
}

/**
 * Build the user prompt for full resume generation.
 */
export function buildResumePrompt(input: WizardInput): string {
  const identityLabel: string = IDENTITY_LABELS[input.identity];
  const sections: string[] = [];

  sections.push(buildUserContext(input, identityLabel));
  sections.push(buildSectionInstructions(input));
  sections.push(buildContentGuidelines(input, identityLabel));
  sections.push(buildOutputSchema());
  sections.push(buildFinalInstructions());

  return sections.join('\n\n');
}

/**
 * Build a prompt for generating a single module's content (future use).
 */
export function buildModulePrompt(
  moduleTitle: string,
  keywords: string,
  context: string,
): string {
  return `上下文：根据以下关键词"${keywords}"生成内容。${context ? `补充信息：${context}` : ''}
目标：根据提供的关键词生成简历模块"${moduleTitle}"的精炼内容。使用简历行业常用术语，确保内容简洁、专业且符合简历模块的规范，突出与"${moduleTitle}"相关的核心能力、工作经验或成就。
风格：严谨且精炼的简历写作风格。避免口语化，注重用词准确，语言简洁清晰，确保内容高度专业且符合简历行业规范。
响应：根据关键词和模块标题生成简历模块内容，直接返回最终结果，确保无多余解释或非必要信息，纯HTML格式返回（使用<ul><li>或<p>标签）。`;
}

/**
 * Build a prompt for polishing existing content (future use).
 */
export function buildPolishPrompt(
  moduleTitle: string,
  content: string,
): string {
  return `你是专业的简历优化顾问。请对简历中"${moduleTitle}"模块进行优化润色。
要求：
1. 仅润色原内容，不增加无关内容
2. 保持严谨风格，使用专业简历用语
3. 控制字数，保留核心价值，突出专业亮点
4. 直接返回优化后的内容，纯HTML格式（使用<ul><li>或<p>标签），不要包含任何解释

原内容：${content}`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildUserContext(input: WizardInput, identityLabel: string): string {
  const lines: string[] = [
    `## 用户信息`,
    `- 身份：${identityLabel}`,
    `- 意向岗位：${input.targetRole}`,
  ];

  if (input.major) {
    lines.push(`- 专业：${input.major}`);
  }
  if (input.identity === 'professional' && input.workYears) {
    lines.push(`- 工作年限：${input.workYears}`);
  }
  if (input.projects.length > 0) {
    lines.push(`- 项目经验关键词：${input.projects.join('、')}`);
  }
  if (input.campusActivities.length > 0) {
    lines.push(`- 校园活动经历：${input.campusActivities.join('、')}`);
  }
  if (input.softSkills.length > 0) {
    lines.push(`- 技能特长：${input.softSkills.join('、')}`);
  }
  if (input.certificates.length > 0) {
    lines.push(`- 资格证书：${input.certificates.join('、')}`);
  }
  if (input.additionalInfo) {
    lines.push(`- 补充说明：${input.additionalInfo}`);
  }

  return lines.join('\n');
}

function buildSectionInstructions(input: WizardInput): string {
  const lines: string[] = ['## 需要生成的简历模块'];

  switch (input.identity) {
    case 'student':
      lines.push('请生成以下模块（按重要性排序）：');
      lines.push('1. base_info — 基本信息（姓名用"姓名"占位，手机和邮箱用占位符）');
      lines.push('2. job_intention — 求职意向');
      lines.push('3. education — 仅整理用户提供的学校、学历和课程，缺失字段留空');
      lines.push('4. self_evaluation — 自我评价');
      if (input.campusActivities.length > 0) {
        lines.push('5. school_exps — 仅整理用户提供的校园活动，不新增活动或职责');
      }
      lines.push(`${input.campusActivities.length > 0 ? '6' : '5'}. skills — 专业技能`);
      if (input.certificates.length > 0) {
        lines.push(`${input.campusActivities.length > 0 ? '7' : '6'}. qualifications — 资质证书`);
      }
      lines.push('experience 与 intern 仅在用户明确提供对应真实经历时生成，不能从求职身份推断。');
      break;

    case 'graduate':
      lines.push('请生成以下模块（按重要性排序）：');
      lines.push('1. base_info — 基本信息');
      lines.push('2. job_intention — 求职意向');
      lines.push('3. education — 教育经历（1条）');
      lines.push('4. self_evaluation — 自我评价');
      if (input.projects.length > 0) {
        lines.push('5. program_experience — 仅整理用户提供的项目，项目数量不得超过输入，不新增项目');
      }
      lines.push('6. intern — 仅在用户提供实际实习经历时整理，否则省略或返回空数组');
      lines.push('7. skills — 专业技能');
      if (input.certificates.length > 0) {
        lines.push('8. qualifications — 资质证书');
      }
      break;

    case 'professional': {
      lines.push('请生成以下模块（按重要性排序）：');
      lines.push('1. base_info — 基本信息');
      lines.push('2. job_intention — 求职意向');
      lines.push('3. self_evaluation — 自我评价');
      lines.push('4. experience — 只整理用户提供的实际工作经历，最近的经历在前；未提供时省略');
      if (input.projects.length > 0) {
        lines.push('5. program_experience — 仅整理用户提供的项目，项目数量不得超过输入，不新增项目');
      }
      lines.push('6. education — 教育经历（1条）');
      lines.push('7. skills — 专业技能');
      if (input.certificates.length > 0) {
        lines.push('8. qualifications — 资质证书');
      }
      break;
    }
  }

  return lines.join('\n');
}

function buildContentGuidelines(input: WizardInput, identityLabel: string): string {
  const years: number = parseWorkYears(input.workYears);
  const lines: string[] = ['## 内容生成要求（对标资深HR与猎头标准）'];

  lines.push(`1. 所有内容必须严格围绕【${input.targetRole}】岗位生成，禁止出现无关内容`);
  lines.push('2. **结构化小标题（关键）**：experience、intern、program_experience、school_exps 中的每段经历必须包含 2~4 条要点，HTML 严格使用 `<ul><li><strong>核心维度：</strong>具体内容</li></ul>` 格式，每条开头必须提炼 4~6 字专业维度小标题并加粗（例如：`<strong>核心项目协同：</strong>`、`<strong>架构设计与实现：</strong>`、`<strong>性能治理与优化：</strong>`），每条 40~70 字');
  lines.push('3. **事实内结构化**：按「实际动作 + 用户提供的方法 + 已有结果」组织内容；缺失的部分省略。不得根据岗位常识添加工具、具体组件、业务方法或成果，不得扩大参与/协助职责。事实较少时允许少于2条或短于40字，不为凑长度补造细节。');
  lines.push('4. **真实感量化占位符（[X]机制）**：对于用户未在输入中明确提供的具体成果数字，严禁凭空捏造具体假数字，每段最多允许 2 处 `[X]%` 或 `[X]+` 占位符留白（仅在有考核指标处使用，如“核心场景崩溃率降低 [X]%”、“覆盖 [X]+ 款机型”），引导用户后续填入真实战果');
  lines.push('5. **专业技能分组结构化**：skills 模块的 content 使用 `<ul><li><strong>技能分类：</strong>具体技能掌握程度与应用场景描述</li></ul>` 格式分类呈现，避免杂乱罗列名词');
  lines.push('6. 时间格式统一使用"YYYY.MM"，如"2023.06"');

  if (input.identity === 'professional') {
    lines.push(`7. 【年限适配】根据${years}年工作经验调整内容深度：`);
    lines.push(`   ${generateYearsGuidance(years)}`);
  } else if (input.identity === 'student') {
    lines.push(`7. 作为${identityLabel}，突出学习能力、课程成绩、校园活动和技术热情`);
  } else {
    lines.push(`7. 作为${identityLabel}，突出实习经验、项目经历和专业基础`);
  }

  if (input.softSkills.length > 0) {
    lines.push(`8. 在技能模块中融入以下技能关键词：${input.softSkills.join('、')}`);
  }
  if (input.certificates.length > 0) {
    lines.push(`9. 在资质证书模块中包含：${input.certificates.join('、')}`);
  }

  return lines.join('\n');
}

function buildOutputSchema(): string {
  return `## 输出JSON结构要求

请严格按照以下TypeScript接口生成JSON（仅包含需要的字段）：

\`\`\`
interface ExternalResume {
  base_info: {
    name: string;          // 使用"姓名"占位
    gender?: string;       // 仅用户明确提供时填写，否则留空
    age?: string;          // 仅用户明确提供时填写，否则留空
    phone?: string;        // 使用"电话号码"占位
    mail?: string;         // 使用"邮箱"占位
    hide_avatar?: boolean; // false
  };
  job_intention: {
    objective: string;     // 意向岗位名称
    city?: string;         // 如 "不限"
    salary?: string;       // 如 "面议"
    type?: string;         // 如 "全职"
    is_hide?: boolean;     // false
  };
  self_evaluation?: {
    content: string;       // HTML格式的自我评价，<p>标签包裹
    is_hide?: boolean;
  };
  experience?: Array<{
    id: string;            // 唯一ID如 "exp-1"
    name: string;          // 公司名称
    industry?: string;     // 行业
    position: string;      // 职位名称
    content: string;       // HTML格式的工作内容，用<ul><li>罗列
    is_hide?: boolean;
    period: { start: string; end: string; }; // "YYYY.MM" 格式
  }>;
  intern?: Array<{
    id: string;
    name: string;
    industry?: string;
    position: string;
    content: string;       // HTML格式
    is_hide?: boolean;
    period: { start: string; end: string; };
  }>;
  education?: Array<{
    id: string;
    name: string;          // 学校名称
    major?: string;        // 专业
    degree?: string;       // 如 "本科"、"硕士"
    course?: string;       // HTML格式的课程信息
    is_hide?: boolean;
    period: { start: string; end: string; };
    content?: string;
  }>;
  program_experience?: Array<{
    id: string;
    name: string;          // 项目名称
    role?: string;         // 项目角色
    content: string;       // HTML格式
    is_hide?: boolean;
    period: { start: string; end: string; };
  }>;
  school_exps?: Array<{
    id: string;
    name: string;          // 组织名称
    position?: string;     // 职务
    content: string;       // HTML格式
    is_hide?: boolean;
    period: { start: string; end: string; };
  }>;
  skills?: {
    content: string;       // HTML格式，用<ul><li>罗列技能
    is_hide?: boolean;
  };
  qualifications?: {
    content: string;       // HTML格式，用<p>包裹
    is_hide?: boolean;
  };
}
\`\`\`

每条经历的id必须唯一，使用如 "exp-1"、"edu-1"、"proj-1"、"intern-1"、"campus-1" 的格式。
不需要的模块字段直接省略，不要设置为空数组。`;
}

function buildFinalInstructions(): string {
  return `## 最终要求
1. 必须返回可直接被JSON.parse解析的合法JSON字符串
2. 不得包含任何多余内容（如解释、注释、markdown代码块标记\`\`\`等）
3. 不得包含JSON之外的任何文字
4. 返回前请自行检查JSON格式有效性
5. 只为有事实依据的模块生成内容；信息不足时省略模块或保留空字段，不得为填满简历编造内容`;
}

function parseWorkYears(workYears: string): number {
  const match: RegExpMatchArray | null = workYears.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function generateYearsGuidance(years: number): string {
  if (years < 1) return '▶ 突出学习能力/实习项目/技术热情';
  if (years < 3) return '▶ 展示已有实践与真实职责，不推断独立负责能力';
  if (years < 5) return '▶ 展示已提供的业务与技术经验，不推断架构或带人经验';
  return '▶ 整理已提供的长期经验，不从年限推断管理职责或决策权';
}
