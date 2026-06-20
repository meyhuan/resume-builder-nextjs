import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BookOpen, Calendar, CheckCircle2, ChevronRight, HelpCircle, Tags, TriangleAlert } from 'lucide-react';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { getAllResumeExamples, getResumeExampleBySlug } from '@/lib/examples/resume-examples';
import '@/styles/article-prose.css';

const SITE_URL = 'https://aijianli.cn';

type ExamplePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return getAllResumeExamples().map((example) => ({ slug: example.slug }));
}

export async function generateMetadata({ params }: ExamplePageProps): Promise<Metadata> {
  const { slug } = await params;
  const example = getResumeExampleBySlug(slug);
  if (!example) {
    return { title: '简历范文未找到' };
  }
  return {
    title: example.title,
    description: example.description,
    keywords: [...example.keywords, '智简简历', 'AI简历范文'],
    alternates: {
      canonical: `${SITE_URL}/examples/${example.slug}`,
    },
    openGraph: {
      title: example.title,
      description: example.description,
      url: `${SITE_URL}/examples/${example.slug}`,
      type: 'article',
    },
  };
}

export default async function ExampleDetailPage({ params }: ExamplePageProps): Promise<ReactElement> {
  const { slug } = await params;
  const example = getResumeExampleBySlug(slug);
  if (!example) {
    notFound();
  }

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: example.title,
    description: example.description,
    datePublished: example.updatedAt,
    dateModified: example.updatedAt,
    author: { '@type': 'Organization', name: '智简简历', url: SITE_URL },
    publisher: { '@type': 'Organization', name: '智简简历', url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/examples/${example.slug}`,
    keywords: example.keywords.join(', '),
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: example.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: '简历范文库', item: `${SITE_URL}/examples` },
      { '@type': 'ListItem', position: 3, name: example.title, item: `${SITE_URL}/examples/${example.slug}` },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] selection:bg-fuchsia-200">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <LandingHeader forceSolid />

      <main className="flex-grow pt-32 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-8 flex-wrap">
            <Link href="/" className="hover:text-violet-600 transition-colors">首页</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/examples" className="hover:text-violet-600 transition-colors">简历范文库</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600 font-medium">{example.role}</span>
          </nav>

          <article className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
            <div className="min-w-0">
              <header className="mb-8">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-600">
                    <BookOpen className="w-3.5 h-3.5" />
                    {example.role}范文
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {example.updatedAt}
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">
                  {example.title}
                </h1>
                <p className="text-base text-slate-500 leading-relaxed mt-4">{example.description}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {example.keywords.map((keyword) => (
                    <span key={keyword} className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs text-slate-500 border border-slate-100">
                      <Tags className="w-3 h-3" />
                      {keyword}
                    </span>
                  ))}
                </div>
              </header>

              <section className="rounded-2xl border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
                <h2 className="text-2xl font-extrabold text-slate-900 mb-5">匿名示例简历</h2>
                <div className="article-prose" dangerouslySetInnerHTML={{ __html: example.sampleResumeHtml }} />
              </section>

              <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2 font-extrabold text-slate-900">
                    <CheckCircle2 className="w-5 h-5 text-violet-500" />
                    写作建议
                  </div>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                    {example.writingTips.map((tip) => (
                      <li key={tip}>· {tip}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6">
                  <div className="flex items-center gap-2 font-extrabold text-slate-900">
                    <TriangleAlert className="w-5 h-5 text-amber-500" />
                    常见错误
                  </div>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                    {example.commonMistakes.map((mistake) => (
                      <li key={mistake}>· {mistake}</li>
                    ))}
                  </ul>
                </div>
              </section>

              <section className="mt-8 rounded-2xl border border-slate-100 bg-white p-6 md:p-8 shadow-sm">
                <div className="flex items-center gap-2 text-slate-900">
                  <HelpCircle className="w-5 h-5 text-violet-500" />
                  <h2 className="text-2xl font-extrabold">常见问题</h2>
                </div>
                <div className="mt-6 space-y-5">
                  {example.faq.map((item) => (
                    <div key={item.question} className="border-b border-slate-100 pb-5 last:border-b-0 last:pb-0">
                      <h3 className="font-bold text-slate-900">{item.question}</h3>
                      <p className="text-sm leading-7 text-slate-600 mt-2">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-5 lg:sticky lg:top-28">
              <section className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
                <h2 className="font-extrabold text-slate-900">适合人群</h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                  {example.audience.map((item) => (
                    <li key={item}>· {item}</li>
                  ))}
                </ul>
              </section>
              <section className="rounded-2xl border border-violet-100 bg-violet-50 p-6">
                <h2 className="font-extrabold text-slate-900">下一步</h2>
                <div className="mt-4 space-y-3">
                  <Link href="/ai" className="flex items-center justify-between rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700 transition-colors">
                    用 AI 生成我的简历
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  {example.relatedTemplateSlugs.map((templateSlug) => (
                    <Link key={templateSlug} href={`/templates/${templateSlug}`} className="block rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:text-violet-600 transition-colors">
                      {templateSlug}简历模板
                    </Link>
                  ))}
                </div>
              </section>
            </aside>
          </article>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
