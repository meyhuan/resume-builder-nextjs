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
  getTemplateRoleBySlug: (slug: string) => TemplateRoleRecord | undefined;
  getFeaturedTemplateRoles: (limit: number) => TemplateRoleRecord[];
  getTemplateRoleGroups: () => TemplateRoleGroup[];
  getRelatedTemplateRoles: (slug: string, limit: number) => TemplateRoleRecord[];
};

const CURATED_ROLE_NAMES: readonly string[] = [
  'Product Assistant', 'Product Planner', 'Product Manager', 'Game Designer', 'Frontend Developer', 'Backend Developer', 'QA Engineer', 'Mobile Developer', 'DevOps Engineer', 'DBA',
  'Hardware Engineer', 'UI/UX Designer', 'Graphic Designer', 'Web Designer', 'Game Artist', 'Environment Artist', 'VFX Designer', 'Product Operations', 'Content Operations', 'Social Media Manager', 'Event Manager', 'User Operations', 'Customer Service',
  'Brand & PR', 'Business Development', 'Market Research', 'Marketing', 'Ad Optimization', 'Ad Operations', 'Ad Designer', 'Copywriter', 'Editor',
  'Art Editor', 'Journalist', 'Editor-in-Chief', 'Photographer', 'Event Planner', 'Director', 'Director Assistant', 'Post-production', 'Film Production', 'Producer', 'Art Director', 'HRBP', 'Human Resources',
  'Recruiter', 'Trainer', 'Performance Analyst', 'Culture Specialist', 'Headhunter', 'Compensation & Benefits', 'Receptionist', 'Executive Assistant', 'Admin', 'Clerk', 'Secretary', 'Curriculum Designer', 'Enrollment Advisor', 'Training Instructor', 'Academic Assistant', 'Account Manager', 'Sales Representative',
  'Finance', 'Accountant', 'Cashier', 'Auditor', 'Tax Specialist', 'Procurement', 'Supply Chain', 'Warehouse Manager', 'Logistics Manager', 'Order Coordinator', 'Project Manager',
  'Financial Planner', 'Risk Analyst', 'Investment Advisor', 'Securities Analyst', 'Bank Teller',
];

const CATEGORY_KEYWORD_MAP: Record<TemplateRoleRecord['articleCategoryId'], readonly string[]> = {
  'resume-writing': ['resume template', 'project experience', 'work experience', 'highlight skills', 'resume optimization'],
  'fresh-graduate': ['graduate resume', 'internship experience', 'campus experience', 'campus recruiting', 'no experience'],
  'interview-tips': ['interview questions', 'self introduction', 'project review', 'interview preparation', 'interview tips'],
  'career-guide': ['career development', 'career planning', 'career change', 'industry insights', 'professional growth'],
};

const TEMPLATE_IDS: readonly string[] = templateCatalog.map((template) => template.id);
const DEFAULT_TEMPLATE_IDS: readonly string[] = TEMPLATE_IDS.slice(0, 3);
const EMERGING_ROLE_NAMES: ReadonlySet<string> = new Set<string>(emergingTemplateRoles.map((role: EmergingTemplateRole) => role.role));

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
  const freshGraduateKeywords: readonly string[] = ['Assistant', 'Intern', 'Campus', 'Graduate'];
  const interviewKeywords: readonly string[] = ['Product', 'Developer', 'QA', 'DevOps', 'Designer', 'Operations', 'Manager'];
  if (freshGraduateKeywords.some((keyword) => role.includes(keyword))) {
    return 'fresh-graduate';
  }
  if (industry === 'Tech & Internet' || interviewKeywords.some((keyword) => role.includes(keyword))) {
    return 'interview-tips';
  }
  if (industry === 'Management & HR' || industry === 'Finance & Investment') {
    return 'career-guide';
  }
  if (category === 'Design' || category === 'Media' || category === 'Advertising') {
    return 'resume-writing';
  }
  return 'resume-writing';
}

function buildRecommendedTemplateIds(industry: string, category: string): readonly string[] {
  if (industry === 'Tech & Internet' && category === 'Engineering') {
    return ['simple', 'timeline', 'warm'];
  }
  if (industry === 'Tech & Internet' && (category === 'Product' || category === 'Operations')) {
    return ['warm', 'simple', 'elegant'];
  }
  if (category === 'Design' || industry === 'Advertising & Design') {
    return ['warm', 'elegant', 'simple'];
  }
  if (industry === 'Management & HR' || industry === 'Education & Consulting') {
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
  return records.sort((left: TemplateRoleRecord, right: TemplateRoleRecord) => left.slug.localeCompare(right.slug, 'en'));
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
