import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, ChevronRight, Sparkles, Tags } from 'lucide-react';
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
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] selection:bg-fuchsia-200">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <LandingHeader forceSolid />

      <main className="flex-grow pt-32 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <section className="text-center space-y-5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-violet-100 rounded-full shadow-sm">
              <BookOpen className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-violet-600">AI 新职业范文库</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              看范文，知道
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500"> 简历该写什么</span>
            </h1>
            <p className="text-base md:text-lg text-slate-500 max-w-3xl mx-auto leading-relaxed">
              模板解决排版，范文解决内容。这里优先整理 AI 产品经理、AIGC 运营、提示词工程师、RAG 工程师等新职业的匿名简历示例。
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/ai" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-violet-600 text-white font-semibold shadow-lg shadow-violet-500/20 hover:bg-violet-700 transition-colors">
                用 AI 生成我的简历
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/templates" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-slate-700 font-semibold border border-slate-200 hover:border-violet-200 hover:text-violet-600 transition-colors">
                查看岗位模板
              </Link>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
            {examples.map((example) => (
              <Link
                key={example.slug}
                href={`/examples/${example.slug}`}
                className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-600">
                    <Sparkles className="w-3.5 h-3.5" />
                    {example.role}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 transition-colors" />
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 mt-4 group-hover:text-violet-600 transition-colors">
                  {example.title}
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed mt-3 flex-1">
                  {example.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-100">
                  {example.keywords.slice(0, 3).map((keyword) => (
                    <span key={keyword} className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-500">
                      <Tags className="w-3 h-3" />
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
