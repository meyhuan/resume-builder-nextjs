import type { ReactElement } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ChevronRight, HelpCircle, ListChecks, Sparkles } from 'lucide-react';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHeader } from '@/components/landing/LandingHeader';
import type { AeoPage } from '@/lib/seo/aeo-pages';

const SITE_URL = 'https://aijianli.cn';

type JsonLdPrimitive = string | number | boolean;

type JsonLdNode = {
  [key: string]: JsonLdPrimitive | JsonLdNode | JsonLdNode[] | JsonLdPrimitive[] | undefined;
};

type AeoContentPageProps = {
  readonly page: AeoPage;
};

function createArticleSchema(page: AeoPage): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    description: page.description,
    datePublished: page.updatedAt,
    dateModified: page.updatedAt,
    author: { '@type': 'Organization', name: '智简简历', url: SITE_URL },
    publisher: { '@type': 'Organization', name: '智简简历', url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}${page.path}`,
    keywords: page.keywords.join(', '),
  };
}

function createFaqSchema(page: AeoPage): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

function createItemListSchema(page: AeoPage): JsonLdNode {
  const items = page.comparisonItems ?? page.relatedLinks;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: page.title,
    itemListElement: items.map((item, index) => {
      const itemName = 'label' in item ? item.label : Object.values(item)[0];
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: itemName,
      };
    }),
  };
}

function createBreadcrumbSchema(page: AeoPage): JsonLdNode {
  const sectionName = page.path.startsWith('/compare') ? '工具对比' : page.path.startsWith('/tools') ? '求职工具' : '答案中心';
  const sectionPath = page.path.split('/').slice(0, 2).join('/');
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: sectionName, item: `${SITE_URL}${sectionPath}` },
      { '@type': 'ListItem', position: 3, name: page.title, item: `${SITE_URL}${page.path}` },
    ],
  };
}

function getComparisonColumns(page: AeoPage): string[] {
  return page.comparisonItems?.[0] ? Object.keys(page.comparisonItems[0]) : [];
}

export function AeoContentPage({ page }: AeoContentPageProps): ReactElement {
  const comparisonColumns = getComparisonColumns(page);
  const schemas = [
    createArticleSchema(page),
    createFaqSchema(page),
    createItemListSchema(page),
    createBreadcrumbSchema(page),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] selection:bg-fuchsia-200">
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <LandingHeader forceSolid />

      <main className="flex-grow pt-32 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-8 flex-wrap">
            <Link href="/" className="hover:text-violet-600 transition-colors">首页</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600 font-medium">{page.eyebrow}</span>
          </nav>

          <section className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-violet-100 rounded-full shadow-sm">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-semibold text-violet-600">{page.eyebrow}</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {page.title}
              </h1>
              <p className="text-base md:text-lg text-slate-500 leading-relaxed max-w-3xl">
                {page.description}
              </p>
              <div className="flex flex-wrap gap-3">
                {page.ctas.map((cta, index) => (
                  <Link
                    key={cta.href}
                    href={cta.href}
                    className={index === 0
                      ? 'inline-flex items-center gap-2 px-5 py-3 rounded-full bg-violet-600 text-white font-semibold shadow-lg shadow-violet-500/20 hover:bg-violet-700 transition-colors'
                      : 'inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-slate-700 font-semibold border border-slate-200 hover:border-violet-200 hover:text-violet-600 transition-colors'}
                  >
                    {cta.label}
                    {index === 0 ? <ArrowRight className="w-4 h-4" /> : null}
                  </Link>
                ))}
              </div>
            </div>

            <aside className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-violet-600 font-bold">
                <CheckCircle2 className="w-5 h-5" />
                直接结论
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">{page.directAnswer}</p>
              <div className="mt-5 text-xs text-slate-400">更新日期：{page.updatedAt}</div>
            </aside>
          </section>

          <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            {page.audience.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-600 leading-relaxed">{item}</p>
                </div>
              </div>
            ))}
          </section>

          <section className="mt-10 rounded-2xl border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900">
              <ListChecks className="w-5 h-5 text-violet-500" />
              <h2 className="text-2xl font-extrabold">选择要点</h2>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
              {page.sections.map((section) => (
                <article key={section.heading} className="rounded-xl border border-slate-100 bg-slate-50 p-5">
                  <h3 className="font-bold text-slate-900">{section.heading}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{section.body}</p>
                </article>
              ))}
            </div>
          </section>

          {page.comparisonItems && page.comparisonItems.length > 0 ? (
            <section className="mt-10 rounded-2xl border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
              <h2 className="text-2xl font-extrabold text-slate-900">对比表</h2>
              <div className="mt-6 overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      {comparisonColumns.map((column) => (
                        <th key={column} className="px-4 py-3 font-semibold">{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {page.comparisonItems.map((item, index) => (
                      <tr key={index} className="bg-white align-top">
                        {comparisonColumns.map((column) => (
                          <td key={column} className="px-4 py-4 leading-6 text-slate-600">
                            {item[column]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-2 text-slate-900">
                <HelpCircle className="w-5 h-5 text-violet-500" />
                <h2 className="text-2xl font-extrabold">常见问题</h2>
              </div>
              <div className="mt-6 space-y-5">
                {page.faq.map((item) => (
                  <article key={item.question} className="border-b border-slate-100 pb-5 last:border-b-0 last:pb-0">
                    <h3 className="font-bold text-slate-900">{item.question}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{item.answer}</p>
                  </article>
                ))}
              </div>
            </div>

            <aside className="rounded-2xl border border-violet-100 bg-violet-50 p-6">
              <h2 className="font-extrabold text-slate-900">继续查看</h2>
              <div className="mt-4 space-y-3">
                {page.relatedLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="block rounded-xl bg-white p-4 hover:shadow-sm transition-shadow">
                    <div className="font-semibold text-slate-900">{link.label}</div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{link.description}</p>
                  </Link>
                ))}
              </div>
            </aside>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
