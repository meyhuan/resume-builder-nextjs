import type { ReactElement } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
  const primaryCta = page.ctas[0];
  const secondaryCtas = page.ctas.slice(1);
  const schemas = [
    createArticleSchema(page),
    createFaqSchema(page),
    createItemListSchema(page),
    createBreadcrumbSchema(page),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <LandingHeader forceSolid />

      <main className="flex-grow pt-24 pb-16">
        <article className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <p className="text-sm text-slate-400">
            <Link href="/" className="hover:text-slate-600">首页</Link>
            <span className="px-1.5">/</span>
            <span className="text-slate-600">{page.eyebrow}</span>
          </p>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
            {page.title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-700">{page.directAnswer}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{page.description}</p>
          <p className="mt-2 text-xs text-slate-400">更新日期：{page.updatedAt}</p>

          {primaryCta ? (
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Button asChild className="bg-violet-600 text-white hover:bg-violet-700">
                <Link href={primaryCta.href}>{primaryCta.label}</Link>
              </Button>
              {secondaryCtas.map((cta) => (
                <Link
                  key={cta.href}
                  href={cta.href}
                  className="text-sm text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-violet-700"
                >
                  {cta.label}
                </Link>
              ))}
            </div>
          ) : null}

          {page.audience.length > 0 ? (
            <p className="mt-8 text-sm leading-6 text-slate-500">
              <span className="font-medium text-slate-800">适合谁：</span>
              {page.audience.join('；')}
            </p>
          ) : null}

          <section className="mt-10 space-y-8">
            {page.sections.map((section) => (
              <div key={section.heading}>
                <h2 className="text-base font-semibold text-slate-900">{section.heading}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{section.body}</p>
              </div>
            ))}
          </section>

          {page.comparisonItems && page.comparisonItems.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-base font-semibold text-slate-900">对比表</h2>
              <div className="mt-3 overflow-x-auto rounded-md border border-slate-200 bg-white">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      {comparisonColumns.map((column) => (
                        <th key={column} className="px-4 py-3 font-medium">{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {page.comparisonItems.map((item, index) => (
                      <tr key={index} className="bg-white align-top">
                        {comparisonColumns.map((column) => (
                          <td key={column} className="px-4 py-3 leading-6 text-slate-600">
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

          {page.faq.length > 0 ? (
            <dl className="mt-12 space-y-5 border-t border-slate-200 pt-8">
              {page.faq.map((item) => (
                <div key={item.question}>
                  <dt className="text-sm font-medium text-slate-800">{item.question}</dt>
                  <dd className="mt-1 text-sm leading-6 text-slate-500">{item.answer}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {page.relatedLinks.length > 0 ? (
            <section className="mt-12 border-t border-slate-200 pt-8">
              <h2 className="text-sm font-medium text-slate-800">继续查看</h2>
              <ul className="mt-3 space-y-2">
                {page.relatedLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-violet-700">
                      {link.label}
                    </Link>
                    {link.description ? (
                      <span className="mt-0.5 block text-sm leading-6 text-slate-500">{link.description}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </article>
      </main>

      <LandingFooter />
    </div>
  );
}
