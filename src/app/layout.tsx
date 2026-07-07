import type { Metadata } from "next";
import "@/styles/tailwind.css";
import "@/styles/print.css";
import "@/styles/base.css";
import "@/styles/theme-override.css";
import { Toaster } from "sonner";
import { BaiduAnalytics } from "@/components/analytics/BaiduAnalytics";
import { AnalyticsErrorTracking } from "@/components/analytics/AnalyticsErrorTracking";
import { AnalyticsPageViewTracking } from "@/components/analytics/AnalyticsPageViewTracking";
import { FeedbackWidget } from "@/features/feedback/feedback-widget";
import { InstallRequestLogger } from "@/features/feedback/install-request-logger";
import { buildResumeFontFaceCss } from "@/entities/theme/font-stacks";

const SITE_URL = "https://aijianli.cn";
const SITE_NAME = "智简简历";
const SITE_DESCRIPTION =
  "智简简历是可免费开始使用的AI简历生成器与在线制作网站。提供极简简历模板，支持AI智能一键生成与润色优化，帮你免费做出一份可投递简历，并可在免费额度内导出高清PDF。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - AI简历生成器 | 免费在线简历制作网站 · 极简简历模板导出PDF`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "AI简历",
    "免费简历",
    "简历制作网站免费",
    "在线简历制作",
    "极简简历",
    "简历生成器",
    "免费在线简历制作",
    "简历制作工具",
    "一键生成简历",
    "AI简历制作",
    "AI智能简历制作",
    "免费简历模板",
    "简历模板PDF下载",
    "智简简历",
    "全民简历",
    "超级简历平替",
    "英文简历",
    "英文简历模板",
    "中英文简历模板",
    "应届生简历",
    "校招简历",
    "社招简历",
    "产品经理简历",
    "在线简历免费制作导出",
    "AI写简历",
    "简历优化",
    "简历修改润色",
    "简历排版",
    "免费做出一份可投递简历",
    "Markdown简历",
    "免费制作可投递简历",
    "在线简历制作",
    "AI简历姬",
    "简历自动生成",
    "求职工具",
    "免费AI简历生成器",
    "AI简历生成器",
    "AI简历优化",
    "简历润色",
    "旧简历优化",
    "JD简历匹配",
    "ATS友好简历",
    "PDF简历模板",
    "个人简历模板",
    "大学生简历模板",
    "校招简历模板",
    "零经验简历",
    "Java开发简历模板",
    "前端开发简历模板",
    "运营简历模板",
    "行政简历模板",
    "会计简历模板",
    "AI产品经理简历模板",
    "AIGC运营简历模板",
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
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} - 免费 AI 简历制作工具`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - 免费 AI 简历制作工具`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - 免费 AI 简历制作工具`,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  verification: {
    // Add your verification codes here when ready
    google: "cVe-KetUGJvP2TVefybZxWIy3YUxXXqQiiGErncNY9M",
    other: {
      "baidu-site-verification": "codeva-182X8kpQVu",
      "msvalidate.01": ["35C8C4B7C0CCF7E6A6D7B7F2477D48E0"],
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
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "CNY",
    },
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  };

  return (
    <html lang="zh-CN">
      <body className="antialiased text-slate-900 bg-white font-sans">
        <style dangerouslySetInnerHTML={{ __html: buildResumeFontFaceCss() }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <InstallRequestLogger />
        <AnalyticsPageViewTracking />
        <AnalyticsErrorTracking />
        <FeedbackWidget />
        {/* Toast position: bottom-center on mobile (avoid covering top-bar back button),
            top-center on desktop (traditional). */}
        <Toaster
          position="bottom-center"
          richColors
          mobileOffset={{ bottom: "96px" }}
        />
        <BaiduAnalytics />
      </body>
    </html>
  );
}
