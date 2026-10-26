import type { Metadata } from 'next';
import { PricingClient } from './pricing-client';

export const metadata: Metadata = {
  title: '价格与免费权益说明 - 智简简历 | 免费额度透明无套路',
  description:
    '智简简历价格透明无套路。非会员每日默认享有 3 次整份生成、15 次单条润色、20 次 AI 编辑助手，并提供免费导出额度。点击查看非会员与 VIP 会员详细权益对比。',
  alternates: {
    canonical: 'https://aijianli.cn/pricing',
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
