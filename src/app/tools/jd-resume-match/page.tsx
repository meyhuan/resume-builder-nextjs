import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Link from 'next/link';
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
    question: '会直接改我的简历吗？',
    answer: '不会。这里只检查关键词覆盖。若要按职位描述改简历，登录后打开电脑编辑器顶栏的「岗位匹配」。',
  },
  {
    question: '匹配分等于通过率吗？',
    answer: '不是。这只是关键词覆盖的粗略参考，真实筛选还会看经历、项目质量和岗位竞争情况。',
  },
  {
    question: '什么时候用？',
    answer: '投递前检查 JD 有没有写进简历，或同一份简历要投多个岗位时，先看缺了哪些词。',
  },
];

export default function JdResumeMatchPage(): ReactElement {
  const appSchema = {
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
            <span className="text-slate-600">JD 匹配</span>
          </p>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
            检查简历和岗位 JD 的关键词覆盖
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            只做分析，不改简历。BOSS 直聘复制不了时，可把职位详情截图粘贴进来。要按 JD 改内容，登录后用编辑器里的「岗位匹配」。
            <Link href="/dashboard" className="ml-1 text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-violet-700">
              打开我的简历
            </Link>
          </p>

          <div className="mt-8">
            <JdMatchTool />
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
