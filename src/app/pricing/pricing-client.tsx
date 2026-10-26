'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { WxLoginDialog } from '@/components/auth/WxLoginDialog';
import { useAuth } from '@/hooks/use-auth';
import { DEFAULT_QUOTA_LIMITS } from '@/lib/quota/quota-config';
import {
  Check,
  Crown,
  ShieldCheck,
  XCircle,
  CheckCircle2,
  Smartphone,
  Zap,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  badge?: string;
  badgeColor?: string;
  price: string;
  originalPrice?: string;
  period: string;
  pillDesc: string;
  pillColor?: string;
  highlight?: boolean;
  ctaText: string;
  features: string[];
}

const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: '免费体验',
    price: '0',
    period: '/ 永久免费',
    pillDesc: '基础制作与试用',
    ctaText: '免费开始制作',
    features: [
      '基础版面在线编辑排版',
      '赠送 1 次高清 PDF 简历导出',
      `AI 简历生成每日 ${DEFAULT_QUOTA_LIMITS.aiGenerateResume} 次`,
      `AI 单条润色每日 ${DEFAULT_QUOTA_LIMITS.aiPolishSection} 次`,
      `AI 编辑助手每日 ${DEFAULT_QUOTA_LIMITS.aiEditorAssist} 次`,
      '多端数据实时云端保存',
    ],
  },
  {
    id: 'month',
    name: '月卡会员',
    price: '19.9',
    originalPrice: '29.9',
    period: '/ 30天',
    pillDesc: '短期突击投递',
    pillColor: 'bg-slate-100 text-slate-600',
    ctaText: '开通月卡',
    features: [
      '30 天内无限次高清 PDF 导出',
      'Word (DOCX) 原生可编辑导出',
      '解锁全站 HR 严选精品模板',
      'AI 深度润色 & 岗位匹配无限次',
      '电脑端 & 微信小程序权益互通',
      '单次付费，不自动续费',
    ],
  },
  {
    id: 'year',
    name: '年卡会员',
    badge: '应届首选',
    badgeColor: 'bg-violet-600 text-white',
    price: '39.9',
    originalPrice: '99',
    period: '/ 365天',
    pillDesc: '约 0.11元/天',
    pillColor: 'bg-violet-50 text-violet-700 font-semibold',
    ctaText: '开通年卡',
    features: [
      '365 天秋招春招求职季全覆盖',
      'Word / PDF / 图片多格式无限次导出',
      '全部精品模板解锁',
      'AI 深度润色、改写、JD 匹配无限次',
      '电脑端 & 微信小程序权益互通',
      '单次付费，不自动续费',
    ],
  },
  {
    id: 'lifetime',
    name: '终身会员',
    badge: '超值买断',
    badgeColor: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm',
    price: '69.9',
    originalPrice: '199',
    period: '/ 永久买断',
    pillDesc: '一次开通永久用',
    pillColor: 'bg-violet-600 text-white font-semibold',
    highlight: true,
    ctaText: '开通终身会员 (立省 ¥129.1)',
    features: [
      '全职业生涯终身无限次高清导出',
      'Word (DOCX) 原生可编辑无限次导出',
      '全站精品模板与后续新增模板终身解锁',
      '全部 AI 高阶功能终身无限次使用',
      '一对一简历排版指导与专属求职辅导',
      '电脑端 & 微信小程序权益终身互通',
      '单次买断，永久有效，不自动续费',
    ],
  },
];

interface FeatureRow {
  title: string;
  desc: string;
  free: string;
  vip: string;
  freeIsCheck?: boolean;
  vipIsInfinity?: boolean;
}

const COMPARISON_ROWS: FeatureRow[] = [
  {
    title: 'PDF 高清简历导出',
    desc: '简历随时微调修改、针对不同公司定制导出',
    free: '仅 1 次',
    vip: '∞ 无限次',
    vipIsInfinity: true,
  },
  {
    title: 'Word (DOCX) 原生可编辑导出',
    desc: '国企/考公/校招网申必填，支持本地自由排版',
    free: '✕',
    vip: '✓ 专享支持',
  },
  {
    title: 'AI 简历深度润色 & 岗位匹配',
    desc: 'STAR 法则重写经历、JD 匹配诊断、面试押题',
    free: '每日限次',
    vip: '∞ 无限次',
    vipIsInfinity: true,
  },
  {
    title: '去除水印 & 全部精品模板',
    desc: '解锁全站 HR 严选专业模板，导出纯净无水印',
    free: '✕',
    vip: '✓ 全部解锁',
  },
  {
    title: '一对一简历指导 & 多格式导出',
    desc: '含高清长图、Markdown 导出及专属求职辅导',
    free: '✕',
    vip: '✓ 全部解锁',
  },
];

const PRICING_FAQS = [
  {
    q: '免费用户可以导出简历吗？',
    a: '可以。新注册用户默认赠送 1 次高清 PDF 简历免费导出额度，并且每日均享有免费的 AI 简历生成、单条润色和编辑助手次数，满足初次制作一份可投递简历的基础需求。',
  },
  {
    q: '开通会员后，电脑端和小程序是通用的吗？',
    a: '完全通用。智简简历采用多端互通机制，只要使用同一微信账号登录，电脑端（aijianli.cn）与微信小程序的会员权益、云端简历草稿均实时同步。',
  },
  {
    q: '会产生自动扣费或隐藏收费吗？',
    a: '绝不。智简简历所有会员方案均为单次支付买断或按期生效，不绑定任何银行卡自动续费协议，到期后不会悄悄扣费。',
  },
  {
    q: 'Word (DOCX) 导出在本地打开排版会乱吗？',
    a: '不会。智简简历自研了语义化原生 Word 导出引擎，而非粗暴的网页截图或错位拼接，在 WPS 或 Microsoft Word 中打开排版规整，可随时二次编辑文字。',
  },
  {
    q: '如果遇到支付问题或需要帮助，怎么联系？',
    a: '你可以通过网站右下角的“反馈”浮窗直接留言，或添加开发者微信 kkyycc01，独立开发者会第一时间为你处理。',
  },
];

export const PricingClient = () => {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const handlePlanClick = (planId: string) => {
    if (planId === 'free') {
      router.push('/ai');
      return;
    }
    if (isLoggedIn) {
      router.push('/dashboard/membership');
    } else {
      setIsLoginOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex flex-col">
      <LandingHeader forceSolid />

      <main className="flex-1 pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-6 text-sm text-slate-400">
            <Link href="/" className="hover:text-slate-600 transition-colors">
              首页
            </Link>
            <span className="px-2">/</span>
            <span className="text-slate-700 font-medium">价格与权益</span>
          </div>

          {/* Hero Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-xs font-semibold text-violet-700 mb-4 shadow-sm">
              <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>电脑端 & 微信小程序权益互通 · 单次买断 · 绝不自动续费</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              你的简历已就绪，
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
                升级会员无限次高清导出
              </span>
            </h1>
            <p className="mt-4 text-base text-slate-500 leading-relaxed max-w-2xl mx-auto">
              求职投递往往需要反复微调简历。开通会员支持不限次数导出高清无水印 PDF、可编辑 Word 及 AI 深度润色，满足多岗位海投冲刺。
            </p>
          </div>

          {/* 4 Pricing Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-16 items-stretch">
            {PRICING_PLANS.map((plan) => {
              const isHighlight = plan.highlight;
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-3xl bg-white p-6 transition-all duration-200 ${
                    isHighlight
                      ? 'border-2 border-violet-500 shadow-xl shadow-violet-500/10 scale-102 lg:-translate-y-1'
                      : 'border border-slate-200 shadow-sm hover:shadow-md'
                  }`}
                >
                  {plan.badge && (
                    <div
                      className={`absolute -top-3 right-6 text-[11px] font-bold px-3 py-1 rounded-full ${plan.badgeColor}`}
                    >
                      {plan.badge}
                    </div>
                  )}

                  <div className="mb-3">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                      {isHighlight && <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />}
                      {plan.name}
                    </h3>
                  </div>

                  <div className="mb-4 pb-4 border-b border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-semibold text-slate-600">¥</span>
                      <span className={`text-3xl sm:text-4xl font-extrabold ${isHighlight ? 'text-violet-600' : 'text-slate-900'}`}>
                        {plan.price}
                      </span>
                      {plan.originalPrice && (
                        <span className="text-xs text-slate-400 line-through ml-1">
                          ¥{plan.originalPrice}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 ml-1">{plan.period}</span>
                    </div>
                    <div className="mt-2.5">
                      <span className={`inline-block text-xs px-2.5 py-1 rounded-full ${plan.pillColor || 'bg-slate-100 text-slate-600'}`}>
                        {plan.pillDesc}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2.5 mb-6 flex-grow text-xs text-slate-600">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isHighlight ? 'text-violet-600 font-bold' : 'text-emerald-500'}`} />
                        <span className={idx === 0 && isHighlight ? 'font-semibold text-slate-900' : ''}>
                          {feat}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handlePlanClick(plan.id)}
                    className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-1.5 ${
                      isHighlight
                        ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/25 hover:opacity-95'
                        : plan.id === 'free'
                        ? 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                        : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                    }`}
                  >
                    {plan.ctaText}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Membership Benefits Comparison Table (1:1 from latest UI) */}
          <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 mb-16 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500 fill-amber-500" />
                <h2 className="text-xl font-bold text-slate-900">会员专属特权对比</h2>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-medium border border-violet-100/80 w-fit">
                <Smartphone className="w-3.5 h-3.5 text-violet-500" />
                <span>电脑端 & 微信小程序权益互通</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400">
                    <th className="py-4 px-3 sm:px-4">核心求职权益</th>
                    <th className="py-4 px-3 sm:px-4 text-center w-28 sm:w-36">免费用户</th>
                    <th className="py-4 px-3 sm:px-4 text-center w-36 sm:w-44 text-violet-700 font-bold">
                      <span className="inline-flex items-center gap-1 justify-center">
                        <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        VIP 会员
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {COMPARISON_ROWS.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-3 sm:px-4">
                        <div className="font-semibold text-slate-800 text-sm sm:text-base">
                          {row.title}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {row.desc}
                        </div>
                      </td>
                      <td className="py-4 px-3 sm:px-4 text-center text-slate-500 font-medium">
                        {row.free === '✕' ? (
                          <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                        ) : (
                          <span className="text-xs sm:text-sm px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                            {row.free}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-3 sm:px-4 text-center">
                        {row.vipIsInfinity ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs sm:text-sm font-bold">
                            {row.vip}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full bg-violet-600 text-white text-xs sm:text-sm font-medium shadow-xs">
                            {row.vip}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Guarantee Badges */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>单次买断 · 绝不自动续费</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span>支付成功秒级解锁</span>
                </div>
              </div>
              <button
                onClick={() => handlePlanClick('lifetime')}
                className="text-violet-600 hover:text-violet-700 font-medium hover:underline flex items-center gap-1"
              >
                <span>微信扫码立即开通</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Trust Guarantee Comparison (Why Us vs Bad Competitors) */}
          <div className="max-w-4xl mx-auto my-14 bg-gradient-to-br from-violet-50/50 via-white to-fuchsia-50/30 rounded-3xl p-8 border border-violet-100/60 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 text-center mb-8">
              为什么智简简历比其他平台更受求职者信任？
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-white border border-rose-100 shadow-xs">
                <div className="flex items-center gap-2 text-rose-600 font-bold mb-4 text-sm">
                  <XCircle className="w-5 h-5 shrink-0" />
                  <span>传统/劣质简历工具的常见套路</span>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-500">
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400">✕</span>
                    <span>宣称“完全免费”，花一小时填完点击导出却被强制要求支付 99 元高昂会员。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400">✕</span>
                    <span>免费导出的简历在正中央印有醒目刺眼的巨幅平台水印，根本无法拿来正式投递。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400">✕</span>
                    <span>导出的 Word 是一堆乱七八糟的拼凑图片或文本框错位，WPS 打开直接乱码。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400">✕</span>
                    <span>价格藏在登录后，悄悄勾选每月自动扣费协议，不退款投诉无门。</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-emerald-100 shadow-xs">
                <div className="flex items-center gap-2 text-emerald-600 font-bold mb-4 text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>智简简历的真诚原则</span>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span><strong>真实免费可用</strong>：赠送免费导出与每日充沛 AI 次数，绝不在最后一步强行绑架付费。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span><strong>单次支付不自动续费</strong>：月卡、年卡、终身会员明码标价，单次付费绝无隐形自动续费扣款。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span><strong>原生语义化 Word 导出</strong>：专为 Canva 与经典排版深度研发，在 Word/WPS 中可随意二次编辑。</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span><strong>数据绝对私密与双端互通</strong>：求职信息不进任何公共大模型训练池，电脑与微信小程序权益无缝同步。</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Pricing FAQ Section */}
          <div className="max-w-3xl mx-auto my-12">
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold text-slate-900">
                关于费用与权益的常见问题
              </h3>
            </div>
            <div className="space-y-4">
              {PRICING_FAQS.map((faq, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs"
                >
                  <h4 className="font-semibold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-violet-500 shrink-0" />
                    {faq.q}
                  </h4>
                  <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed pl-6">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />

      {/* Login Dialog */}
      <WxLoginDialog
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        subtitle="微信扫码登录即可享受会员权益"
      />
    </div>
  );
};
