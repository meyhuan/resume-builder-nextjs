import type { Metadata } from "next";
import "@/styles/tailwind.css";
import "@/styles/print.css";
import "@/styles/base.css";
import "@/styles/theme-override.css";
import "@/styles/resume-editor-interactions.css";
import { Toaster } from "sonner";
import { BaiduAnalytics } from "@/components/analytics/BaiduAnalytics";
import { AnalyticsErrorTracking } from "@/components/analytics/AnalyticsErrorTracking";
import { AnalyticsPageViewTracking } from "@/components/analytics/AnalyticsPageViewTracking";
import { FeedbackWidget } from "@/features/feedback/feedback-widget";
import { InstallRequestLogger } from "@/features/feedback/install-request-logger";
import { buildResumeFontFaceCss } from "@/entities/theme/font-stacks";

const SITE_URL = "https://aijianli.cn";
const SITE_NAME = "智简简历";
const SITE_TITLE = `${SITE_NAME} - AI简历生成器，免费在线制作，无水印导出Word/PDF`;
const SITE_DESCRIPTION =
  "智简简历（aijianli.cn）是一款 AI 简历生成器：选择身份和目标岗位，AI 帮你写出简历初稿，在线编辑排版后，可免费导出可编辑的 Word 或高清 PDF，无水印。支持 JD 匹配和面试准备，电脑和微信小程序都能用。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "AI简历",
    "免费简历",
    "简历制作网站免费",
    "在线简历制作",
    "无水印简历",
    "可导出Word简历",
    "Word简历模板",
    "Word简历免费下载",
    "DOCX简历模板",
    "简历转Word",
    "PDF简历导出",
    "一页纸简历排版",
    "DeepSeek写简历",
    "DeepSeek简历",
    "AI求职助手",
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
    "免费制作一份可投递简历",
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
    "岗位匹配",
    "简历翻译",
    "面试准备",
    "BOSS打招呼",
    "简历语法检查",
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
    title: SITE_TITLE,
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
    title: SITE_TITLE,
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
    operatingSystem: "Web, WeChat Mini Program",
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
