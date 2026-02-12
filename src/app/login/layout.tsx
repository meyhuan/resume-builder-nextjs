import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '登录 - 微信扫码即用',
  description: '微信扫码登录智简简历，免费使用 AI 简历制作工具。无需注册，扫码即用，简历数据多端同步。',
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
