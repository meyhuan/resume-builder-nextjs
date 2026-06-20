import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ChevronRight, ClipboardList, Sparkles } from 'lucide-react';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { JdMatchTool } from '@/components/seo/JdMatchTool';

const SITE_URL = 'https://aijianli.cn';
const PAGE_TITLE = 'JD匹配简历优化工具：提取岗位关键词并优化简历表达';
const PAGE_DESCRIPTION = '粘贴目标岗位 JD 和简历文本，快速查看岗位关键词覆盖、缺失关键词、匹配分和分模块优化建议，适合 AI 产品经理、AIGC 运营、RAG 工程师等岗位投递前检查。';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: ['JD匹配简历优化工具', 'ATS关键词检查', '简历匹配度分析', '岗位关键词提取', 'AI简历优化'],
  alternates: {
    canonical: `${SITE_URL}/tools/jd-resume-match`,
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${SITE_URL}/tools/jd-resume-match`,
    type: 'website',
  },
};

const faqItems = [
  {
    question: 'JD 匹配工具会直接改写我的简历吗？',
    answer: 'MVP 阶段不会直接改写原文，而是先给出匹配分、缺失关键词和分模块建议，避免在用户未确认的情况下虚构经历。',
  },
  {
    question: '匹配分是不是等于真实通过率？',
    answer: '不是。匹配分只是基于关键词覆盖的粗略参考，真实筛选还会看经历真实性、项目质量、学历背景、行业经验和岗位竞争情况。',
  },
  {
    question: '哪些岗位最适合先做 JD 匹配？',
    answer: 'AI 产品经理、AIGC 运营、提示词工程师、RAG 工程师、AI Agent 工程师等新职业岗位尤其适合，因为 JD 中的新关键词变化快。',
  },
];

export default function JdResumeMatchPage(): ReactElement {
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${SITE_URL}/tools/jd-resume-match`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
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
      { '@type': 'ListItem', position: 2, name: '求职工具', item: `${SITE_URL}/tools/jd-resume-match` },
      { '@type': 'ListItem', position: 3, name: PAGE_TITLE, item: `${SITE_URL}/tools/jd-resume-match` },
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
            <span className="text-slate-600 font-medium">JD 匹配工具</span>
          </nav>

          <section className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-violet-100 rounded-full shadow-sm">
                <ClipboardList className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-semibold text-violet-600">JD 匹配简历优化</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                粘贴 JD，找出简历里
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500"> 缺失的岗位关键词</span>
              </h1>
              <p className="text-base md:text-lg text-slate-500 leading-relaxed max-w-3xl">
                先做分析，再做改写。这个工具会提取目标岗位关键词，检查你的简历是否覆盖，并给出分模块优化建议。
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/ai" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-violet-600 text-white font-semibold shadow-lg shadow-violet-500/20 hover:bg-violet-700 transition-colors">
                  用 AI 生成新简历
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/templates" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-slate-700 font-semibold border border-slate-200 hover:border-violet-200 hover:text-violet-600 transition-colors">
                  选择岗位模板
                </Link>
              </div>
            </div>

            <aside className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-violet-600 font-bold">
                <Sparkles className="w-5 h-5" />
                适合什么时候用
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>· 投递前检查 JD 关键词覆盖。</li>
                <li>· 同一份简历要投多个岗位。</li>
                <li>· 不确定项目经历该怎么调整优先级。</li>
              </ul>
            </aside>
          </section>

          <div className="mt-10">
            <JdMatchTool />
          </div>

          <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
            {faqItems.map((item) => (
              <article key={item.question} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="font-bold text-slate-900">{item.question}</h2>
                    <p className="text-sm leading-6 text-slate-600 mt-2">{item.answer}</p>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
