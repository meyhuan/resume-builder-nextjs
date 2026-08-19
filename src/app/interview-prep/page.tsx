import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ChevronRight, ClipboardList, Sparkles } from 'lucide-react';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { InterviewPrepPageClient } from '@/components/interview-prep/interview-prep-page-client';

const SITE_URL = 'https://aijianli.cn';
const PAGE_TITLE = '面试准备：BOSS打招呼、自我介绍和面试题';
const PAGE_DESCRIPTION = '根据简历生成 BOSS 打招呼语、30 秒/2 分钟自我介绍和常见面试题。未登录也能先填写职位描述，点生成再登录，结果保存在账号里，可在「我的简历」回看。';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: ['面试准备', 'BOSS打招呼', '自我介绍', '面试题', '求职信', '智简简历'],
  alternates: {
    canonical: `${SITE_URL}/interview-prep`,
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${SITE_URL}/interview-prep`,
    type: 'website',
  },
};

const faqItems = [
  {
    question: '没有登录可以先用吗？',
    answer: '可以。先填写职位描述（也可以留空），点生成时再微信登录。已填内容会保留，结果会按账号保存在这台浏览器里。',
  },
  {
    question: '一定要粘贴 JD 吗？',
    answer: '不是必须。没有 JD 时会按简历和求职意向做通用准备；贴上目标岗位 JD 后，打招呼语和面试题会更针对这个岗位。',
  },
  {
    question: '生成后去哪里回看？',
    answer: '登录后可在本页历史记录、电脑编辑器顶栏「面试准备」，以及「我的简历」卡片上的「查看面试准备」回看。换设备看不到，因为结果保存在当前浏览器。',
  },
];

export default function InterviewPrepPage(): ReactElement {
  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${SITE_URL}/interview-prep`,
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
      { '@type': 'ListItem', position: 2, name: '面试准备', item: `${SITE_URL}/interview-prep` },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] selection:bg-fuchsia-200">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <LandingHeader forceSolid />

      <main className="flex-grow pt-32 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-8 flex-wrap">
            <Link href="/" className="hover:text-violet-600 transition-colors">首页</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600 font-medium">面试准备</span>
          </nav>

          <section className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-violet-100 rounded-full shadow-sm">
                <ClipboardList className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-semibold text-violet-600">BOSS打招呼与面试准备</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                先写打招呼语，再准备
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500"> 面试题和自我介绍</span>
              </h1>
              <p className="text-base md:text-lg text-slate-500 leading-relaxed max-w-3xl">
                用你的简历生成 BOSS 打招呼、30 秒/2 分钟自我介绍和常见面试题。未登录也能先填职位描述，点生成再登录；结果保存在账号里，可在「我的简历」直接回看。
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/ai" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-violet-600 text-white font-semibold shadow-lg shadow-violet-500/20 hover:bg-violet-700 transition-colors">
                  还没有简历？AI 生成
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/import" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-slate-700 font-semibold border border-slate-200 hover:border-violet-200 hover:text-violet-600 transition-colors">
                  导入已有简历
                </Link>
                <Link href="/dashboard" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-slate-700 font-semibold border border-slate-200 hover:border-violet-200 hover:text-violet-600 transition-colors">
                  打开我的简历
                </Link>
              </div>
            </div>

            <aside className="rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-violet-600 font-bold">
                <Sparkles className="w-5 h-5" />
                一次会得到什么
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>· 3 条可复制的 BOSS 打招呼语</li>
                <li>· 30 秒和 2 分钟自我介绍</li>
                <li>· 8–12 道面试题和答题提示</li>
                <li>· 面试缺口提醒，求职信可折叠备用</li>
              </ul>
            </aside>
          </section>

          <div className="mt-10 max-w-3xl">
            <InterviewPrepPageClient />
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
