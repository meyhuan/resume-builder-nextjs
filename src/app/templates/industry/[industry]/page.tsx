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
type TemplateRoleIndustryGroup = ReturnType<typeof templateRoleData.getAllTemplateRoleIndustries>[number];
type TemplateRoleCategoryGroup = ReturnType<typeof templateRoleData.getAllTemplateRoleCategories>[number];

type IndustryPageParams = {
  params: Promise<{
    industry: string;
  }>;
};

function createPageTitle(industryName: string): string {
  return `${industryName}简历模板 - ${industryName}岗位简历模板与写作建议 | 智简简历`;
}

function createPageDescription(industryName: string, roleCount: number): string {
  return `查看适合${industryName}行业的简历模板、岗位入口与写作建议，覆盖 ${roleCount} 个相关岗位，帮助你更快找到适合自己的 AI 简历制作方案。`;
}

function createIndustrySummary(industryName: string, categories: readonly string[]): string {
  const categoryText: string = categories.slice(0, 4).join('、');
  return `${industryName}行业通常覆盖${categoryText}等岗位方向，招聘方会更关注你的行业理解、岗位匹配度、项目结果和关键词表达是否足够贴近业务场景。`;
}

function createIndustryHighlights(industryName: string): readonly string[] {
  return [
    `优先选择与你目标${industryName}岗位最接近的岗位页，避免简历方向过于分散。`,
    `把与${industryName}业务场景相关的项目、成果和协作经历放在简历前面。`,
    `针对不同公司 JD 微调关键词，但保留统一的结构化模板骨架。`,
  ];
}

function createBreadcrumbSchema(industryGroup: TemplateRoleIndustryGroup): JsonLdNode {
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
        name: `${industryGroup.industry}简历模板`,
        item: `${SITE_URL}/templates/industry/${industryGroup.slug}`,
      },
    ],
  };
}

function createCollectionSchema(industryGroup: TemplateRoleIndustryGroup): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: createPageTitle(industryGroup.industry),
    description: createPageDescription(industryGroup.industry, industryGroup.roleCount),
    url: `${SITE_URL}/templates/industry/${industryGroup.slug}`,
    isPartOf: {
      '@type': 'WebSite',
      name: '智简简历',
      url: SITE_URL,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: industryGroup.roleCount,
      itemListElement: industryGroup.roles.slice(0, 24).map((role: TemplateRoleRecord, index: number) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: `${role.role}简历模板`,
        url: `${SITE_URL}/templates/${role.slug}`,
      })),
    },
  };
}

export async function generateStaticParams(): Promise<{ industry: string }[]> {
  return templateRoleData.getAllTemplateRoleIndustries().map((industryGroup: TemplateRoleIndustryGroup) => ({
    industry: industryGroup.slug,
  }));
}

export async function generateMetadata({ params }: IndustryPageParams): Promise<Metadata> {
  const resolvedParams = await params;
  const industryGroup = templateRoleData.getTemplateRoleIndustryBySlug(resolvedParams.industry);
  if (!industryGroup) {
    return {
      title: '行业模板未找到',
    };
  }
  const title: string = createPageTitle(industryGroup.industry);
  const description: string = createPageDescription(industryGroup.industry, industryGroup.roleCount);
  return {
    title,
    description,
    keywords: [
      `${industryGroup.industry}简历模板`,
      `${industryGroup.industry}岗位简历`,
      `${industryGroup.industry}简历怎么写`,
      `${industryGroup.industry}AI简历`,
      ...industryGroup.roles.slice(0, 6).map((role: TemplateRoleRecord) => role.role),
    ],
    alternates: {
      canonical: `${SITE_URL}/templates/industry/${industryGroup.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/templates/industry/${industryGroup.slug}`,
      type: 'website',
    },
  };
}

export default async function TemplateIndustryPage({ params }: IndustryPageParams): Promise<ReactElement> {
  const resolvedParams = await params;
  const industryGroup = templateRoleData.getTemplateRoleIndustryBySlug(resolvedParams.industry);
  if (!industryGroup) {
    notFound();
  }
  const relatedIndustries: TemplateRoleIndustryGroup[] = templateRoleData
    .getAllTemplateRoleIndustries()
    .filter((group: TemplateRoleIndustryGroup) => group.slug !== industryGroup.slug)
    .slice(0, 4);
  const relatedCategories: TemplateRoleCategoryGroup[] = templateRoleData
    .getAllTemplateRoleCategories()
    .filter((group: TemplateRoleCategoryGroup) => industryGroup.categories.includes(group.category))
    .slice(0, 6);
  const industryHighlights: readonly string[] = createIndustryHighlights(industryGroup.industry);
  const breadcrumbSchema: JsonLdNode = createBreadcrumbSchema(industryGroup);
  const collectionSchema: JsonLdNode = createCollectionSchema(industryGroup);
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
            <span className="text-slate-600">{industryGroup.industry}</span>
          </p>
          <section>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
              {industryGroup.industry}简历模板
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {createIndustrySummary(industryGroup.industry, industryGroup.categories)}
              共 {industryGroup.roleCount} 个岗位。
              <Link href="/ai" className="ml-1 text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-violet-700">
                生成我的简历
              </Link>
              <span className="text-slate-400"> · </span>
              <Link href="/templates" className="text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-violet-700">
                返回模板中心
              </Link>
            </p>
            <ul className="mt-4 max-w-2xl space-y-1.5 text-sm leading-6 text-slate-500">
              {industryHighlights.map((highlight: string) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900">相关岗位</h2>
            <p className="mt-1 text-sm text-slate-500">进入岗位页查看模板、写作建议和关键词。</p>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {industryGroup.roles.map((role: TemplateRoleRecord) => (
                <Link
                  key={role.slug}
                  href={`/templates/${role.slug}`}
                  className="group rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300"
                >
                  <div className="text-xs text-slate-500">{role.category}</div>
                  <h3 className="mt-2 text-base font-semibold text-slate-900 group-hover:text-violet-700">{role.role}简历模板</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                    查看适合 {role.role} 的模板推荐、表达重点与岗位关键词建议。
                  </p>
                </Link>
              ))}
            </div>
          </section>
          <section className="border-t border-slate-200 pt-8">
            {relatedCategories.length > 0 ? (
              <div>
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
              </div>
            ) : null}
            {relatedIndustries.length > 0 ? (
              <div className={relatedCategories.length > 0 ? 'mt-6' : undefined}>
                <h2 className="text-sm font-medium text-slate-800">相关行业主题</h2>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                  {relatedIndustries.map((group: TemplateRoleIndustryGroup) => (
                    <li key={group.slug}>
                      <Link href={`/templates/industry/${group.slug}`} className="text-sm text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-violet-700">
                        {group.industry}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
