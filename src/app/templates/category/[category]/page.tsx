import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BriefcaseBusiness, ChevronRight, Layers3 } from 'lucide-react';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { templateRoleData } from '@/lib/templates/template-role-data';

const SITE_URL: string = 'https://aijianli.cn';

type JsonLdPrimitive = string | number | boolean;

type JsonLdNode = {
  [key: string]: JsonLdPrimitive | JsonLdNode | JsonLdNode[] | JsonLdPrimitive[] | undefined;
};

type TemplateRoleRecord = ReturnType<typeof templateRoleData.getAllTemplateRoles>[number];
type TemplateRoleCategoryGroup = ReturnType<typeof templateRoleData.getAllTemplateRoleCategories>[number];

type CategoryPageParams = {
  params: Promise<{
    category: string;
  }>;
};

function createPageTitle(categoryName: string): string {
  return `${categoryName}简历模板 - ${categoryName}岗位简历模板与写作建议 | 智简简历`;
}

function createPageDescription(categoryName: string, roleCount: number): string {
  return `查看适合${categoryName}方向的简历模板、岗位入口与写作建议，覆盖 ${roleCount} 个相关岗位，帮助你更快找到适合自己的 AI 简历制作方案。`;
}

function createCategorySummary(categoryName: string, industries: readonly string[]): string {
  const industryText: string = industries.slice(0, 3).join('、');
  return `${categoryName}方向的岗位通常分布在${industryText}等场景中，招聘方会重点关注你的专业能力、项目成果、表达结构与岗位关键词匹配度。`;
}

function createCategoryHighlights(categoryName: string): readonly string[] {
  return [
    `优先浏览与你目标${categoryName}岗位最接近的岗位页，再针对 JD 做定向调整。`,
    `把${categoryName}相关项目、成果指标和协作经验放在简历前半部分。`,
    `先用统一模板生成初稿，再针对不同岗位细化关键词和经历顺序。`,
  ];
}

function createBreadcrumbSchema(categoryGroup: TemplateRoleCategoryGroup): JsonLdNode {
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
        name: `${categoryGroup.category}简历模板`,
        item: `${SITE_URL}/templates/category/${categoryGroup.slug}`,
      },
    ],
  };
}

function createCollectionSchema(categoryGroup: TemplateRoleCategoryGroup): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: createPageTitle(categoryGroup.category),
    description: createPageDescription(categoryGroup.category, categoryGroup.roleCount),
    url: `${SITE_URL}/templates/category/${categoryGroup.slug}`,
    isPartOf: {
      '@type': 'WebSite',
      name: '智简简历',
      url: SITE_URL,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: categoryGroup.roleCount,
      itemListElement: categoryGroup.roles.slice(0, 24).map((role: TemplateRoleRecord, index: number) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: `${role.role}简历模板`,
        url: `${SITE_URL}/templates/${role.slug}`,
      })),
    },
  };
}

export async function generateStaticParams(): Promise<{ category: string }[]> {
  return templateRoleData.getAllTemplateRoleCategories().map((categoryGroup: TemplateRoleCategoryGroup) => ({
    category: categoryGroup.slug,
  }));
}

export async function generateMetadata({ params }: CategoryPageParams): Promise<Metadata> {
  const resolvedParams = await params;
  const categoryGroup = templateRoleData.getTemplateRoleCategoryBySlug(resolvedParams.category);
  if (!categoryGroup) {
    return {
      title: '分类模板未找到',
    };
  }
  const title: string = createPageTitle(categoryGroup.category);
  const description: string = createPageDescription(categoryGroup.category, categoryGroup.roleCount);
  return {
    title,
    description,
    keywords: [
      `${categoryGroup.category}简历模板`,
      `${categoryGroup.category}岗位简历`,
      `${categoryGroup.category}简历怎么写`,
      `${categoryGroup.category}AI简历`,
      ...categoryGroup.roles.slice(0, 6).map((role: TemplateRoleRecord) => role.role),
    ],
    alternates: {
      canonical: `${SITE_URL}/templates/category/${categoryGroup.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/templates/category/${categoryGroup.slug}`,
      type: 'website',
    },
  };
}

export default async function TemplateCategoryPage({ params }: CategoryPageParams): Promise<ReactElement> {
  const resolvedParams = await params;
  const categoryGroup = templateRoleData.getTemplateRoleCategoryBySlug(resolvedParams.category);
  if (!categoryGroup) {
    notFound();
  }
  const relatedCategories: TemplateRoleCategoryGroup[] = templateRoleData
    .getAllTemplateRoleCategories()
    .filter((group: TemplateRoleCategoryGroup) => group.slug !== categoryGroup.slug)
    .slice(0, 4);
  const categoryHighlights: readonly string[] = createCategoryHighlights(categoryGroup.category);
  const breadcrumbSchema: JsonLdNode = createBreadcrumbSchema(categoryGroup);
  const collectionSchema: JsonLdNode = createCollectionSchema(categoryGroup);
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] selection:bg-fuchsia-200">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
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
            <span className="text-slate-600 font-medium">{categoryGroup.category}简历模板</span>
          </nav>
          <section className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8 lg:p-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-50 text-violet-600 rounded-full text-sm font-semibold">
              <Layers3 className="w-4 h-4" />
              {categoryGroup.category}方向岗位聚合页
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mt-5">
              {categoryGroup.category}简历模板与岗位入口
            </h1>
            <p className="text-base md:text-lg text-slate-500 mt-4 max-w-3xl leading-relaxed">
              {createPageDescription(categoryGroup.category, categoryGroup.roleCount)}
            </p>
            <p className="text-sm md:text-base text-slate-600 mt-4 max-w-3xl leading-relaxed">
              {createCategorySummary(categoryGroup.category, categoryGroup.industries)}
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link href="/ai" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-violet-600 text-white font-semibold shadow-lg shadow-violet-500/20 hover:bg-violet-700 transition-colors">
                去 AI 生成简历
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/templates" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-slate-700 font-semibold border border-slate-200 hover:border-violet-200 hover:text-violet-600 transition-colors">
                返回模板中心
              </Link>
            </div>
          </section>
          <section className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-6">
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-2 text-slate-900">
                <BriefcaseBusiness className="w-5 h-5 text-violet-500" />
                <h2 className="text-2xl font-extrabold">浏览重点</h2>
              </div>
              <div className="space-y-4 mt-6">
                {categoryHighlights.map((highlight: string) => (
                  <div key={highlight} className="rounded-2xl bg-slate-50 border border-slate-100 p-5 text-sm text-slate-500 leading-relaxed">
                    {highlight}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
              <h2 className="text-2xl font-extrabold text-slate-900">相关岗位模板</h2>
              <p className="text-sm text-slate-500 mt-2">当前分类共覆盖 {categoryGroup.roleCount} 个岗位，可直接进入具体岗位页查看模板、写作建议与投递优化内容。</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {categoryGroup.roles.map((role: TemplateRoleRecord) => (
                  <Link key={role.slug} href={`/templates/${role.slug}`} className="group rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-violet-200 hover:shadow-sm transition-all p-5">
                    <div className="text-xs font-semibold text-violet-600">{role.industry}</div>
                    <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-violet-600 transition-colors">{role.role}简历模板</h3>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">
                      查看适合 {role.role} 的模板推荐、表达重点与岗位关键词建议。
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
          <section className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
            <h2 className="text-2xl font-extrabold text-slate-900">相关岗位大类</h2>
            <div className="flex flex-wrap gap-3 mt-6">
              {relatedCategories.map((group: TemplateRoleCategoryGroup) => (
                <Link key={group.slug} href={`/templates/category/${group.slug}`} className="px-4 py-2 rounded-full bg-slate-50 text-slate-600 text-sm hover:bg-violet-50 hover:text-violet-600 transition-colors">
                  {group.category}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
