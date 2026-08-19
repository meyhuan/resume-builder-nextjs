import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <LandingHeader forceSolid />
      <main className="flex-grow pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <p className="text-sm text-slate-400">
            <Link href="/" className="hover:text-slate-600">首页</Link>
            <span className="px-1.5">/</span>
            <Link href="/templates" className="hover:text-slate-600">简历模板中心</Link>
            <span className="px-1.5">/</span>
            <span className="text-slate-600">{categoryGroup.category}</span>
          </p>
          <section>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
              {categoryGroup.category}简历模板
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {createCategorySummary(categoryGroup.category, categoryGroup.industries)}
              共 {categoryGroup.roleCount} 个岗位。
              <Link href="/ai" className="ml-1 text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-violet-700">
                生成我的简历
              </Link>
              <span className="text-slate-400"> · </span>
              <Link href="/templates" className="text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-violet-700">
                返回模板中心
              </Link>
            </p>
            <ul className="mt-4 max-w-2xl space-y-1.5 text-sm leading-6 text-slate-500">
              {categoryHighlights.map((highlight: string) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900">相关岗位</h2>
            <p className="mt-1 text-sm text-slate-500">进入岗位页查看模板、写作建议和关键词。</p>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoryGroup.roles.map((role: TemplateRoleRecord) => (
                <Link
                  key={role.slug}
                  href={`/templates/${role.slug}`}
                  className="group rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300"
                >
                  <div className="text-xs text-slate-500">{role.industry}</div>
                  <h3 className="mt-2 text-base font-semibold text-slate-900 group-hover:text-violet-700">{role.role}简历模板</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                    查看适合 {role.role} 的模板推荐、表达重点与岗位关键词建议。
                  </p>
                </Link>
              ))}
            </div>
          </section>
          {relatedCategories.length > 0 ? (
            <section className="border-t border-slate-200 pt-8">
              <h2 className="text-sm font-medium text-slate-800">相关岗位大类</h2>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {relatedCategories.map((group: TemplateRoleCategoryGroup) => (
                  <li key={group.slug}>
                    <Link href={`/templates/category/${group.slug}`} className="text-sm text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-violet-700">
                      {group.category}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
