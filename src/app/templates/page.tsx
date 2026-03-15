import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, Sparkles } from 'lucide-react';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { templateCatalog } from '@/lib/templates/template-catalog';
import { templateRoleData } from '@/lib/templates/template-role-data';

const SITE_URL: string = 'https://aijianli.cn';
const PAGE_TITLE: string = '免费极简简历模板中心 - AI 简历生成与在线制作';
const PAGE_DESCRIPTION: string = '提供最新、专业的极简简历模板，覆盖前端开发、产品经理、运营、新媒体等岗位。完全免费的 AI 简历制作在线网站，支持一键智能生成、PDF与Markdown免费导出。';

type JsonLdPrimitive = string | number | boolean;

type JsonLdNode = {
  [key: string]: JsonLdPrimitive | JsonLdNode | JsonLdNode[] | JsonLdPrimitive[] | undefined;
};

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: ['极简简历模板', '简历模板免费', '免费简历在线制作', 'AI简历', '产品经理简历', '大学生简历制作', '秋招简历在线模版', '免费导出PDF', '智简简历'],
  alternates: {
    canonical: `${SITE_URL}/templates`,
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${SITE_URL}/templates`,
    type: 'website',
  },
};

function createRoleCountLabel(roleCount: number): string {
  return `${roleCount} 个岗位模板入口`;
}

function createBreadcrumbSchema(): JsonLdNode {
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
    ],
  };
}

function createCollectionSchema(roleCount: number): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${SITE_URL}/templates`,
    isPartOf: {
      '@type': 'WebSite',
      name: '智简简历',
      url: SITE_URL,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: roleCount,
      itemListElement: templateRoleData.getFeaturedTemplateRoles(18).map((role, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: `${role.role}简历模板`,
        url: `${SITE_URL}/templates/${role.slug}`,
      })),
    },
  };
}

export default function TemplatesPage(): ReactElement {
  const featuredRoles = templateRoleData.getFeaturedTemplateRoles(18);
  const emergingRoles = templateRoleData.getEmergingTemplateRoles(12);
  const categoryGroups = templateRoleData.getAllTemplateRoleCategories();
  const industryGroups = templateRoleData.getAllTemplateRoleIndustries();
  const roleGroups = templateRoleData.getTemplateRoleGroups().slice(0, 6);
  const totalRoleCount: number = templateRoleData.getAllTemplateRoles().length;
  const breadcrumbSchema: JsonLdNode = createBreadcrumbSchema();
  const collectionSchema: JsonLdNode = createCollectionSchema(totalRoleCount);
  const templates = templateCatalog.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    preview: template.preview,
    tags: template.tags ?? [],
  }));
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] selection:bg-fuchsia-200">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <LandingHeader forceSolid />
      <main className="flex-grow pt-36 pb-20 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-8%] right-[-5%] w-[520px] h-[520px] bg-violet-500/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[420px] h-[420px] bg-fuchsia-500/8 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
          <section className="text-center space-y-5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 backdrop-blur-sm border border-white rounded-full shadow-sm">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-violet-600">岗位简历模板中心</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              按岗位选择更适合你的
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500"> 简历模板</span>
            </h1>
            <p className="text-base md:text-lg text-slate-500 max-w-3xl mx-auto leading-relaxed">
              这里汇总了面向前端开发、产品经理、新媒体运营、UI 设计、HR 等岗位的模板入口与写作建议，帮助你更快找到适合自己的简历结构、表达重点和 AI 生成路径。
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/ai" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-violet-600 text-white font-semibold shadow-lg shadow-violet-500/20 hover:bg-violet-700 transition-colors">
                去 AI 生成简历
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/#templates" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-slate-700 font-semibold border border-slate-200 hover:border-violet-200 hover:text-violet-600 transition-colors">
                查看首页精选模板
              </Link>
            </div>
          </section>
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm border border-white shadow-sm">
                <div className="relative aspect-[3/4] bg-slate-100">
                  <Image
                    src={template.preview}
                    alt={template.name}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                </div>
                <div className="p-5">
                  <div className="text-sm font-bold text-slate-900">{template.name}</div>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">{template.description}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </section>
          <section className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">热门岗位入口</h2>
                <p className="text-sm text-slate-500 mt-2">优先覆盖互联网、产品、运营、设计等高频求职岗位。</p>
              </div>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-violet-600">
                <BriefcaseBusiness className="w-4 h-4" />
                {createRoleCountLabel(totalRoleCount)}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredRoles.map((role) => (
                <Link key={role.slug} href={`/templates/${role.slug}`} className="group rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-violet-200 hover:shadow-sm transition-all p-5">
                  <div className="text-xs font-semibold text-violet-600">{role.industry} / {role.category}</div>
                  <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-violet-600 transition-colors">{role.role}简历模板</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">
                    查看适合 {role.role} 岗位的模板、表达重点、常见错误和 AI 生成入口。
                  </p>
                </Link>
              ))}
            </div>
          </section>
          <section className="rounded-3xl bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 border border-violet-100 shadow-sm p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">新兴岗位模板</h2>
                <p className="text-sm text-slate-500 mt-2">优先覆盖 AI、数据、增长、电商、体验设计等竞争相对更低但需求在增长的岗位方向。</p>
              </div>
              <div className="text-sm font-medium text-violet-600">更适合优先布局新岗位机会</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {emergingRoles.map((role) => (
                <Link key={role.slug} href={`/templates/${role.slug}`} className="group rounded-2xl border border-violet-100 bg-white/90 hover:bg-white hover:border-violet-200 hover:shadow-sm transition-all p-5">
                  <div className="text-xs font-semibold text-violet-600">{role.industry} / {role.category}</div>
                  <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-violet-600 transition-colors">{role.role}简历模板</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">
                    查看适合 {role.role} 的模板推荐、岗位关键词建议和投递优化重点。
                  </p>
                </Link>
              ))}
            </div>
          </section>
          <section className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">按岗位大类浏览</h2>
                <p className="text-sm text-slate-500 mt-2">先进入技术、产品、运营、设计等主题聚合页，再选择具体岗位，能更快形成清晰的 SEO 内链结构。</p>
              </div>
              <div className="text-sm font-medium text-violet-600">更适合先缩小岗位方向范围</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categoryGroups.map((group) => (
                <Link key={group.slug} href={`/templates/category/${group.slug}`} className="group rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-violet-200 hover:shadow-sm transition-all p-5">
                  <div className="text-xs font-semibold text-violet-600">覆盖 {group.roleCount} 个岗位</div>
                  <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-violet-600 transition-colors">{group.category}简历模板</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">
                    {group.industries.slice(0, 2).join('、')} 等方向的 {group.category} 岗位模板入口。
                  </p>
                </Link>
              ))}
            </div>
          </section>
          <section className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">按行业主题浏览</h2>
                <p className="text-sm text-slate-500 mt-2">再补一层行业主题页，让互联网通信、广告传媒设计、金融投资等方向拥有独立聚合入口。</p>
              </div>
              <div className="text-sm font-medium text-violet-600">更适合先确定目标行业方向</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {industryGroups.map((group) => (
                <Link key={group.slug} href={`/templates/industry/${group.slug}`} className="group rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-violet-200 hover:shadow-sm transition-all p-5">
                  <div className="text-xs font-semibold text-violet-600">覆盖 {group.roleCount} 个岗位</div>
                  <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-violet-600 transition-colors">{group.industry}简历模板</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">
                    包含 {group.categories.slice(0, 3).join('、')} 等岗位方向入口。
                  </p>
                </Link>
              ))}
            </div>
          </section>
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">按行业浏览</h2>
              <p className="text-sm text-slate-500 mt-2">先按行业筛方向，再进入具体岗位页查看模板建议与写作重点。</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {roleGroups.map((group) => (
                <div key={group.industry} className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-slate-900">{group.industry}</h3>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-violet-50 text-violet-600">
                      {createRoleCountLabel(group.roles.length)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {group.roles.slice(0, 12).map((role) => (
                      <Link key={role.slug} href={`/templates/${role.slug}`} className="px-3 py-2 rounded-full bg-slate-50 text-slate-600 text-sm hover:bg-violet-50 hover:text-violet-600 transition-colors">
                        {role.role}
                      </Link>
                    ))}
                  </div>
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
