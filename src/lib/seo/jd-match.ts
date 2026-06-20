export type JdMatchRequest = {
  readonly jobDescription: string;
  readonly resumeText: string;
  readonly targetRole?: string;
};

export type JdMatchSectionSuggestion = {
  readonly section: string;
  readonly issue: string;
  readonly suggestion: string;
};

export type JdMatchResponse = {
  readonly score: number;
  readonly matchedKeywords: readonly string[];
  readonly missingKeywords: readonly string[];
  readonly prioritySuggestions: readonly string[];
  readonly sectionSuggestions: readonly JdMatchSectionSuggestion[];
  readonly nextActions: readonly string[];
};

export const MAX_JD_MATCH_JD_LENGTH = 5000;
export const MAX_JD_MATCH_RESUME_LENGTH = 8000;

const KEYWORD_DICTIONARY: readonly string[] = [
  'AI',
  'AIGC',
  'RAG',
  'Agent',
  'AI Agent',
  '大模型',
  '生成式人工智能',
  'Prompt',
  'Prompt Engineering',
  '提示词',
  'Embedding',
  '向量数据库',
  '模型评测',
  '知识库',
  '智能客服',
  '内容生成',
  '需求分析',
  '用户调研',
  'PRD',
  '原型设计',
  '版本规划',
  '数据分析',
  'A/B测试',
  '增长',
  '转化率',
  '留存',
  '活动运营',
  '内容运营',
  '小红书',
  '抖音',
  '公众号',
  'Python',
  'TypeScript',
  'JavaScript',
  'Node.js',
  'React',
  'Next.js',
  '后端',
  '接口',
  '自动化测试',
  '接口测试',
  'CI/CD',
  'Docker',
  'Kubernetes',
  '模型部署',
  '监控告警',
  '成本优化',
  '跨团队协作',
  '项目管理',
  '商业化',
  '客户调研',
  'SaaS',
  'B端',
];

const STOPWORDS: ReadonlySet<string> = new Set([
  '岗位职责',
  '任职要求',
  '职位描述',
  '工作内容',
  '优先',
  '负责',
  '参与',
  '相关',
  '能力',
  '经验',
  '熟悉',
  '具备',
  '良好',
  '以上',
  '以及',
  '进行',
  '完成',
  '推动',
]);

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function uniq(values: readonly string[]): string[] {
  const seen: Set<string> = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

function extractDictionaryKeywords(text: string, targetRole?: string): string[] {
  const normalizedText = normalizeText(text);
  const targetKeywords = targetRole ? [targetRole] : [];
  return uniq([...targetKeywords, ...KEYWORD_DICTIONARY].filter((keyword) => normalizedText.includes(keyword.toLowerCase())));
}

function extractFallbackTerms(text: string): string[] {
  const terms = text
    .split(/[，。；、：:\s\n\r\t,.;!?()[\]（）【】]+/)
    .map((term) => cleanFallbackTerm(term))
    .filter((term) => term.length >= 2 && term.length <= 18)
    .filter((term) => !STOPWORDS.has(term))
    .filter((term) => !/^\d+$/.test(term));
  return uniq(terms).slice(0, 16);
}

function cleanFallbackTerm(value: string): string {
  let term = value.trim();
  for (const stopword of STOPWORDS) {
    if (term.startsWith(stopword) && term.length > stopword.length + 1) {
      term = term.slice(stopword.length).trim();
    }
  }
  return term;
}

function extractJdKeywords(jobDescription: string, targetRole?: string): string[] {
  const dictionaryKeywords = extractDictionaryKeywords(jobDescription, targetRole);
  if (dictionaryKeywords.length >= 8) {
    return dictionaryKeywords.slice(0, 24);
  }
  return uniq([...dictionaryKeywords, ...extractFallbackTerms(jobDescription)]).slice(0, 24);
}

function includesKeyword(text: string, keyword: string): boolean {
  return normalizeText(text).includes(keyword.toLowerCase());
}

function createPrioritySuggestions(missingKeywords: readonly string[], targetRole?: string): string[] {
  const roleLabel = targetRole?.trim() || '目标岗位';
  if (missingKeywords.length === 0) {
    return [
      `当前简历已覆盖 ${roleLabel} JD 中的大部分核心关键词，下一步重点检查项目结果是否量化。`,
      '把最匹配的项目经历放到简历前半部分，减少招聘方寻找信息的成本。',
      '补充 1-2 个可验证指标，例如效率提升、命中率、转化率、成本变化或交付周期。',
    ];
  }
  const topMissing = missingKeywords.slice(0, 5).join('、');
  return [
    `优先补齐 JD 高频但简历缺失的关键词：${topMissing}。`,
    `在项目经历中自然写入这些关键词，不要只堆在技能栏。`,
    `围绕 ${roleLabel} 增加“业务问题、你的动作、使用方法/工具、最终结果”的表达。`,
  ];
}

function createSectionSuggestions(
  matchedKeywords: readonly string[],
  missingKeywords: readonly string[],
  targetRole?: string,
): JdMatchSectionSuggestion[] {
  const roleLabel = targetRole?.trim() || '目标岗位';
  const missingPreview = missingKeywords.slice(0, 4).join('、') || '岗位关键词';
  const matchedPreview = matchedKeywords.slice(0, 4).join('、') || roleLabel;
  return [
    {
      section: '个人优势',
      issue: `需要在开头更快说明你和 ${roleLabel} 的匹配度。`,
      suggestion: `用 2-3 句话概括你的岗位方向、核心能力和代表性结果，并自然包含 ${matchedPreview}。`,
    },
    {
      section: '项目经历',
      issue: missingKeywords.length > 0 ? `项目描述中缺少 ${missingPreview} 等 JD 关键词。` : '项目经历已有关键词基础，但结果表达还可以更具体。',
      suggestion: '按“业务背景 + 个人动作 + 工具/方法 + 指标结果”重写项目 bullet，避免只描述职责。',
    },
    {
      section: '技能关键词',
      issue: '技能栏应服务岗位初筛，而不是罗列所有工具。',
      suggestion: missingKeywords.length > 0 ? `把 ${missingPreview} 拆到技能栏或项目标签中，但必须与真实经历对应。` : '保留与 JD 高相关的技能，把低相关工具后移或删除。',
    },
  ];
}

export function analyzeJdMatch(input: JdMatchRequest): JdMatchResponse {
  const jobDescription = input.jobDescription.slice(0, MAX_JD_MATCH_JD_LENGTH);
  const resumeText = input.resumeText.slice(0, MAX_JD_MATCH_RESUME_LENGTH);
  const jdKeywords = extractJdKeywords(jobDescription, input.targetRole);
  const matchedKeywords = jdKeywords.filter((keyword) => includesKeyword(resumeText, keyword));
  const missingKeywords = jdKeywords.filter((keyword) => !includesKeyword(resumeText, keyword));
  const rawScore = jdKeywords.length === 0 ? 0 : Math.round((matchedKeywords.length / jdKeywords.length) * 100);
  const score = Math.min(100, Math.max(0, rawScore));

  return {
    score,
    matchedKeywords,
    missingKeywords,
    prioritySuggestions: createPrioritySuggestions(missingKeywords, input.targetRole),
    sectionSuggestions: createSectionSuggestions(matchedKeywords, missingKeywords, input.targetRole),
    nextActions: [
      '先补缺失关键词对应的真实经历，避免虚构项目。',
      '把最匹配的项目放到简历前半部分，并量化结果。',
      '完成修改后再用 AI 一键优化或选择岗位模板生成投递版本。',
    ],
  };
}
