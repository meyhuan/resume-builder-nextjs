export type JdMatchRequest = {
  readonly jobDescription: string;
  readonly resumeText: string;
  readonly targetRole?: string;
  readonly evidenceItems?: readonly {
    readonly id: string;
    readonly text: string;
  }[];
};

export type JdRequirementStatus =
  | "direct"
  | "transferable"
  | "needs_confirmation"
  | "blocked";

export type JdRequirementMatch = {
  readonly id: string;
  readonly label: string;
  readonly status: JdRequirementStatus;
  readonly matchedFactIds: readonly string[];
  readonly matchedAliases: readonly string[];
  readonly reason: string;
  readonly question?: string;
};

export type JdMatchSectionSuggestion = {
  readonly section: string;
  readonly issue: string;
  readonly suggestion: string;
};

export type JdMatchResponse = {
  readonly score: number;
  readonly matchedKeywords: readonly string[];
  readonly transferableKeywords: readonly string[];
  readonly missingKeywords: readonly string[];
  readonly requirements: readonly JdRequirementMatch[];
  readonly prioritySuggestions: readonly string[];
  readonly sectionSuggestions: readonly JdMatchSectionSuggestion[];
  readonly nextActions: readonly string[];
};

export const MAX_JD_MATCH_JD_LENGTH = 5000;
export const MAX_JD_MATCH_RESUME_LENGTH = 8000;

const KEYWORD_DICTIONARY: readonly string[] = [
  "AI",
  "AIGC",
  "RAG",
  "Agent",
  "AI Agent",
  "大模型",
  "生成式人工智能",
  "Prompt",
  "Prompt Engineering",
  "提示词",
  "Embedding",
  "向量数据库",
  "模型评测",
  "知识库",
  "智能客服",
  "内容生成",
  "需求分析",
  "用户调研",
  "PRD",
  "原型设计",
  "版本规划",
  "数据分析",
  "A/B测试",
  "增长",
  "转化率",
  "留存",
  "活动运营",
  "内容运营",
  "CRM",
  "电商运营",
  "用户运营",
  "私域运营",
  "品类运营",
  "店铺运营",
  "商品运营",
  "单品运营",
  "用户分层",
  "精细化运营",
  "会员运营",
  "商城运营",
  "选品",
  "测款",
  "爆款",
  "市场分析",
  "竞品分析",
  "搜索优化",
  "付费推广",
  "流量获取",
  "销售目标",
  "全周期运营",
  "方法论",
  "知识沉淀",
  "GMV",
  "复盘",
  "天猫",
  "淘宝",
  "京东",
  "小红书",
  "抖音",
  "公众号",
  "Python",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "React",
  "Next.js",
  "后端",
  "接口",
  "自动化测试",
  "接口测试",
  "CI/CD",
  "Docker",
  "Kubernetes",
  "模型部署",
  "监控告警",
  "成本优化",
  "跨团队协作",
  "项目管理",
  "商业化",
  "客户调研",
  "SaaS",
  "B端",
];

const STOPWORDS: ReadonlySet<string> = new Set([
  "岗位职责",
  "任职要求",
  "职位描述",
  "工作内容",
  "优先",
  "负责",
  "参与",
  "相关",
  "能力",
  "经验",
  "熟悉",
  "具备",
  "良好",
  "以上",
  "以及",
  "进行",
  "完成",
  "推动",
]);

const TRANSFERABLE_EVIDENCE_ALIASES: Readonly<
  Record<string, readonly string[]>
> = {
  电商运营: [
    "商城运营",
    "活动运营",
    "大促",
    "GMV",
    "商品运营",
    "用户运营",
    "订单",
  ],
  店铺运营: ["商城运营", "活动运营", "GMV", "商品运营", "店铺活动"],
  商品运营: ["商品配置", "活动商品", "主推商品", "商城运营", "GMV"],
  单品运营: ["重点商品", "主推商品", "商品配置", "爆品", "商品运营"],
  品类运营: ["商品运营", "选品", "GMV", "活动运营", "品类分析"],
  用户运营: [
    "用户分层",
    "会员运营",
    "私域运营",
    "活动运营",
    "用户触达",
    "用户生命周期",
  ],
  数据分析: [
    "数据监控",
    "数据复盘",
    "数据驱动",
    "埋点",
    "指标分析",
    "经营分析",
  ],
  付费推广: ["广告投放", "投放", "万相台", "直通车", "千川"],
  竞品分析: ["竞品监控", "市场分析", "行业分析", "市场调研", "同类产品"],
  市场分析: ["行业分析", "市场调研", "用户调研", "竞品分析", "趋势分析"],
  选品: ["商品筛选", "商品配置", "主推商品", "活动商品", "商品策略"],
  测款: ["素材测试", "A/B测试", "小范围测试", "数据迭代", "效果测试"],
  爆款: ["爆款内容", "高播放", "素材测试", "内容测试", "数据迭代"],
  搜索优化: ["SEO", "关键词优化", "搜索排名", "标题优化", "自然流量"],
  流量获取: ["拉新", "曝光", "访问量", "自然流量", "广告投放", "内容分发"],
  销售目标: ["GMV", "销售额", "订单", "营收", "成交额", "复购"],
  全周期运营: ["全流程", "生命周期", "从0到1", "前中后", "规划执行复盘"],
  方法论: ["SOP", "标准化", "机制", "沉淀", "复用", "流程规范"],
  知识沉淀: ["SOP", "知识库", "标准化", "沉淀", "复用", "培训材料"],
  项目管理: ["排期", "需求评审", "项目推进", "跨团队协作", "交付"],
  增长: ["转化率", "留存", "复购", "GMV", "拉新"],
};

const REQUIREMENT_QUESTIONS: Readonly<Record<string, string>> = {
  付费推广:
    "你是否实际操作或协助过付费推广？请说明平台、你负责的动作，以及如何观察效果。",
  选品: "你是否参与过选品、主推商品筛选或活动商品判断？请说明你参考了哪些信息。",
  测款: "你是否做过小范围测试、素材测试或效果对比？请说明测试方式和你如何根据结果调整。",
  竞品分析:
    "你是否分析过竞品或同类商品？请说明观察维度，以及结论如何影响你的后续动作。",
  市场分析:
    "你是否做过市场、行业或用户需求分析？请说明信息来源和最终用于什么决策。",
  搜索优化:
    "你是否做过关键词、标题、搜索排名或自然流量优化？请说明平台和具体动作。",
  销售目标:
    "你是否承担或参与过销售额、GMV、订单等目标？请填写真实口径；没有准确数字可以描述趋势。",
  全周期运营:
    "你是否完整参与过一次从规划、执行到复盘的运营过程？请说明你负责的环节。",
  方法论:
    "你是否把有效做法整理成 SOP、流程、模板或可复用机制？请说明谁在什么场景使用。",
  知识沉淀:
    "你是否整理过 SOP、知识库、培训材料或复盘文档？请说明沉淀内容和使用场景。",
};

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

const IGNORED_SECTION_HEADING =
  /^(薪资福利|薪酬福利|福利待遇|职位福利|公司福利|工作时间|上班时间|作息时间|我们提供)[：:]?$/i;
const JD_SECTION_HEADING =
  /^(岗位职责|工作职责|职位职责|工作内容|任职要求|任职资格|职位要求|岗位要求|加分项|优先条件|公司介绍|发展规划|其他福利|薪资福利|薪酬福利|福利待遇|职位福利|公司福利|工作时间|上班时间|作息时间|我们提供)[：:]?$/i;

export function extractJobRequirementText(value: string): string {
  let ignored = false;
  return value
    .split(/\r?\n/)
    .flatMap((rawLine) => {
      const line = rawLine.trim();
      const heading = line.replace(/^[#*\s]+/, "").replace(/[：:]$/, "");
      if (JD_SECTION_HEADING.test(line) || JD_SECTION_HEADING.test(heading)) {
        ignored =
          IGNORED_SECTION_HEADING.test(line) ||
          IGNORED_SECTION_HEADING.test(heading) ||
          /^(公司介绍|发展规划|其他福利)$/.test(heading);
        return ignored ? [] : [line];
      }
      return ignored ? [] : [line];
    })
    .join("\n");
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

function extractDictionaryKeywords(
  text: string,
  targetRole?: string,
): string[] {
  const normalizedText = normalizeText(text);
  const targetKeywords = targetRole ? [targetRole] : [];
  return uniq(
    [...targetKeywords, ...KEYWORD_DICTIONARY].filter((keyword) =>
      normalizedText.includes(keyword.toLowerCase()),
    ),
  );
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

export function extractJdKeywords(
  jobDescription: string,
  targetRole?: string,
): string[] {
  const dictionaryKeywords = extractDictionaryKeywords(
    jobDescription,
    targetRole,
  );
  if (dictionaryKeywords.length >= 8) {
    return dictionaryKeywords.slice(0, 24);
  }
  const fallbackTerms = extractFallbackTerms(jobDescription).filter(
    (term) =>
      !dictionaryKeywords.some((keyword) =>
        term.toLowerCase().includes(keyword.toLowerCase()),
      ),
  );
  return uniq([...dictionaryKeywords, ...fallbackTerms]).slice(0, 24);
}

function includesKeyword(text: string, keyword: string): boolean {
  return normalizeText(text).includes(keyword.toLowerCase());
}

function includesTransferableEvidence(text: string, keyword: string): boolean {
  return (TRANSFERABLE_EVIDENCE_ALIASES[keyword] ?? []).some((alias) =>
    includesKeyword(text, alias),
  );
}

function createRequirementQuestion(keyword: string): string {
  return (
    REQUIREMENT_QUESTIONS[keyword] ??
    `你是否实际做过与“${keyword}”相关的工作？请说明当时的背景、你的具体动作和已经验证的结果；没有准确数字可以不填。`
  );
}

function analyzeRequirements(
  keywords: readonly string[],
  resumeText: string,
  evidenceItems: readonly { readonly id: string; readonly text: string }[],
): JdRequirementMatch[] {
  return keywords.map((keyword) => {
    const directItems = evidenceItems.filter((item) =>
      includesKeyword(item.text, keyword),
    );
    if (directItems.length > 0 || includesKeyword(resumeText, keyword)) {
      return {
        id: `requirement:${keyword}`,
        label: keyword,
        status: "direct" as const,
        matchedFactIds: directItems.map((item) => item.id),
        matchedAliases: [keyword],
        reason: `已确认经历中直接出现“${keyword}”相关证据。`,
      };
    }

    const aliases = TRANSFERABLE_EVIDENCE_ALIASES[keyword] ?? [];
    const matchedAliases = aliases.filter((alias) =>
      includesKeyword(resumeText, alias),
    );
    const transferableItems = evidenceItems.filter((item) =>
      aliases.some((alias) => includesKeyword(item.text, alias)),
    );
    if (matchedAliases.length > 0 || transferableItems.length > 0) {
      return {
        id: `requirement:${keyword}`,
        label: keyword,
        status: "transferable" as const,
        matchedFactIds: transferableItems.map((item) => item.id),
        matchedAliases,
        reason: `发现 ${matchedAliases.slice(0, 3).join("、") || "相邻能力"} 等可迁移证据，需要保留原场景并谨慎转换表达。`,
        question: createRequirementQuestion(keyword),
      };
    }

    return {
      id: `requirement:${keyword}`,
      label: keyword,
      status: "needs_confirmation" as const,
      matchedFactIds: [],
      matchedAliases: [],
      reason: "当前已确认经历中没有找到可靠证据，需要由你确认是否实际做过。",
      question: createRequirementQuestion(keyword),
    };
  });
}

function createPrioritySuggestions(
  missingKeywords: readonly string[],
  transferableKeywords: readonly string[],
  targetRole?: string,
): string[] {
  const roleLabel = targetRole?.trim() || "目标岗位";
  if (missingKeywords.length === 0) {
    return [
      transferableKeywords.length > 0
        ? `当前已确认事实对 ${roleLabel} JD 已有直接或可迁移证据；其中 ${transferableKeywords.slice(0, 4).join("、")} 仍需用户确认具体对应关系。`
        : `当前已确认事实覆盖了 ${roleLabel} JD 中的大部分核心关键词，下一步检查最相关经历是否足够具体。`,
      "把最匹配的项目经历放到简历前半部分，减少招聘方寻找信息的成本。",
      "如果你确实有尚未写入的范围、周期或结果记录，可以补充；没有数据时不要为了量化而编造。",
    ];
  }
  const topMissing = missingKeywords.slice(0, 5).join("、");
  return [
    `优先核实这些要求是否有真实证据：${topMissing}。`,
    transferableKeywords.length > 0
      ? `可进一步确认这些相邻能力是否能形成证据：${transferableKeywords.slice(0, 4).join("、")}。`
      : "先区分“直接做过、可迁移经历、暂时没有证据”，不要把 JD 关键词直接塞进简历。",
    `对有证据的内容，围绕 ${roleLabel} 补全“背景、你的动作、使用方法/工具、已验证结果”；没有证据的内容保留为面试准备项。`,
  ];
}

function createSectionSuggestions(
  matchedKeywords: readonly string[],
  missingKeywords: readonly string[],
  targetRole?: string,
): JdMatchSectionSuggestion[] {
  const roleLabel = targetRole?.trim() || "目标岗位";
  const missingPreview = missingKeywords.slice(0, 4).join("、") || "岗位关键词";
  const matchedPreview = matchedKeywords.slice(0, 4).join("、") || roleLabel;
  return [
    {
      section: "个人优势",
      issue: `需要在开头更快说明你和 ${roleLabel} 的匹配度。`,
      suggestion: `用 2-3 句话概括你的岗位方向、核心能力和代表性结果，并自然包含 ${matchedPreview}。`,
    },
    {
      section: "项目经历",
      issue:
        missingKeywords.length > 0
          ? `已确认内容中暂未发现 ${missingPreview} 等要求的直接证据。`
          : "项目经历已有关键词基础，但结果表达还可以更具体。",
      suggestion:
        "先核实是否有对应经历；有证据再按“业务背景 + 个人动作 + 工具/方法 + 已验证结果”整理，没有数据时使用定性结果。",
    },
    {
      section: "技能关键词",
      issue: "技能栏应服务岗位初筛，而不是罗列所有工具。",
      suggestion:
        missingKeywords.length > 0
          ? `只有确认自己实际使用或实践过 ${missingPreview} 后，才写入技能栏或经历。`
          : "保留与 JD 高相关的技能，把低相关工具后移或删除。",
    },
  ];
}

export function analyzeJdMatch(input: JdMatchRequest): JdMatchResponse {
  const jobDescription = extractJobRequirementText(
    input.jobDescription.slice(0, MAX_JD_MATCH_JD_LENGTH),
  );
  const resumeText = input.resumeText.slice(0, MAX_JD_MATCH_RESUME_LENGTH);
  const jdKeywords = extractJdKeywords(jobDescription, input.targetRole);
  const matchedKeywords = jdKeywords.filter((keyword) =>
    includesKeyword(resumeText, keyword),
  );
  const transferableKeywords = jdKeywords.filter(
    (keyword) =>
      !includesKeyword(resumeText, keyword) &&
      includesTransferableEvidence(resumeText, keyword),
  );
  const missingKeywords = jdKeywords.filter(
    (keyword) =>
      !includesKeyword(resumeText, keyword) &&
      !includesTransferableEvidence(resumeText, keyword),
  );
  const rawScore =
    jdKeywords.length === 0
      ? 0
      : Math.round(
          ((matchedKeywords.length + transferableKeywords.length * 0.5) /
            jdKeywords.length) *
            100,
        );
  const score = Math.min(100, Math.max(0, rawScore));
  const requirements = analyzeRequirements(
    jdKeywords,
    resumeText,
    input.evidenceItems ?? [],
  );

  return {
    score,
    matchedKeywords,
    transferableKeywords,
    missingKeywords,
    requirements,
    prioritySuggestions: createPrioritySuggestions(
      missingKeywords,
      transferableKeywords,
      input.targetRole,
    ),
    sectionSuggestions: createSectionSuggestions(
      matchedKeywords,
      missingKeywords,
      input.targetRole,
    ),
    nextActions: [
      "先把未覆盖要求分成“可迁移经历、需要确认、确实缺失”，避免虚构项目。",
      "把最匹配的项目放到简历前半部分，并量化结果。",
      "完成修改后再用 AI 一键优化或选择岗位模板生成投递版本。",
    ],
  };
}
