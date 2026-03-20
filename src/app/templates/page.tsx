import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, Sparkles } from 'lucide-react';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { templateCatalog } from '@/lib/templates/template-catalog';
import { templateRoleData } from '@/lib/templates/template-role-data';

const SITE_URL: string = 'https://airesumepass.com';
const PAGE_TITLE: string = 'Free Resume Template Center - AI Resume Generator & Online Builder';
const PAGE_DESCRIPTION: string = 'Professional resume templates for various roles including developers, product managers, marketers, designers, and more. Free AI-powered resume builder with one-click generation and PDF export.';

type JsonLdPrimitive = string | number | boolean;

type JsonLdNode = {
  [key: string]: JsonLdPrimitive | JsonLdNode | JsonLdNode[] | JsonLdPrimitive[] | undefined;
};

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: ['resume template', 'free resume template', 'free online resume builder', 'AI resume', 'product manager resume', 'developer resume', 'professional resume builder', 'free PDF export', 'AI Resume Pass'],
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
  return `${roleCount} role templates`;
}

function createBreadcrumbSchema(): JsonLdNode {
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
      name: 'AI Resume Pass',
      url: SITE_URL,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: roleCount,
      itemListElement: templateRoleData.getFeaturedTemplateRoles(18).map((role, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: `${role.role} Resume Template`,
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
              <span className="text-sm font-semibold text-violet-600">Resume Template Center</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              Find the Perfect
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500"> Resume Template</span> for Your Role
            </h1>
            <p className="text-base md:text-lg text-slate-500 max-w-3xl mx-auto leading-relaxed">
              Browse templates tailored for developers, product managers, marketers, designers, HR professionals and more — with writing tips, key highlights, and AI generation paths for each role.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/ai" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-violet-600 text-white font-semibold shadow-lg shadow-violet-500/20 hover:bg-violet-700 transition-colors">
                AI Resume Generator
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/#templates" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-slate-700 font-semibold border border-slate-200 hover:border-violet-200 hover:text-violet-600 transition-colors">
                Browse Featured Templates
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
                <h2 className="text-2xl font-extrabold text-slate-900">Popular Roles</h2>
                <p className="text-sm text-slate-500 mt-2">Top roles in tech, product, operations, design, and more.</p>
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
                  <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-violet-600 transition-colors">{role.role} Resume</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">
                    View templates, key highlights, common mistakes, and AI generation for {role.role}.
                  </p>
                </Link>
              ))}
            </div>
          </section>
          <section className="rounded-3xl bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 border border-violet-100 shadow-sm p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Emerging Roles</h2>
                <p className="text-sm text-slate-500 mt-2">AI, data, growth, e-commerce, experience design — rising roles with growing demand.</p>
              </div>
              <div className="text-sm font-medium text-violet-600">Great for exploring new career opportunities</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {emergingRoles.map((role) => (
                <Link key={role.slug} href={`/templates/${role.slug}`} className="group rounded-2xl border border-violet-100 bg-white/90 hover:bg-white hover:border-violet-200 hover:shadow-sm transition-all p-5">
                  <div className="text-xs font-semibold text-violet-600">{role.industry} / {role.category}</div>
                  <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-violet-600 transition-colors">{role.role} Resume</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">
                    View recommended templates, keyword suggestions, and optimization tips for {role.role}.
                  </p>
                </Link>
              ))}
            </div>
          </section>
          <section className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Browse by Category</h2>
                <p className="text-sm text-slate-500 mt-2">Start with a broad category like Engineering, Product, Operations, or Design, then narrow down to specific roles.</p>
              </div>
              <div className="text-sm font-medium text-violet-600">Great for narrowing down your target role</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categoryGroups.map((group) => (
                <Link key={group.slug} href={`/templates/category/${group.slug}`} className="group rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-violet-200 hover:shadow-sm transition-all p-5">
                  <div className="text-xs font-semibold text-violet-600">{group.roleCount} roles</div>
                  <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-violet-600 transition-colors">{group.category} Resumes</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">
                    {group.category} role templates across {group.industries.slice(0, 2).join(', ')} and more.
                  </p>
                </Link>
              ))}
            </div>
          </section>
          <section className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white shadow-sm p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Browse by Industry</h2>
                <p className="text-sm text-slate-500 mt-2">Explore templates organized by industry — Tech, Advertising & Design, Finance, and more.</p>
              </div>
              <div className="text-sm font-medium text-violet-600">Great for targeting a specific industry</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {industryGroups.map((group) => (
                <Link key={group.slug} href={`/templates/industry/${group.slug}`} className="group rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-violet-200 hover:shadow-sm transition-all p-5">
                  <div className="text-xs font-semibold text-violet-600">{group.roleCount} roles</div>
                  <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-violet-600 transition-colors">{group.industry} Resumes</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">
                    Includes {group.categories.slice(0, 3).join(', ')} and more role templates.
                  </p>
                </Link>
              ))}
            </div>
          </section>
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Browse by Industry</h2>
              <p className="text-sm text-slate-500 mt-2">Filter by industry first, then explore specific roles for template recommendations and writing tips.</p>
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
