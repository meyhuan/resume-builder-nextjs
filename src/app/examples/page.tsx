import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { getAllResumeExamples } from '@/lib/examples/resume-examples';

const SITE_URL = 'https://aijianli.cn';
const PAGE_TITLE = 'AI 新职业简历范文库 - 项目经历、技能关键词与模板参考';
const PAGE_DESCRIPTION = '精选 AI 产品经理、AIGC 运营、提示词工程师、RAG 工程师、AI Agent 工程师等新职业简历范文，帮助你快速参考项目经历写法和岗位关键词。';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: ['AI简历范文', 'AI产品经理简历范文', 'AIGC运营简历范文', '提示词工程师简历范文', 'RAG工程师简历范文', '简历范文'],
  alternates: {
    canonical: `${SITE_URL}/examples`,
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${SITE_URL}/examples`,
    type: 'website',
  },
};

export default function ExamplesPage(): ReactElement {
  const examples = getAllResumeExamples();
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${SITE_URL}/examples`,
    isPartOf: { '@type': 'WebSite', name: '智简简历', url: SITE_URL },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: examples.map((example, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: example.title,
        url: `${SITE_URL}/examples/${example.slug}`,
      })),
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <LandingHeader forceSolid />

      <main className="flex-grow pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <section>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
              简历范文
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              模板解决排版，范文解决内容。优先整理 AI 产品经理、AIGC 运营、提示词工程师、RAG 工程师等新职业的匿名示例。
              <Link href="/ai" className="ml-1 text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-violet-700">
                生成我的简历
              </Link>
              <span className="text-slate-400"> · </span>
              <Link href="/templates" className="text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-violet-700">
                看岗位模板
              </Link>
            </p>
          </section>

          <section className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {examples.map((example) => (
              <Link
                key={example.slug}
                href={`/examples/${example.slug}`}
                className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300"
              >
                <span className="text-xs text-slate-500">{example.role}</span>
                <h2 className="mt-2 text-base font-semibold text-slate-900 group-hover:text-violet-700">
                  {example.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
                  {example.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                  {example.keywords.slice(0, 3).map((keyword) => (
                    <span key={keyword} className="rounded-md bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
                      {keyword}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
