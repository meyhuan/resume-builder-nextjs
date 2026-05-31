import type { Metadata } from "next";
import "@/styles/tailwind.css";
import "@/styles/print.css";
import "@/styles/base.css";
import "@/styles/theme-override.css";
import { Toaster } from 'sonner';
import { BaiduAnalytics } from '@/components/analytics/BaiduAnalytics';
import { AnalyticsErrorTracking } from '@/components/analytics/AnalyticsErrorTracking';
import { FeedbackWidget } from '@/features/feedback/feedback-widget';
import { InstallRequestLogger } from '@/features/feedback/install-request-logger';

const SITE_URL = 'https://aijianli.cn';
const SITE_NAME = '智简简历';
const SITE_DESCRIPTION = '智简简历是完全免费的AI简历生成器与在线制作网站。提供极简简历模板，支持AI智能一键生成与润色优化，支持高清免费导出PDF与Markdown。无水印、无套路，是应届生、产品经理及各行业求职者的必备极简简历工具，也是超级简历等平台的完美免费平替。';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - AI简历生成器 | 免费在线简历制作网站 · 极简简历模板导出PDF`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'AI简历', '免费简历', '简历制作网站免费', '在线简历制作', '极简简历',
    '简历生成器', 'AI简历制作', '免费简历模板', '简历模板PDF下载', '智简简历',
    '全民简历', '超级简历平替', '英文简历', '应届生简历', '产品经理简历',
    '在线简历免费制作导出', 'AI写简历', '简历优化', '免费导出PDF', 'Markdown简历',
    '完全免费', '在线简历制作', 'AI简历姬', '简历自动生成', '求职工具'
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} - 免费 AI 简历制作工具`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - 免费 AI 简历制作工具`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} - 免费 AI 简历制作工具`,
    description: SITE_DESCRIPTION,
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  verification: {
    // Add your verification codes here when ready
    google: 'cVe-KetUGJvP2TVefybZxWIy3YUxXXqQiiGErncNY9M',
    other: {
      'baidu-site-verification': 'codeva-182X8kpQVu',
      'msvalidate.01': ['35C8C4B7C0CCF7E6A6D7B7F2477D48E0']
     },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // JSON-LD 结构化数据，有助于百度和必应在搜索结果中展示更丰富的卡片（如软件评分、免费标签）
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": SITE_NAME,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "CNY"
    },
    "description": SITE_DESCRIPTION,
    "url": SITE_URL
  };

  return (
    <html lang="zh-CN">
      <body className="antialiased text-slate-900 bg-white font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <InstallRequestLogger />
        <AnalyticsErrorTracking />
        <FeedbackWidget />
        {/* Toast position: bottom-center on mobile (avoid covering top-bar back button),
            top-center on desktop (traditional). */}
        <Toaster position="bottom-center" richColors mobileOffset={{ bottom: '96px' }} />
        <BaiduAnalytics />
      </body>
    </html>
  );
}
