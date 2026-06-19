import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'AI 简历生成 - 根据身份和岗位智能定制 | 智简简历',
  description:
    '免费 AI 简历生成工具：根据你的求职身份（在校生、应届生、职场人）和目标岗位，AI 自动定制简历内容。零经验也能生成专业简历，支持多模板、一键导出高清 PDF。',
  alternates: {
    canonical: 'https://aijianli.cn/ai',
  },
  keywords: [
    'AI简历生成', '免费简历生成', '应届生简历', '在校生简历',
    '职场人简历', '零经验简历', 'AI写简历', '简历自动生成',
    '求职简历制作', '智能简历', '简历生成器', '免费AI简历',
  ],
};

export default function AiLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
