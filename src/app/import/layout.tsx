import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'AI 文本转简历 - 粘贴 DeepSeek/豆包/ChatGPT 文本一键生成标准 A4 简历 | 智简简历',
  description:
    '已用 DeepSeek、豆包、ChatGPT 或 Kimi 生成了简历内容？直接粘贴任意文本，AI 自动解析经历结构并套用 HR 严选 A4 模板排版，支持 Word (.docx) 与无水印高清 PDF 导出。',
  alternates: {
    canonical: 'https://aijianli.cn/import',
  },
  keywords: [
    'AI简历排版', '简历排版工具', '文本转简历', '简历格式化',
    'DeepSeek写简历排版', '豆包简历排版', 'ChatGPT简历排版', 'Kimi简历',
    '在线简历排版', 'AI简历转PDF', 'AI简历转Word', '可编辑Word简历', '免费简历排版', '一键简历排版',
  ],
};

export default function ImportLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
