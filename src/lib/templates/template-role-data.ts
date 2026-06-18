import jobTreeData from '../../../files/job_tree.json';
import { emergingTemplateRoles } from '@/lib/templates/emerging-template-roles';
import { templateCatalog } from '@/lib/templates/template-catalog';

type TemplateRoleRecord = {
  slug: string;
  role: string;
  industry: string;
  category: string;
  articleCategoryId: 'resume-writing' | 'fresh-graduate' | 'interview-tips' | 'career-guide';
  searchKeywords: readonly string[];
  recommendedTemplateIds: readonly string[];
};

type TemplateRoleGroup = {
  industry: string;
  roles: readonly TemplateRoleRecord[];
};

type TemplateRoleCategoryGroup = {
  slug: string;
  category: string;
  roleCount: number;
  roles: readonly TemplateRoleRecord[];
  industries: readonly string[];
};

type TemplateRoleIndustryGroup = {
  slug: string;
  industry: string;
  roleCount: number;
  roles: readonly TemplateRoleRecord[];
  categories: readonly string[];
};

type JobTreeLeaf = Record<string, object>;

type JobTreeCategoryMap = Record<string, Record<string, JobTreeLeaf>>;

type JobTreeRoot = {
  data: JobTreeCategoryMap;
};

type EmergingTemplateRole = {
  role: string;
  industry: string;
  category: string;
};

type TemplateRoleDataApi = {
  getAllTemplateRoles: () => TemplateRoleRecord[];
  getAllTemplateRoleCategories: () => TemplateRoleCategoryGroup[];
  getAllTemplateRoleIndustries: () => TemplateRoleIndustryGroup[];
  getTemplateRoleCategoryBySlug: (slug: string) => TemplateRoleCategoryGroup | undefined;
  getTemplateRoleIndustryBySlug: (slug: string) => TemplateRoleIndustryGroup | undefined;
  getEmergingTemplateRoles: (limit: number) => TemplateRoleRecord[];
  getAiNewCareerTemplateRoles: (limit: number) => TemplateRoleRecord[];
  getTemplateRoleBySlug: (slug: string) => TemplateRoleRecord | undefined;
  getFeaturedTemplateRoles: (limit: number) => TemplateRoleRecord[];
  getTemplateRoleGroups: () => TemplateRoleGroup[];
  getRelatedTemplateRoles: (slug: string, limit: number) => TemplateRoleRecord[];
};

const CURATED_ROLE_NAMES: readonly string[] = [
  '产品助理', '产品策划', '产品经理', '游戏策划', '前端开发', '后端开发', '测试', '移动开发', '运维', 'DBA',
  '硬件开发', 'UI交互设计', '平面设计', '网页设计', '游戏原画', '游戏场景', '游戏特效设计', '产品运营', '内容运营', '新媒体运营', '活动运营', '用户运营', '客服',
  '品牌公关', '商务合作', '市场调研', '营销推广', '广告优化', '广告执行', '广告设计', '文案策划', '编辑',
  '美术编辑', '记者', '主编', '摄影师', '会展策划', '导演', '导演助理', '后期制作', '影视制作', '编导', '美术指导', 'HRBP', '人力资源',
  '招聘', '培训', '绩效考核', '企业文化', '猎头', '薪酬福利', '前台', '总助', '行政', '文员', '文秘', '课程设计', '课程顾问', '培训讲师', '教务助理', '客户经理', '销售代表',
  '财务', '会计', '出纳', '审计', '税务', '采购', '供应链', '仓库管理', '物流管理', '跟单', '项目管理',
  '理财规划', '风险控制', '投资顾问', '证券分析', '银行柜员',
];

const CATEGORY_KEYWORD_MAP: Record<TemplateRoleRecord['articleCategoryId'], readonly string[]> = {
  'resume-writing': ['简历模板', '项目经历', '工作经历', '亮点表达', '简历优化'],
  'fresh-graduate': ['应届生简历', '实习经历', '校园经历', '校招求职', '零经验'],
  'interview-tips': ['面试问题', '自我介绍', '项目复盘', '面试准备', '面试技巧'],
  'career-guide': ['岗位发展', '职业规划', '转行求职', '行业认知', '职场成长'],
};

const TEMPLATE_IDS: readonly string[] = templateCatalog.map((template) => template.id);
const DEFAULT_TEMPLATE_IDS: readonly string[] = TEMPLATE_IDS.slice(0, 3);
const EMERGING_ROLE_NAMES: ReadonlySet<string> = new Set<string>(emergingTemplateRoles.map((role: EmergingTemplateRole) => role.role));
const AI_NEW_CAREER_ROLE_NAMES: readonly string[] = [
  'AI产品经理',
  'AIGC运营',
  '提示词工程师',
  '大模型应用工程师',
  'AI Agent工程师',
  'RAG工程师',
  '大模型算法工程师',
  'AI应用开发工程师',
  'AI测试工程师',
  'MLOps工程师',
  '大模型产品经理',
  'AIGC产品经理',
  'AI工具运营',
  'AI内容运营',
  'AI解决方案顾问',
  '生成式人工智能系统测试员',
  '跨境电商运营管理师',
  'TikTok Shop运营',
  '无人机群飞行规划员',
  '智慧仓运维员',
  '储能工程师',
  '光伏运维工程师',
  '工业机器人调试工程师',
  '养老顾问',
];
const AI_NEW_CAREER_PRIORITY: ReadonlyMap<string, number> = new Map<string, number>(
  AI_NEW_CAREER_ROLE_NAMES.map((role: string, index: number) => [role, index]),
);

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeIncomingSlug(value: string): string {
  const trimmedValue: string = value.trim();
  try {
    return normalizeSlug(decodeURIComponent(trimmedValue));
  } catch {
    return normalizeSlug(trimmedValue);
  }
}

function buildRoleArticleCategory(industry: string, category: string, role: string): TemplateRoleRecord['articleCategoryId'] {
  const freshGraduateKeywords: readonly string[] = ['助理', '实习', '校招', '应届'];
  const interviewKeywords: readonly string[] = ['产品', '开发', '测试', '运维', '设计', '运营', '经理'];
  if (freshGraduateKeywords.some((keyword) => role.includes(keyword))) {
    return 'fresh-graduate';
  }
  if (industry === '互联网通信' || interviewKeywords.some((keyword) => role.includes(keyword))) {
    return 'interview-tips';
  }
  if (industry === '管理/人力/行政' || industry === '金融投资') {
    return 'career-guide';
  }
  if (category === '设计' || category === '媒体' || category === '广告') {
    return 'resume-writing';
  }
  return 'resume-writing';
}

function buildRecommendedTemplateIds(industry: string, category: string): readonly string[] {
  if (industry === '互联网通信' && category === '技术') {
    return ['simple', 'timeline', 'warm'];
  }
  if (industry === '互联网通信' && (category === '产品' || category === '运营')) {
    return ['warm', 'simple', 'elegant'];
  }
  if (category === '设计' || industry === '广告/传媒/设计') {
    return ['warm', 'elegant', 'simple'];
  }
  if (industry === '管理/人力/行政' || industry === '教育/咨询/翻译') {
    return ['elegant', 'simple', 'timeline'];
  }
  return DEFAULT_TEMPLATE_IDS;
}

function createUniqueSlug(baseValue: string, usedSlugs: Set<string>, fallbackValue: string): string {
  const baseSlug: string = normalizeSlug(baseValue) || normalizeSlug(fallbackValue);
  if (!usedSlugs.has(baseSlug)) {
    usedSlugs.add(baseSlug);
    return baseSlug;
  }
  const fallbackSlug: string = normalizeSlug(fallbackValue);
  if (!usedSlugs.has(fallbackSlug)) {
    usedSlugs.add(fallbackSlug);
    return fallbackSlug;
  }
  let suffix: number = 2;
  while (usedSlugs.has(`${fallbackSlug}-${suffix}`)) {
    suffix += 1;
  }
  const finalSlug: string = `${fallbackSlug}-${suffix}`;
  usedSlugs.add(finalSlug);
  return finalSlug;
}

function createTemplateRoleRecord(
  role: string,
  industry: string,
  category: string,
  usedSlugs: Set<string>,
): TemplateRoleRecord {
  const articleCategoryId: TemplateRoleRecord['articleCategoryId'] = buildRoleArticleCategory(industry, category, role);
  const slug: string = createUniqueSlug(role, usedSlugs, `${industry}-${category}-${role}`);
  return {
    slug,
    role,
    industry,
    category,
    articleCategoryId,
    searchKeywords: CATEGORY_KEYWORD_MAP[articleCategoryId],
    recommendedTemplateIds: buildRecommendedTemplateIds(industry, category),
  };
}

function buildTemplateRoleRecords(): TemplateRoleRecord[] {
  const jobTree: JobTreeRoot = jobTreeData as unknown as JobTreeRoot;
  const usedSlugs: Set<string> = new Set<string>();
  const records: TemplateRoleRecord[] = [];
  for (const [industry, categoryMap] of Object.entries(jobTree.data)) {
    for (const [category, roleMap] of Object.entries(categoryMap)) {
      for (const role of Object.keys(roleMap)) {
        if (!CURATED_ROLE_NAMES.includes(role)) {
          continue;
        }
        records.push(createTemplateRoleRecord(role, industry, category, usedSlugs));
      }
    }
  }
  for (const emergingRole of emergingTemplateRoles as readonly EmergingTemplateRole[]) {
    records.push(createTemplateRoleRecord(emergingRole.role, emergingRole.industry, emergingRole.category, usedSlugs));
  }
  return records.sort((left: TemplateRoleRecord, right: TemplateRoleRecord) => left.slug.localeCompare(right.slug, 'zh-CN'));
}

const TEMPLATE_ROLE_RECORDS: readonly TemplateRoleRecord[] = buildTemplateRoleRecords();
const TEMPLATE_ROLE_GROUPS: readonly TemplateRoleGroup[] = Object.values(
  TEMPLATE_ROLE_RECORDS.reduce<Record<string, TemplateRoleGroup>>((accumulator: Record<string, TemplateRoleGroup>, role: TemplateRoleRecord) => {
    const existingGroup: TemplateRoleGroup | undefined = accumulator[role.industry];
    if (existingGroup) {
      accumulator[role.industry] = {
        industry: existingGroup.industry,
        roles: [...existingGroup.roles, role],
      };
      return accumulator;
    }
    accumulator[role.industry] = {
      industry: role.industry,
      roles: [role],
    };
    return accumulator;
  }, {}),
).sort((left: TemplateRoleGroup, right: TemplateRoleGroup) => right.roles.length - left.roles.length);
const TEMPLATE_ROLE_CATEGORIES: readonly TemplateRoleCategoryGroup[] = Object.values(
  TEMPLATE_ROLE_RECORDS.reduce<Record<string, TemplateRoleCategoryGroup>>((accumulator: Record<string, TemplateRoleCategoryGroup>, role: TemplateRoleRecord) => {
    const categorySlug: string = normalizeSlug(role.category);
    const existingGroup: TemplateRoleCategoryGroup | undefined = accumulator[categorySlug];
    if (existingGroup) {
      accumulator[categorySlug] = {
        slug: existingGroup.slug,
        category: existingGroup.category,
        roleCount: existingGroup.roleCount + 1,
        roles: [...existingGroup.roles, role],
        industries: existingGroup.industries.includes(role.industry)
          ? existingGroup.industries
          : [...existingGroup.industries, role.industry],
      };
      return accumulator;
    }
    accumulator[categorySlug] = {
      slug: categorySlug,
      category: role.category,
      roleCount: 1,
      roles: [role],
      industries: [role.industry],
    };
    return accumulator;
  }, {}),
).sort((left: TemplateRoleCategoryGroup, right: TemplateRoleCategoryGroup) => right.roleCount - left.roleCount);
const TEMPLATE_ROLE_INDUSTRIES: readonly TemplateRoleIndustryGroup[] = Object.values(
  TEMPLATE_ROLE_RECORDS.reduce<Record<string, TemplateRoleIndustryGroup>>((accumulator: Record<string, TemplateRoleIndustryGroup>, role: TemplateRoleRecord) => {
    const industrySlug: string = normalizeSlug(role.industry);
    const existingGroup: TemplateRoleIndustryGroup | undefined = accumulator[industrySlug];
    if (existingGroup) {
      accumulator[industrySlug] = {
        slug: existingGroup.slug,
        industry: existingGroup.industry,
        roleCount: existingGroup.roleCount + 1,
        roles: [...existingGroup.roles, role],
        categories: existingGroup.categories.includes(role.category)
          ? existingGroup.categories
          : [...existingGroup.categories, role.category],
      };
      return accumulator;
    }
    accumulator[industrySlug] = {
      slug: industrySlug,
      industry: role.industry,
      roleCount: 1,
      roles: [role],
      categories: [role.category],
    };
    return accumulator;
  }, {}),
).sort((left: TemplateRoleIndustryGroup, right: TemplateRoleIndustryGroup) => right.roleCount - left.roleCount);

export const templateRoleData: TemplateRoleDataApi = {
  getAllTemplateRoles(): TemplateRoleRecord[] {
    return [...TEMPLATE_ROLE_RECORDS];
  },
  getAllTemplateRoleCategories(): TemplateRoleCategoryGroup[] {
    return TEMPLATE_ROLE_CATEGORIES.map((group: TemplateRoleCategoryGroup) => ({
      slug: group.slug,
      category: group.category,
      roleCount: group.roleCount,
      roles: [...group.roles],
      industries: [...group.industries],
    }));
  },
  getAllTemplateRoleIndustries(): TemplateRoleIndustryGroup[] {
    return TEMPLATE_ROLE_INDUSTRIES.map((group: TemplateRoleIndustryGroup) => ({
      slug: group.slug,
      industry: group.industry,
      roleCount: group.roleCount,
      roles: [...group.roles],
      categories: [...group.categories],
    }));
  },
  getTemplateRoleCategoryBySlug(slug: string): TemplateRoleCategoryGroup | undefined {
    const normalizedSlug: string = normalizeIncomingSlug(slug);
    const categoryGroup: TemplateRoleCategoryGroup | undefined = TEMPLATE_ROLE_CATEGORIES.find((group: TemplateRoleCategoryGroup) => group.slug === normalizedSlug);
    if (!categoryGroup) {
      return undefined;
    }
    return {
      slug: categoryGroup.slug,
      category: categoryGroup.category,
      roleCount: categoryGroup.roleCount,
      roles: [...categoryGroup.roles],
      industries: [...categoryGroup.industries],
    };
  },
  getTemplateRoleIndustryBySlug(slug: string): TemplateRoleIndustryGroup | undefined {
    const normalizedSlug: string = normalizeIncomingSlug(slug);
    const industryGroup: TemplateRoleIndustryGroup | undefined = TEMPLATE_ROLE_INDUSTRIES.find((group: TemplateRoleIndustryGroup) => group.slug === normalizedSlug);
    if (!industryGroup) {
      return undefined;
    }
    return {
      slug: industryGroup.slug,
      industry: industryGroup.industry,
      roleCount: industryGroup.roleCount,
      roles: [...industryGroup.roles],
      categories: [...industryGroup.categories],
    };
  },
  getEmergingTemplateRoles(limit: number): TemplateRoleRecord[] {
    return TEMPLATE_ROLE_RECORDS.filter((role: TemplateRoleRecord) => EMERGING_ROLE_NAMES.has(role.role)).slice(0, Math.max(limit, 0));
  },
  getAiNewCareerTemplateRoles(limit: number): TemplateRoleRecord[] {
    return TEMPLATE_ROLE_RECORDS
      .filter((role: TemplateRoleRecord) => AI_NEW_CAREER_PRIORITY.has(role.role))
      .sort((left: TemplateRoleRecord, right: TemplateRoleRecord) => {
        return (AI_NEW_CAREER_PRIORITY.get(left.role) ?? 999) - (AI_NEW_CAREER_PRIORITY.get(right.role) ?? 999);
      })
      .slice(0, Math.max(limit, 0));
  },
  getTemplateRoleBySlug(slug: string): TemplateRoleRecord | undefined {
    const normalizedSlug: string = normalizeIncomingSlug(slug);
    return TEMPLATE_ROLE_RECORDS.find((role: TemplateRoleRecord) => role.slug === normalizedSlug);
  },
  getFeaturedTemplateRoles(limit: number): TemplateRoleRecord[] {
    return TEMPLATE_ROLE_RECORDS.slice(0, Math.max(limit, 0));
  },
  getTemplateRoleGroups(): TemplateRoleGroup[] {
    return TEMPLATE_ROLE_GROUPS.map((group: TemplateRoleGroup) => ({
      industry: group.industry,
      roles: [...group.roles],
    }));
  },
  getRelatedTemplateRoles(slug: string, limit: number): TemplateRoleRecord[] {
    const currentRole: TemplateRoleRecord | undefined = TEMPLATE_ROLE_RECORDS.find((role: TemplateRoleRecord) => role.slug === slug);
    if (!currentRole) {
      return [];
    }
    const sameIndustryRoles: TemplateRoleRecord[] = TEMPLATE_ROLE_RECORDS.filter((role: TemplateRoleRecord) => role.slug !== slug && role.industry === currentRole.industry);
    if (sameIndustryRoles.length >= limit) {
      return sameIndustryRoles.slice(0, Math.max(limit, 0));
    }
    const sameCategoryRoles: TemplateRoleRecord[] = TEMPLATE_ROLE_RECORDS.filter((role: TemplateRoleRecord) => role.slug !== slug && role.category === currentRole.category && role.industry !== currentRole.industry);
    return [...sameIndustryRoles, ...sameCategoryRoles].slice(0, Math.max(limit, 0));
  },
};
