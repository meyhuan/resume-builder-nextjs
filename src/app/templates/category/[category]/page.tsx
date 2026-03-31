import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BriefcaseBusiness, ChevronRight, Layers3 } from 'lucide-react';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { SITE_URL } from '@/lib/site-config';
import { templateRoleData } from '@/lib/templates/template-role-data';

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
  return `${categoryName} Resume Templates - ${categoryName} Role Templates & Writing Tips | AI Resume Pass`;
}

function createPageDescription(categoryName: string, roleCount: number): string {
  return `Browse resume templates, role pages, and writing tips for ${categoryName} positions. Covers ${roleCount} related roles to help you find the right AI resume building approach.`;
}

function createCategorySummary(categoryName: string, industries: readonly string[]): string {
  const industryText: string = industries.slice(0, 3).join(', ');
  return `${categoryName} roles are typically found across ${industryText} and similar industries. Recruiters focus on your professional skills, project outcomes, resume structure, and keyword alignment with the role.`;
}

function createCategoryHighlights(categoryName: string): readonly string[] {
  return [
    `Start by browsing the role page closest to your target ${categoryName} position, then tailor for specific JDs.`,
    `Place ${categoryName}-related projects, metrics, and collaboration experience in the top half of your resume.`,
    `Generate a first draft with a unified template, then refine keywords and experience order for each role.`,
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
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Resume Templates',
        item: `${SITE_URL}/templates`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${categoryGroup.category} Resume Templates`,
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
      name: 'AI Resume Pass',
      url: SITE_URL,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: categoryGroup.roleCount,
      itemListElement: categoryGroup.roles.slice(0, 24).map((role: TemplateRoleRecord, index: number) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: `${role.role} Resume Template`,
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
      title: 'Category Templates Not Found',
    };
  }
  const title: string = createPageTitle(categoryGroup.category);
  const description: string = createPageDescription(categoryGroup.category, categoryGroup.roleCount);
  return {
    title,
    description,
    keywords: [
      `${categoryGroup.category} resume template`,
      `${categoryGroup.category} job resume`,
      `how to write a ${categoryGroup.category} resume`,
      `${categoryGroup.category} AI resume`,
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
            <Link href="/" className="hover:text-violet-600 transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/templates" className="hover:text-violet-600 transition-colors">Resume Templates</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600 font-medium">{categoryGroup.category} Resume Templates</span>
          </nav>
          <section className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8 lg:p-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-50 text-violet-600 rounded-full text-sm font-semibold">
              <Layers3 className="w-4 h-4" />
              {categoryGroup.category} Role Directory
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mt-5">
              {categoryGroup.category} Resume Templates & Role Directory
            </h1>
            <p className="text-base md:text-lg text-slate-500 mt-4 max-w-3xl leading-relaxed">
              {createPageDescription(categoryGroup.category, categoryGroup.roleCount)}
            </p>
            <p className="text-sm md:text-base text-slate-600 mt-4 max-w-3xl leading-relaxed">
              {createCategorySummary(categoryGroup.category, categoryGroup.industries)}
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Link href="/ai" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-violet-600 text-white font-semibold shadow-lg shadow-violet-500/20 hover:bg-violet-700 transition-colors">
                AI Resume Generator
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/templates" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-slate-700 font-semibold border border-slate-200 hover:border-violet-200 hover:text-violet-600 transition-colors">
                Back to Templates
              </Link>
            </div>
          </section>
          <section className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-6">
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-2 text-slate-900">
                <BriefcaseBusiness className="w-5 h-5 text-violet-500" />
                <h2 className="text-2xl font-extrabold">Browsing Tips</h2>
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
              <h2 className="text-2xl font-extrabold text-slate-900">Related Role Templates</h2>
              <p className="text-sm text-slate-500 mt-2">This category covers {categoryGroup.roleCount} roles. Visit specific role pages for templates, writing tips, and application optimization.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {categoryGroup.roles.map((role: TemplateRoleRecord) => (
                  <Link key={role.slug} href={`/templates/${role.slug}`} className="group rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-violet-200 hover:shadow-sm transition-all p-5">
                    <div className="text-xs font-semibold text-violet-600">{role.industry}</div>
                    <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-violet-600 transition-colors">{role.role} Resume</h3>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">
                      View recommended templates, key highlights, and keyword suggestions for {role.role}.
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
          <section className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
            <h2 className="text-2xl font-extrabold text-slate-900">Related Categories</h2>
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
