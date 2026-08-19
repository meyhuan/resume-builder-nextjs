import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <LandingHeader forceSolid />

      <main className="flex-grow pt-24 pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-slate-400">
            <Link href="/" className="hover:text-slate-600">首页</Link>
            <span className="px-1.5">/</span>
            <Link href="/examples" className="hover:text-slate-600">简历范文库</Link>
            <span className="px-1.5">/</span>
            <span className="text-slate-600">{example.role}</span>
          </p>

          <article className="mt-6 grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="min-w-0">
              <p className="text-sm text-slate-500">{example.role}范文 · {example.updatedAt}</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
                {example.title}
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">{example.description}</p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {example.keywords.join('、')}
              </p>

              <section className="mt-8">
                <h2 className="text-base font-semibold text-slate-900">匿名示例简历</h2>
                <div className="article-prose mt-3" dangerouslySetInnerHTML={{ __html: example.sampleResumeHtml }} />
              </section>

              <section className="mt-10">
                <h2 className="text-base font-semibold text-slate-900">写作建议</h2>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                  {example.writingTips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </section>

              <section className="mt-10">
                <h2 className="text-base font-semibold text-slate-900">常见错误</h2>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                  {example.commonMistakes.map((mistake) => (
                    <li key={mistake}>{mistake}</li>
                  ))}
                </ul>
              </section>

              <dl className="mt-12 space-y-5 border-t border-slate-200 pt-8">
                {example.faq.map((item) => (
                  <div key={item.question}>
                    <dt className="text-sm font-medium text-slate-800">{item.question}</dt>
                    <dd className="mt-1 text-sm leading-6 text-slate-500">{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <aside className="space-y-8 lg:sticky lg:top-28">
              <section>
                <h2 className="text-sm font-medium text-slate-800">适合人群</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  {example.audience.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h2 className="text-sm font-medium text-slate-800">下一步</h2>
                <div className="mt-3 space-y-3">
                  <Button asChild className="bg-violet-600 text-white hover:bg-violet-700">
                    <Link href="/ai">生成我的简历</Link>
                  </Button>
                  {example.relatedTemplateSlugs.map((templateSlug) => (
                    <Link
                      key={templateSlug}
                      href={`/templates/${templateSlug}`}
                      className="block text-sm text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-violet-700"
                    >
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
