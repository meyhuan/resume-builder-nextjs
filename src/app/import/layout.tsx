import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'AI 文本转简历 - 粘贴文本自动生成专业简历 | 智简简历',
  description:
    '粘贴任意简历文本内容，AI 自动解析结构并应用专业排版模板，一键免费导出高清 PDF。支持豆包、通义千问、ChatGPT、DeepSeek、Kimi 等 AI 工具生成的内容。',
  alternates: {
    canonical: 'https://aijianli.cn/import',
  },
  keywords: [
    'AI简历排版', '简历排版工具', '文本转简历', '简历格式化',
    '豆包简历排版', 'ChatGPT简历排版', 'DeepSeek简历', 'Kimi简历',
    '在线简历排版', 'AI简历转PDF', '免费简历排版', '一键简历排版',
  ],
};

export default function ImportLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
