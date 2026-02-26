import type { Metadata } from "next";
import { Inter, Noto_Sans_SC } from "next/font/google";
import "@/styles/tailwind.css";
import "@/styles/print.css";
import "@/styles/base.css";
import "@/styles/theme-override.css";

const inter = Inter({ subsets: ["latin"] });
const notoSansSC = Noto_Sans_SC({ subsets: ["latin"], weight: ["400", "500", "700"] });

const SITE_URL = 'https://aijianli.cn';
const SITE_NAME = '智简简历';
const SITE_DESCRIPTION = '免费 AI 简历制作工具 —— 智能生成、可视化编辑、多格式导出。由独立开发者打造，永久免费，无水印，无付费墙。适合应届生、实习生、求职者。';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - 免费 AI 简历制作工具 | 智能生成 · 可视化编辑 · 多格式导出`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'AI简历', '免费简历', '简历制作', '简历模板', '智能简历',
    '在线简历', '简历生成器', '求职简历', '应届生简历', '实习简历',
    'AI简历生成', '简历排版', 'PDF简历', '免费简历模板', '智简简历',
    'aijianli', '简历编辑器', 'AI写简历', '简历优化', '求职工具',
    '豆包简历导入', 'ChatGPT简历', 'DeepSeek简历', '应届生AI简历',
    '零经验简历', '简历AI润色', '简历导入工具', 'ATS简历',
    '在校生简历', '转行简历', 'JD匹配简历', '免费PDF简历导出',
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
    // google: 'your-google-verification-code',
    // other: { 'baidu-site-verification': 'your-baidu-code' },
  },
};

import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} ${notoSansSC.className} antialiased`}>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
