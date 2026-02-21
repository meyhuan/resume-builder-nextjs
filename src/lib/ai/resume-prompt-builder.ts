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
你的输出必须是一个合法的JSON字符串，可以被JSON.parse直接解析。不得包含任何多余内容（如解释、注释、markdown标记、代码块标记等）。`;
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
      lines.push('3. education — 教育经历（1条，根据专业生成合理的学校和课程）');
      lines.push('4. self_evaluation — 自我评价');
      if (input.campusActivities.length > 0) {
        lines.push('5. school_exps — 在校/校园经历（根据用户提供的校园活动关键词生成1-2条）');
      }
      lines.push(`${input.campusActivities.length > 0 ? '6' : '5'}. skills — 专业技能`);
      if (input.certificates.length > 0) {
        lines.push(`${input.campusActivities.length > 0 ? '7' : '6'}. qualifications — 资质证书`);
      }
      lines.push('注意：在校生通常无正式工作经历，不要生成experience字段，可生成intern（实习经历）如果合理。');
      break;

    case 'graduate':
      lines.push('请生成以下模块（按重要性排序）：');
      lines.push('1. base_info — 基本信息');
      lines.push('2. job_intention — 求职意向');
      lines.push('3. education — 教育经历（1条）');
      lines.push('4. self_evaluation — 自我评价');
      if (input.projects.length > 0) {
        lines.push('5. program_experience — 项目经历（根据用户提供的项目关键词生成1-2条）');
      }
      lines.push('6. intern — 实习经历（生成1条与意向岗位相关的实习经历）');
      lines.push('7. skills — 专业技能');
      if (input.certificates.length > 0) {
        lines.push('8. qualifications — 资质证书');
      }
      break;

    case 'professional': {
      const years: number = parseWorkYears(input.workYears);
      lines.push('请生成以下模块（按重要性排序）：');
      lines.push('1. base_info — 基本信息');
      lines.push('2. job_intention — 求职意向');
      lines.push('3. self_evaluation — 自我评价');
      lines.push(`4. experience — 工作经历（生成${years <= 3 ? '1-2' : '2-3'}条，最近的经历在前）`);
      if (input.projects.length > 0) {
        lines.push('5. program_experience — 项目经历（根据用户提供的项目关键词生成1-2条）');
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
  const lines: string[] = ['## 内容生成要求'];

  lines.push(`1. 所有内容必须严格围绕【${input.targetRole}】岗位生成，禁止出现无关内容`);
  lines.push('2. 内容必须专业、清晰、详细，可适当扩展以丰富简历');
  lines.push('3. 尽可能使用量化数据（百分比、数量、时间等）来体现成果');
  lines.push('4. 使用专业术语，符合简历行业规范');
  lines.push('5. HTML内容使用<ul><li>格式罗列要点，或使用<p>标签包裹段落');
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
    gender?: string;       // "男" 或 "女" 或留空
    age?: string;          // 如 "22"
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
5. 所有HTML内容字段不得留空，必须有实质性的专业内容`;
}

function parseWorkYears(workYears: string): number {
  const match: RegExpMatchArray | null = workYears.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function generateYearsGuidance(years: number): string {
  if (years < 1) return '▶ 突出学习能力/实习项目/技术热情';
  if (years < 3) return '▶ 强调技术深度/独立负责模块/快速成长';
  if (years < 5) return '▶ 展示架构能力/带人经验/核心业务负责';
  return '▶ 突出技术决策/团队管理/跨部门协作/业务影响力';
}
