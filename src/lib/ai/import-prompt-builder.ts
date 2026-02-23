/**
 * Prompt engineering for AI resume import/parsing.
 *
 * Builds structured prompts that instruct the AI to parse raw resume text
 * (plain text, Markdown, or JSON) into the ExternalResume JSON schema.
 */

/**
 * Build the system prompt for resume import parsing.
 */
export function buildImportSystemPrompt(): string {
  return `你是一位专业的简历解析专家，拥有10年人力资源和简历分析经验。
你的任务是将用户提供的简历原始文本（可能是纯文本、Markdown、或其他AI模型生成的内容）解析并结构化为标准JSON格式。

核心规则：
1. 你的输出必须是一个合法的JSON字符串，可以被JSON.parse直接解析
2. 不得包含任何多余内容（如解释、注释、markdown标记、代码块标记等）
3. 如果输入内容明显不是简历（例如：小说、新闻、代码、聊天记录等），返回以下JSON：{"error": "NOT_RESUME", "message": "输入内容不像是简历，请粘贴简历内容后重试"}
4. 尽最大努力从原始文本中提取所有有价值的信息
5. 无法归类到标准模块的重要内容，放入 custom_module_info 数组中`;
}

/**
 * Build the user prompt for resume import parsing.
 */
export function buildImportUserPrompt(rawText: string): string {
  const sections: string[] = [];

  sections.push(buildParsingInstructions());
  sections.push(buildOutputSchema());
  sections.push(buildCustomModuleInstructions());
  sections.push(buildFinalInstructions());
  sections.push(buildRawTextSection(rawText));

  return sections.join('\n\n');
}

function buildParsingInstructions(): string {
  return `## 解析要求

请从以下简历原始文本中提取信息，并按照指定JSON结构输出。

解析策略：
1. 智能识别简历中的各个模块（基本信息、教育经历、工作经历、项目经历等）
2. 即使格式混乱或使用不同的标题名称，也要尽力识别对应模块
3. HTML内容字段使用<ul><li>罗列要点，或用<p>标签包裹段落
4. 时间格式尽量统一为"YYYY.MM"，如原文为"2023年6月"则转为"2023.06"
5. 如果某个字段信息缺失，直接省略该字段，不要填充占位符
6. 保留原文中的所有实质性内容，不要丢弃任何有价值的信息`;
}

function buildOutputSchema(): string {
  return `## 输出JSON结构

请严格按照以下TypeScript接口生成JSON：

\`\`\`
interface ExternalResume {
  base_info: {
    name: string;
    gender?: string;
    age?: string;
    phone?: string;
    mail?: string;
    hide_avatar?: boolean;
  };
  job_intention?: {
    objective?: string;
    city?: string;
    salary?: string;
    type?: string;
    is_hide?: boolean;
  };
  self_evaluation?: {
    content: string;       // HTML格式
    is_hide?: boolean;
  };
  experience?: Array<{
    id: string;
    name: string;          // 公司名称
    industry?: string;
    position: string;      // 职位
    content: string;       // HTML格式，用<ul><li>罗列
    is_hide?: boolean;
    period: { start: string; end: string; };
  }>;
  intern?: Array<{
    id: string;
    name: string;
    industry?: string;
    position: string;
    content: string;
    is_hide?: boolean;
    period: { start: string; end: string; };
  }>;
  education?: Array<{
    id: string;
    name: string;          // 学校名称
    major?: string;
    degree?: string;
    course?: string;       // HTML格式
    is_hide?: boolean;
    period: { start: string; end: string; };
    content?: string;
  }>;
  program_experience?: Array<{
    id: string;
    name: string;          // 项目名称
    role?: string;
    content: string;       // HTML格式
    is_hide?: boolean;
    period: { start: string; end: string; };
  }>;
  school_exps?: Array<{
    id: string;
    name: string;
    position?: string;
    content: string;
    is_hide?: boolean;
    period: { start: string; end: string; };
  }>;
  skills?: {
    content: string;       // HTML格式
    is_hide?: boolean;
  };
  qualifications?: {
    content: string;       // HTML格式
    is_hide?: boolean;
  };
  custom_module_info?: Array<{
    name: string;          // 自定义模块标题
    content: string;       // HTML格式内容
    module_name: string;   // 同name
    is_hide?: boolean;
  }>;
}
\`\`\`

每条经历的id必须唯一，使用如 "exp-1"、"edu-1"、"proj-1"、"intern-1"、"campus-1" 的格式。`;
}

function buildCustomModuleInstructions(): string {
  return `## 自定义模块处理

以下内容如果在简历中出现但无法归入上述标准模块，请放入 custom_module_info 数组：
- 获奖经历、荣誉奖项
- 志愿者经历、社会实践
- 个人作品集、开源贡献
- 语言能力（非技能类）
- 兴趣爱好
- 发表论文、专利
- 其他任何有价值但不属于标准模块的内容

每个自定义模块的 name 和 module_name 设置为该内容的类别名称（如"获奖经历"、"志愿者经历"等）。`;
}

function buildFinalInstructions(): string {
  return `## 最终要求
1. 必须返回可直接被JSON.parse解析的合法JSON字符串
2. 不得包含JSON之外的任何文字、解释、markdown代码块标记
3. 不需要的模块直接省略，不要设置为空数组
4. 所有HTML内容字段必须有实质性内容
5. 返回前请自行检查JSON格式有效性
6. 如果输入不是简历内容，返回错误JSON：{"error": "NOT_RESUME", "message": "..."}`;
}

function buildRawTextSection(rawText: string): string {
  return `## 待解析的简历原始文本

---
${rawText}
---`;
}
