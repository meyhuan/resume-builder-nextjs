import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BookOpen, BriefcaseBusiness, ChevronRight, CircleCheckBig, ClipboardList, Layers3, Tags, Target, TriangleAlert, Users } from 'lucide-react';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { getAllArticles } from '@/lib/articles/article-data';
import type { Article } from '@/lib/articles/article-types';
import { templateCatalog } from '@/lib/templates/template-catalog';
import { templateRoleData } from '@/lib/templates/template-role-data';

const SITE_URL: string = 'https://aijianli.cn';

type JsonLdPrimitive = string | number | boolean;

type JsonLdNode = {
  [key: string]: JsonLdPrimitive | JsonLdNode | JsonLdNode[] | JsonLdPrimitive[] | undefined;
};

type RolePageParams = {
  params: Promise<{
    role: string;
  }>;
};

type WritingPoint = {
  title: string;
  description: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

type AudienceProfile = {
  title: string;
  description: string;
};

type ResumeSectionSuggestion = {
  title: string;
  description: string;
};

type HiringFocusItem = {
  title: string;
  description: string;
};

type DeliverySuggestion = {
  title: string;
  description: string;
};

type RoleSpecialtyBlock = {
  title: string;
  description: string;
  bullets: readonly string[];
};

function createPageTitle(roleName: string): string {
  return `${roleName}简历模板 - ${roleName}简历怎么写`;
}

function createPageDescription(roleName: string, industry: string): string {
  return `查看适合${roleName}岗位的简历模板、写作重点、常见错误和 AI 简历生成建议，适用于${industry}求职场景，帮助你更快完成可投递简历。`;
}

function createRoleSummary(roleName: string, industry: string, category: string): string {
  if (category === '技术') {
    return `${roleName}岗位通常会重点看技术栈匹配度、项目复杂度、问题解决能力，以及你是否能在${industry}场景下稳定完成交付。`;
  }
  if (category === '产品') {
    return `${roleName}岗位更关注需求分析、方案拆解、跨团队协作与版本推进能力，招聘方会在意你是否真正推动过业务结果。`;
  }
  if (category === '运营' || category === '市场') {
    return `${roleName}岗位会更重视增长思路、执行拆解、数据复盘和结果指标，你的经历需要体现业务目标与实际产出。`;
  }
  if (category === '设计') {
    return `${roleName}岗位通常关注作品质量、设计逻辑、用户体验理解和跨部门协作能力，你的简历需要清楚传达方案价值。`;
  }
  return `${roleName}岗位招聘时通常会综合看岗位匹配度、专业能力、过往成果和稳定执行能力，你的简历要优先突出最相关的经历。`;
}

function createWritingPoints(roleName: string, category: string): readonly WritingPoint[] {
  return [
    {
      title: '先写岗位匹配度',
      description: `${roleName}简历开头要先让招聘方看到你的岗位匹配度，优先突出与${category}相关的项目、成果和职责。`,
    },
    {
      title: '经历写结果，不只写职责',
      description: `不要只写“负责什么”，要写清楚你在${roleName}相关经历中做了什么、解决了什么问题、最终产出了什么结果。`,
    },
    {
      title: '关键词贴近 JD',
      description: `把招聘 JD 里的核心关键词自然写进简历，例如工具栈、方法论、业务场景和成果指标，让${roleName}岗位更容易通过初筛。`,
    },
  ];
}

function countKeywordMatches(content: string, keywords: readonly string[]): number {
  return keywords.reduce((score: number, keyword: string) => {
    if (!keyword) {
      return score;
    }
    return content.includes(keyword.toLowerCase()) ? score + 1 : score;
  }, 0);
}

function getRecommendedArticlesForRole(
  roleName: string,
  industry: string,
  category: string,
  searchKeywords: readonly string[],
): Article[] {
  const allArticles: Article[] = getAllArticles();
  const relevanceKeywords: string[] = [roleName, industry, category, ...searchKeywords];
  return allArticles
    .map((article: Article) => {
      const normalizedContent: string = `${article.title} ${article.abstract} ${article.tags.join(' ')} ${article.textContent}`.toLowerCase();
      let relevanceScore: number = countKeywordMatches(normalizedContent, relevanceKeywords.map((keyword: string) => keyword.toLowerCase()));
      if (article.title.includes(roleName)) {
        relevanceScore += 4;
      }
      if (article.abstract.includes(roleName)) {
        relevanceScore += 2;
      }
      if (article.tags.some((tag: string) => roleName.includes(tag) || tag.includes(roleName) || searchKeywords.includes(tag))) {
        relevanceScore += 2;
      }
      return {
        article,
        relevanceScore,
      };
    })
    .filter((entry: { article: Article; relevanceScore: number }) => entry.relevanceScore > 0)
    .sort((left: { article: Article; relevanceScore: number }, right: { article: Article; relevanceScore: number }) => right.relevanceScore - left.relevanceScore)
    .slice(0, 4)
    .map((entry: { article: Article; relevanceScore: number }) => entry.article);
}

function createAudienceProfiles(roleName: string, industry: string, category: string): readonly AudienceProfile[] {
  return [
    {
      title: `有 ${category} 相关经历的人`,
      description: `如果你做过与${category}相关的项目、实习或正式工作，这个${roleName}页面更适合你直接提炼岗位匹配度和成果表达。`,
    },
    {
      title: '准备转向更明确岗位方向的人',
      description: `如果你正在从相近职能转向${roleName}，可以借这个页面梳理与${industry}场景更相关的经历、关键词和投递表达方式。`,
    },
    {
      title: '想快速产出可投递简历的人',
      description: `如果你希望先得到一份结构清晰的简历初稿，再针对 JD 做优化，这个${roleName}模板页会更适合作为起点。`,
    },
  ];
}

function createResumeSectionSuggestions(roleName: string, category: string): readonly ResumeSectionSuggestion[] {
  if (category === '技术') {
    return [
      {
        title: '项目经历',
        description: `优先写与你应聘${roleName}最接近的项目，明确技术栈、业务场景、个人职责和结果。`,
      },
      {
        title: '技术栈与工具',
        description: `把核心框架、语言、工程工具和协作方式单独列出，方便招聘方快速判断你是否匹配${roleName}岗位。`,
      },
      {
        title: '性能或效率优化成果',
        description: '如果有稳定性、性能、上线效率或故障处理成果，建议量化写出，增强说服力。',
      },
    ];
  }
  if (category === '设计') {
    return [
      {
        title: '作品或项目案例',
        description: `围绕${roleName}常见场景挑选最能代表能力的案例，突出问题、方案和最终呈现效果。`,
      },
      {
        title: '设计方法与协作流程',
        description: '说明你如何做调研、输出方案、与产品研发协作，以及如何推进方案落地。',
      },
      {
        title: '业务结果或体验改进',
        description: '如果设计方案带来了转化、留存、满意度或效率提升，建议直接写进简历。',
      },
    ];
  }
  if (category === '运营' || category === '市场') {
    return [
      {
        title: '业务目标与指标结果',
        description: `应聘${roleName}时，最重要的是把增长、转化、留存、拉新或活动效果写清楚。`,
      },
      {
        title: '渠道与策略拆解',
        description: '说明你负责过哪些渠道、做了哪些动作，以及为什么这样做。',
      },
      {
        title: '复盘与优化能力',
        description: '写出你如何根据数据反馈调整策略，这比单纯描述执行过程更有价值。',
      },
    ];
  }
  return [
    {
      title: '核心工作经历',
      description: `把最能证明你胜任${roleName}的经历放在前面，突出职责范围、处理问题和最终结果。`,
    },
    {
      title: '专业能力与工具',
      description: `列出与${roleName}直接相关的方法、工具、系统或流程经验，帮助招聘方快速建立判断。`,
    },
    {
      title: '可量化成果',
      description: '尽量用数字呈现效率、准确率、交付质量、成本优化或团队协作结果。',
    },
  ];
}

function createKeywordSuggestions(roleName: string, category: string, searchKeywords: readonly string[]): readonly string[] {
  if (roleName === 'AI产品经理') {
    return [
      'AI产品经理',
      '大语言模型',
      'Prompt Engineering',
      'RAG',
      'AI Agent',
      '模型评测',
      '用户反馈闭环',
      'Token成本',
    ];
  }
  const categoryKeywords: Record<string, readonly string[]> = {
    技术: ['技术栈', '系统设计', '性能优化', '稳定性', '项目交付'],
    产品: ['需求分析', '产品规划', '用户调研', '跨团队协作', '版本迭代'],
    运营: ['增长', '转化率', '留存', '活动复盘', '渠道运营'],
    设计: ['设计系统', '交互流程', '视觉规范', '用户体验', '方案落地'],
    市场: ['品牌传播', '投放优化', '内容策划', '线索转化', '市场活动'],
  };
  const mergedKeywords: string[] = [...(categoryKeywords[category] ?? []), ...searchKeywords, roleName];
  return Array.from(new Set<string>(mergedKeywords)).slice(0, 8);
}

function createRoleSpecialtyBlocks(roleName: string): readonly RoleSpecialtyBlock[] {
  if (roleName !== 'AI产品经理') {
    return [];
  }
  return [
    {
      title: '产品能力要贴近 AI 场景',
      description: 'AI产品经理简历要证明你不只是会写 PRD，而是能把真实业务问题拆成可验证的 AI 产品方案。',
      bullets: [
        '写清楚场景：智能客服、企业知识库、内容生成、销售助手、办公自动化等。',
        '写清楚用户问题：检索效率低、重复咨询多、内容生产慢、人工跟进成本高。',
        '写清楚产品闭环：需求拆解、原型设计、灰度上线、反馈采集和版本迭代。',
      ],
    },
    {
      title: 'AI 技术理解要服务业务结果',
      description: '不要把大模型关键词堆成技术清单，要说明这些技术如何支撑产品方案落地。',
      bullets: [
        'RAG 项目重点写文档解析、切片、向量检索、答案引用和纠错反馈。',
        'AI Agent 项目重点写任务拆解、工具调用、流程编排和异常兜底。',
        'AIGC 项目重点写 Prompt 模板、内容审核、品牌语气和采纳率提升。',
      ],
    },
    {
      title: '评测指标要比普通产品更明确',
      description: 'AI 产品是否可靠，不能只靠上线描述，要用质量、效率和成本指标建立可信度。',
      bullets: [
        '质量指标：命中率、采纳率、人工接管率、生成质量评分、用户满意度。',
        '效率指标：响应时延、任务完成时间、内容生产效率、客服处理时长。',
        '成本指标：Token 成本、人工审核成本、重复咨询下降、错误召回减少。',
      ],
    },
  ];
}

function createHiringFocusItems(roleName: string, industry: string, category: string): readonly HiringFocusItem[] {
  if (category === '技术') {
    return [
      {
        title: '技术栈是否贴近岗位需求',
        description: `招聘方会先看你掌握的语言、框架、工程化工具是否与${roleName}岗位要求接近。`,
      },
      {
        title: '项目是否真实且有复杂度',
        description: '相比泛泛而谈的职责描述，更重要的是你解决过什么问题、承担了哪一部分核心工作。',
      },
      {
        title: '交付结果与稳定性意识',
        description: `如果你能说明在${industry}场景下如何做性能优化、问题排查或上线保障，会更有说服力。`,
      },
    ];
  }
  if (category === '产品') {
    return [
      {
        title: '需求判断与问题定义能力',
        description: `招聘方会关注你是否真正理解过用户问题，并把它转化成${roleName}需要推进的方案。`,
      },
      {
        title: '跨团队推动能力',
        description: '只会写 PRD 不够，还要体现你如何和设计、研发、运营协作并推进落地。',
      },
      {
        title: '业务结果是否明确',
        description: '如果能写出版本上线后的转化、留存、效率或满意度变化，含金量会高很多。',
      },
    ];
  }
  if (category === '运营' || category === '市场') {
    return [
      {
        title: '指标意识是否足够强',
        description: `应聘${roleName}时，招聘方通常会优先看增长、转化、线索、曝光或留存等结果指标。`,
      },
      {
        title: '策略与执行是否成体系',
        description: '不仅要写做了什么，还要写为什么这样做，以及你如何拆解目标和复盘效果。',
      },
      {
        title: '资源协调与落地效率',
        description: `如果你的经历能体现跨团队协作、资源整合和节奏推进，会更符合${industry}岗位预期。`,
      },
    ];
  }
  if (category === '设计') {
    return [
      {
        title: '作品是否体现设计思考',
        description: `招聘方会关注你的作品不是“好不好看”而已，而是是否真的解决了${roleName}场景中的问题。`,
      },
      {
        title: '方案落地与协作能力',
        description: '仅有视觉稿往往不够，能说明你如何推动方案上线，会更容易建立信任。',
      },
      {
        title: '体验改进是否可被验证',
        description: '如果能量化展示转化、满意度、任务完成率或效率提升，简历会明显更强。',
      },
    ];
  }
  return [
    {
      title: '岗位匹配度是否清晰',
      description: `招聘方首先会判断你过去的经历是否足以支撑${roleName}岗位要求。`,
    },
    {
      title: '专业能力是否足够直接',
      description: '你的简历需要尽量减少空泛描述，让人快速看到可迁移或可验证的能力。',
    },
    {
      title: '结果与稳定性是否可信',
      description: `如果能用结果、流程和场景证明自己，更容易获得${industry}相关岗位面试机会。`,
    },
  ];
}

function createDeliverySuggestions(roleName: string, category: string): readonly DeliverySuggestion[] {
  if (category === '技术') {
    return [
      {
        title: '把最强项目提前',
        description: `将与你目标${roleName}最贴近的项目放在前两段经历里，先建立技术匹配感。`,
      },
      {
        title: '把职责改写成问题与结果',
        description: '不要只写开发了什么，要写清楚解决了什么问题、如何实现、带来了什么结果。',
      },
      {
        title: '针对 JD 替换关键词',
        description: '投递前根据 JD 调整技术栈、业务词和工程关键词的出现顺序。',
      },
    ];
  }
  if (category === '产品') {
    return [
      {
        title: '突出最懂业务的一段经历',
        description: `优先把最能体现你定义问题、拆解需求和推进方案的经历放在前面。`,
      },
      {
        title: '让版本推进过程更完整',
        description: '从需求来源、方案判断、协作对象到上线结果，尽量形成闭环表达。',
      },
      {
        title: '少写流程名词，多写判断依据',
        description: `相比“负责需求管理”，招聘方更想看到你为什么这么做，以及结果如何。`,
      },
    ];
  }
  if (category === '运营' || category === '市场') {
    return [
      {
        title: '先摆结果，再写动作',
        description: `先用一句话概括曝光、转化、增长或留存结果，再补充你采取的动作。`,
      },
      {
        title: '把渠道和策略分开写',
        description: '这样更容易体现你既能执行，也能做策略判断和复盘。',
      },
      {
        title: '补上复盘与优化动作',
        description: '如果只写执行没有优化，会显得经历深度不够。',
      },
    ];
  }
  if (category === '设计') {
    return [
      {
        title: '用案例而不是任务清单表达',
        description: `应聘${roleName}时，尽量围绕一个完整案例写问题、过程、方案和结果。`,
      },
      {
        title: '让作品集与简历互相验证',
        description: '简历里提到的重点项目，最好能在作品集中找到对应案例。',
      },
      {
        title: '把设计价值说清楚',
        description: '不要停留在视觉层面，尽量强调体验改善、业务影响和落地协同。',
      },
    ];
  }
  return [
    {
      title: '把目标岗位写得更明确',
      description: `标题、简介和核心经历都要围绕${roleName}展开，避免投递方向发散。`,
    },
    {
      title: '把最相关经历前置',
      description: '招聘方通常只会快速浏览前半页内容，所以最关键的信息一定要先出现。',
    },
    {
      title: '把成果写成可验证表达',
      description: '尽量用数字、场景和结果支撑你的能力，而不是只写抽象评价。',
    },
  ];
}

function createTemplateReason(templateId: string, category: string): string {
  const templateReasonMap: Record<string, Record<string, string>> = {
    技术: {
      simple: '信息层级清楚，适合优先展示技术栈、项目经历和工程成果。',
      timeline: '时间线表达更直观，适合展示连续项目与成长轨迹。',
      warm: '在保持清晰结构的同时更有视觉识别度，适合强调综合表达。',
      elegant: '适合需要兼顾专业感与精致感的技术管理或跨职能岗位。',
    },
    产品: {
      warm: '版面更利于展示项目背景、需求拆解和业务成果。',
      simple: '结构简洁，适合强调逻辑和跨团队协作经历。',
      elegant: '适合需要更成熟职业感的产品方向岗位。',
      timeline: '适合强调版本推进与岗位成长脉络。',
    },
    运营: {
      warm: '更适合承载活动、增长、内容与数据结果等多维经历。',
      simple: '适合突出指标结果，减少视觉干扰。',
      elegant: '适合偏品牌、商务或对外表达要求更高的岗位。',
      timeline: '适合展示运营策略和阶段性成果变化。',
    },
    设计: {
      warm: '兼顾视觉表现和阅读效率，适合设计岗位展示个人风格。',
      elegant: '整体更有质感，适合强调审美和成熟表达。',
      simple: '适合作品集之外的清晰补充页，突出项目与能力本身。',
      timeline: '适合展示不同阶段项目案例与成长轨迹。',
    },
  };
  return templateReasonMap[category]?.[templateId] ?? '结构稳定、阅读负担低，适合快速生成并继续按目标岗位微调。';
}

function createBreadcrumbSchema(roleName: string, roleSlug: string): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: '首页',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: '简历模板中心',
        item: `${SITE_URL}/templates`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${roleName}简历模板`,
        item: `${SITE_URL}/templates/${roleSlug}`,
      },
    ],
  };
}

function createFaqSchema(faqItems: readonly FaqItem[]): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item: FaqItem) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

function createMistakes(roleName: string): readonly string[] {
  return [
    `${roleName}简历标题和求职方向不明确，招聘方看完第一页仍不知道你要投什么岗位。`,
    `项目经历只有过程描述，没有量化结果，无法体现你胜任${roleName}岗位的价值。`,
    '整份简历关键词太泛，没有针对目标 JD 做针对性优化。',
  ];
}

function createFaqItems(roleName: string): readonly FaqItem[] {
  if (roleName === 'AI产品经理') {
    return [
      {
        question: 'AI产品经理简历最应该突出什么？',
        answer: '优先突出 AI 产品场景、业务问题、方案拆解和评测结果，让招聘方看到你能把模型能力转化为可落地的产品价值。',
      },
      {
        question: '没有算法背景可以投 AI产品经理吗？',
        answer: '可以，但简历里要体现你理解大模型、RAG、Prompt、Agent 等基础概念，并能与算法、研发协作完成产品落地。',
      },
      {
        question: 'AI产品经理项目经历怎么写更有说服力？',
        answer: '建议按业务问题、AI 方案、评测指标、上线结果四段写，避免只写“负责 AI 产品设计”这类空泛描述。',
      },
    ];
  }
  return [
    {
      question: `${roleName}简历模板应该优先选哪种风格？`,
      answer: `建议优先选择结构清晰、信息密度适中的模板，让招聘方能快速定位你的核心经历和优势。`,
    },
    {
      question: `${roleName}简历可以直接用 AI 生成吗？`,
      answer: `可以先用 AI 生成初稿，再结合目标 JD 手动调整关键词、经历顺序和成果表达，效果会更好。`,
    },
    {
      question: `${roleName}简历最容易被忽略的细节是什么？`,
      answer: `最容易被忽略的是成果表达和岗位关键词匹配度，这两项往往直接影响简历初筛通过率。`,
    },
  ];
}

export async function generateStaticParams(): Promise<{ role: string }[]> {
  return templateRoleData.getAllTemplateRoles().map((role) => ({ role: role.slug }));
}

export async function generateMetadata({ params }: RolePageParams): Promise<Metadata> {
  const resolvedParams = await params;
  const roleRecord = templateRoleData.getTemplateRoleBySlug(resolvedParams.role);
  if (!roleRecord) {
    return {
      title: '岗位模板未找到',
    };
  }
  const title: string = createPageTitle(roleRecord.role);
  const description: string = createPageDescription(roleRecord.role, roleRecord.industry);
  return {
    title,
    description,
    keywords: [
      `${roleRecord.role}简历模板`,
      `${roleRecord.role}简历怎么写`,
      `${roleRecord.role}AI简历`,
      `${roleRecord.role}求职简历`,
      ...roleRecord.searchKeywords,
    ],
    alternates: {
      canonical: `${SITE_URL}/templates/${roleRecord.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/templates/${roleRecord.slug}`,
      type: 'article',
    },
  };
}

export default async function TemplateRolePage({ params }: RolePageParams): Promise<ReactElement> {
  const resolvedParams = await params;
  const roleRecord = templateRoleData.getTemplateRoleBySlug(resolvedParams.role);
  if (!roleRecord) {
    notFound();
  }
  const recommendedTemplates = templateCatalog
    .filter((template) => roleRecord.recommendedTemplateIds.includes(template.id))
    .map((template) => ({
      ...template,
      fitReason: createTemplateReason(template.id, roleRecord.category),
    }));
  const recommendedArticles: Article[] = getRecommendedArticlesForRole(
    roleRecord.role,
    roleRecord.industry,
    roleRecord.category,
    roleRecord.searchKeywords,
  );
  const relatedRoles = templateRoleData.getRelatedTemplateRoles(roleRecord.slug, 8);
  const writingPoints = createWritingPoints(roleRecord.role, roleRecord.category);
  const roleSummary = createRoleSummary(roleRecord.role, roleRecord.industry, roleRecord.category);
  const audienceProfiles = createAudienceProfiles(roleRecord.role, roleRecord.industry, roleRecord.category);
  const resumeSectionSuggestions = createResumeSectionSuggestions(roleRecord.role, roleRecord.category);
  const keywordSuggestions = createKeywordSuggestions(roleRecord.role, roleRecord.category, roleRecord.searchKeywords);
  const roleSpecialtyBlocks = createRoleSpecialtyBlocks(roleRecord.role);
  const hiringFocusItems = createHiringFocusItems(roleRecord.role, roleRecord.industry, roleRecord.category);
  const deliverySuggestions = createDeliverySuggestions(roleRecord.role, roleRecord.category);
  const commonMistakes = createMistakes(roleRecord.role);
  const faqItems = createFaqItems(roleRecord.role);
  const breadcrumbSchema: JsonLdNode = createBreadcrumbSchema(roleRecord.role, roleRecord.slug);
  const faqSchema: JsonLdNode = createFaqSchema(faqItems);
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] selection:bg-fuchsia-200">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <LandingHeader forceSolid />
      <main className="flex-grow pt-36 pb-20 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-8%] right-[-5%] w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-8%] left-[-5%] w-[400px] h-[400px] bg-fuchsia-500/8 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 flex-wrap">
            <Link href="/" className="hover:text-violet-600 transition-colors">首页</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/templates" className="hover:text-violet-600 transition-colors">简历模板中心</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600 font-medium">{roleRecord.role}简历模板</span>
          </nav>
          <section className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8 lg:p-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-50 text-violet-600 rounded-full text-sm font-semibold">
              <BriefcaseBusiness className="w-4 h-4" />
              {roleRecord.industry} / {roleRecord.category}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mt-5">
              {roleRecord.role}简历模板与写作建议
            </h1>
            <p className="text-base md:text-lg text-slate-500 mt-4 max-w-3xl leading-relaxed">
              {createPageDescription(roleRecord.role, roleRecord.industry)}
            </p>
            <p className="text-sm md:text-base text-slate-600 mt-4 max-w-3xl leading-relaxed">
              {roleSummary}
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link href="/ai" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-violet-600 text-white font-semibold shadow-lg shadow-violet-500/20 hover:bg-violet-700 transition-colors">
                去 AI 生成 {roleRecord.role} 简历
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/editor" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-slate-700 font-semibold border border-slate-200 hover:border-violet-200 hover:text-violet-600 transition-colors">
                直接开始编辑
              </Link>
            </div>
          </section>
          <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
              <h2 className="text-2xl font-extrabold text-slate-900">{roleRecord.role}简历怎么写</h2>
              <div className="space-y-4 mt-6">
                {writingPoints.map((point) => (
                  <div key={point.title} className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <CircleCheckBig className="w-4 h-4 text-violet-500" />
                      {point.title}
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed mt-2">{point.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
              <h2 className="text-2xl font-extrabold text-slate-900">常见错误</h2>
              <div className="space-y-4 mt-6">
                {commonMistakes.map((mistake) => (
                  <div key={mistake} className="rounded-2xl bg-rose-50 p-5 border border-rose-100">
                    <div className="flex items-start gap-3">
                      <TriangleAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-600 leading-relaxed">{mistake}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
          {roleSpecialtyBlocks.length > 0 ? (
            <section className="rounded-3xl bg-white/80 backdrop-blur-sm border border-violet-100 shadow-sm p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">AI产品经理专项优化</h2>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    围绕大模型产品落地、RAG、AI Agent、评测指标和业务结果，把经历写得更像目标岗位，而不是泛泛的产品经理简历。
                  </p>
                </div>
                <Link href="/articles/ai-product-manager-resume-guide" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors">
                  查看完整写作攻略
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
                {roleSpecialtyBlocks.map((block: RoleSpecialtyBlock) => (
                  <div key={block.title} className="rounded-2xl bg-violet-50/60 border border-violet-100 p-5">
                    <h3 className="text-base font-bold text-slate-900">{block.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed mt-2">{block.description}</p>
                    <ul className="space-y-2 mt-4">
                      {block.bullets.map((bullet: string) => (
                        <li key={bullet} className="flex gap-2 text-sm text-slate-600 leading-relaxed">
                          <CircleCheckBig className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-2 text-slate-900">
                <Target className="w-5 h-5 text-violet-500" />
                <h2 className="text-2xl font-extrabold">招聘方重点关注</h2>
              </div>
              <div className="space-y-4 mt-6">
                {hiringFocusItems.map((item: HiringFocusItem) => (
                  <div key={item.title} className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
                    <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mt-2">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-2 text-slate-900">
                <ClipboardList className="w-5 h-5 text-violet-500" />
                <h2 className="text-2xl font-extrabold">投递优化建议</h2>
              </div>
              <div className="space-y-4 mt-6">
                {deliverySuggestions.map((suggestion: DeliverySuggestion) => (
                  <div key={suggestion.title} className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
                    <h3 className="text-base font-bold text-slate-900">{suggestion.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mt-2">{suggestion.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8 lg:col-span-1">
              <div className="flex items-center gap-2 text-slate-900">
                <Users className="w-5 h-5 text-violet-500" />
                <h2 className="text-2xl font-extrabold">适合人群</h2>
              </div>
              <div className="space-y-4 mt-6">
                {audienceProfiles.map((profile: AudienceProfile) => (
                  <div key={profile.title} className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
                    <h3 className="text-base font-bold text-slate-900">{profile.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mt-2">{profile.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8 lg:col-span-1">
              <div className="flex items-center gap-2 text-slate-900">
                <Layers3 className="w-5 h-5 text-violet-500" />
                <h2 className="text-2xl font-extrabold">推荐简历模块</h2>
              </div>
              <div className="space-y-4 mt-6">
                {resumeSectionSuggestions.map((section: ResumeSectionSuggestion) => (
                  <div key={section.title} className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
                    <h3 className="text-base font-bold text-slate-900">{section.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mt-2">{section.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8 lg:col-span-1">
              <div className="flex items-center gap-2 text-slate-900">
                <Tags className="w-5 h-5 text-violet-500" />
                <h2 className="text-2xl font-extrabold">岗位关键词建议</h2>
              </div>
              <p className="text-sm text-slate-500 mt-3 leading-relaxed">这些关键词可以自然融入你的标题、项目经历和技能描述中，帮助 {roleRecord.role} 简历更贴近招聘 JD。</p>
              <div className="flex flex-wrap gap-3 mt-6">
                {keywordSuggestions.map((keyword: string) => (
                  <span key={keyword} className="px-4 py-2 rounded-full bg-violet-50 text-violet-600 text-sm font-medium">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </section>
          <section className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
            <h2 className="text-2xl font-extrabold text-slate-900">推荐模板</h2>
            <p className="text-sm text-slate-500 mt-2">根据 {roleRecord.role} 岗位常见的阅读偏好和表达重点，优先推荐这些模板。</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {recommendedTemplates.map((template) => (
                <div key={template.id} className="rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
                  <div className="relative aspect-[3/4] bg-slate-100">
                    <Image
                      src={template.preview}
                      alt={template.name}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-5">
                    <div className="text-lg font-bold text-slate-900">{template.name}</div>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">{template.description}</p>
                    <p className="text-sm text-slate-600 mt-3 leading-relaxed">{template.fitReason}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {(template.tags ?? []).slice(0, 3).map((tag) => (
                        <span key={tag} className="px-2.5 py-1 rounded-full bg-white text-slate-500 text-xs font-medium border border-slate-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <Link href={`/editor?template=${template.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 mt-4 hover:text-violet-700 transition-colors">
                      使用这个模板
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-2 text-slate-900">
                <BookOpen className="w-5 h-5 text-violet-500" />
                <h2 className="text-2xl font-extrabold">相关文章</h2>
              </div>
              <div className="space-y-4 mt-6">
                {recommendedArticles.map((article) => (
                  <Link key={article.slug} href={`/articles/${article.slug}`} className="block rounded-2xl bg-slate-50 border border-slate-100 p-5 hover:bg-white hover:border-violet-200 transition-all">
                    <h3 className="text-base font-bold text-slate-900 hover:text-violet-600 transition-colors">{article.title}</h3>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">{article.abstract}</p>
                  </Link>
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
              <h2 className="text-2xl font-extrabold text-slate-900">相关岗位模板</h2>
              <div className="flex flex-wrap gap-3 mt-6">
                {relatedRoles.map((role) => (
                  <Link key={role.slug} href={`/templates/${role.slug}`} className="px-4 py-2 rounded-full bg-slate-50 text-slate-600 text-sm hover:bg-violet-50 hover:text-violet-600 transition-colors">
                    {role.role}
                  </Link>
                ))}
              </div>
            </div>
          </section>
          <section className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
            <h2 className="text-2xl font-extrabold text-slate-900">常见问题</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {faqItems.map((item) => (
                <div key={item.question} className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
                  <h3 className="text-base font-bold text-slate-900">{item.question}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mt-3">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
