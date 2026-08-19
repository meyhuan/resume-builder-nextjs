import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
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
    answer: '登录后可在本页历史、电脑编辑器顶栏「面试准备」，以及「我的简历」卡片上回看。换设备看不到，因为结果保存在当前浏览器。',
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

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <LandingHeader forceSolid />

      <main className="flex-grow pt-24 pb-16">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
          <p className="text-sm text-slate-400">
            <Link href="/" className="hover:text-slate-600">首页</Link>
            <span className="px-1.5">/</span>
            <span className="text-slate-600">面试准备</span>
          </p>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
            根据简历生成打招呼语和面试题
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            职位描述选填。点生成时再登录，结果保存在这台浏览器里。
            还没有简历？
            <Link href="/ai" className="ml-1 text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-violet-700">
              先生成一份
            </Link>
            <span className="text-slate-400"> 或 </span>
            <Link href="/import" className="text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-violet-700">
              导入已有简历
            </Link>
            。
          </p>

          <div className="mt-8">
            <InterviewPrepPageClient />
          </div>

          <dl className="mt-12 space-y-5 border-t border-slate-200 pt-8">
            {faqItems.map((item) => (
              <div key={item.question}>
                <dt className="text-sm font-medium text-slate-800">{item.question}</dt>
                <dd className="mt-1 text-sm leading-6 text-slate-500">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
