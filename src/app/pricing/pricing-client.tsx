'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingButton } from '@/components/landing/LandingButton';
import { WxLoginDialog } from '@/components/auth/WxLoginDialog';
import { useAuth } from '@/hooks/use-auth';
import { DEFAULT_QUOTA_LIMITS } from '@/lib/quota/quota-config';
import {
  Check,
  Crown,
  Sparkles,
  ShieldCheck,
  XCircle,
  CheckCircle2,
} from 'lucide-react';

export const PricingClient = () => {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const handleVipClick = () => {
    if (isLoggedIn) {
      router.push('/dashboard/membership');
    } else {
      setIsLoginOpen(true);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <LandingHeader forceSolid />

      <main className="flex-grow pt-24 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-6 text-sm text-slate-400">
            <Link href="/" className="hover:text-slate-600 transition-colors">
              首页
            </Link>
            <span className="px-2">/</span>
            <span className="text-slate-700 font-medium">价格与权益</span>
          </div>

          {/* Hero Header */}
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-xs font-semibold text-violet-600 mb-4 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-violet-500" />
              公开透明 · 拒绝套路收费 · 每日真诚赠送 AI 额度
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              价格透明，
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
                免费也能做出一份可投递的好简历
              </span>
            </h1>
            <p className="mt-4 text-base text-slate-500 leading-relaxed max-w-2xl mx-auto">
              没有花半小时写完却在最后一步强行弹窗收费的套路。智简简历为每一位求职者每天提供充足的 AI 次数与无水印导出，满足常规求职需求；对于高频海投用户，我们也提供超高性价比的会员畅享。
            </p>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
            {/* Free Tier Card */}
            <div className="relative flex flex-col rounded-3xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">非会员（免费开始）</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    适合应届生、在校生与偶尔更新简历的求职者
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-100">
                  每日重置
                </div>
              </div>

              <div className="my-4 pb-4 border-b border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">¥0</span>
                  <span className="text-sm text-slate-400 font-medium">/ 永久免费体验</span>
                </div>
                <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1 font-medium">
                  <Check className="w-3.5 h-3.5" /> 注册登录即可使用，绝不强制开通付费
                </p>
              </div>

              {/* Feature List */}
              <div className="space-y-3.5 my-4 flex-grow text-sm text-slate-600">
                <div className="font-semibold text-xs text-slate-400 uppercase tracking-wider mb-2">
                  每日免费 AI 权益
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span>
                    <strong>AI 整份简历生成</strong>：每日 {DEFAULT_QUOTA_LIMITS.aiGenerateResume} 次
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span>
                    <strong>AI 文本导入转简历</strong>：每日 {DEFAULT_QUOTA_LIMITS.aiImportSection} 次
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span>
                    <strong>单条经历精准润色</strong>：每日 {DEFAULT_QUOTA_LIMITS.aiPolishSection} 次
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span>
                    <strong>单模块智能续写</strong>：每日 {DEFAULT_QUOTA_LIMITS.aiGenerateSection} 次
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span>
                    <strong>AI 编辑助手</strong>：每日 {DEFAULT_QUOTA_LIMITS.aiEditorAssist} 次（对话改写/JD匹配/面试题）
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span>
                    <strong>收集事实与修改微调</strong>：不消耗额度
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span>
                    <strong>无水印导出</strong>：可编辑 Word (.docx) 与高清 PDF
                  </span>
                </div>
              </div>

              <div className="pt-4 mt-auto">
                <Link href="/ai" className="block w-full">
                  <LandingButton
                    variant="outline"
                    size="lg"
                    className="w-full justify-center rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    立即免费制作简历
                  </LandingButton>
                </Link>
              </div>
            </div>

            {/* VIP Tier Card */}
            <div className="relative flex flex-col rounded-3xl border-2 border-violet-500 bg-white p-8 shadow-xl overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-l from-violet-600 to-fuchsia-600 text-white text-[11px] font-bold px-4 py-1.5 rounded-bl-xl shadow-sm">
                畅享特权
              </div>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500 fill-amber-500" />
                    <h3 className="text-xl font-bold text-slate-900">VIP 会员</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    适合多岗位海投、跳槽冲刺与需要深度定制简历的用户
                  </p>
                </div>
              </div>

              <div className="my-4 pb-4 border-b border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-violet-600">
                    超值特惠
                  </span>
                  <span className="text-xs text-slate-400 font-medium ml-1">
                    (支持按需开通或买断)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-violet-500" /> 一次付费，没有任何隐形扣费陷阱
                </p>
              </div>

              {/* Feature List */}
              <div className="space-y-3.5 my-4 flex-grow text-sm text-slate-700">
                <div className="font-semibold text-xs text-violet-600 uppercase tracking-wider mb-2">
                  VIP 全部解锁特权
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-600" />
                  </div>
                  <span>
                    <strong>全部 AI 功能无限次使用</strong>（生成、润色、改写、JD匹配）
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-600" />
                  </div>
                  <span>
                    <strong>全场精美模板解锁</strong>（含全部 Canva 风格多栏模板）
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-600" />
                  </div>
                  <span>
                    <strong>全格式无限次导出</strong>：Word (.docx)、PDF、图片、Markdown
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-600" />
                  </div>
                  <span>
                    <strong>多份简历无限创建</strong>：针对不同岗位派生专属版本
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-600" />
                  </div>
                  <span>
                    <strong>网申资料中心与插件配合</strong>：全网公司官网极速填表
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-600" />
                  </div>
                  <span>
                    <strong>一对一客服与专属答疑</strong>：简历修改与排版疑难优先支持
                  </span>
                </div>
              </div>

              <div className="pt-4 mt-auto">
                <LandingButton
                  size="lg"
                  onClick={handleVipClick}
                  className="w-full justify-center rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium shadow-md shadow-violet-200"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  {isLoggedIn ? '进入控制台查看与升级' : '微信扫码登录查看实时价格'}
                </LandingButton>
              </div>
            </div>
          </div>

          {/* Contrast with Traditional Tools */}
          <div className="mt-20 max-w-4xl mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 text-center mb-8">
              为什么智简简历比其他平台更受求职者信任？
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="text-sm font-semibold text-rose-500 flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> 传统/劣质简历工具的常见套路
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-500">
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 shrink-0">✕</span>
                    宣称“完全免费”，花一小时填完点击导出却被强制要求支付 99 元会员。
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 shrink-0">✕</span>
                    免费导出的简历在正中央印有醒目刺眼的平台水印，根本无法投递。
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 shrink-0">✕</span>
                    不支持 Word 导出，或者导出的 Word 是一堆乱七八糟的错位图片。
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 shrink-0">✕</span>
                    价格不公开，故意把定价藏在登录和复杂的自动扣费陷阱之后。
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-semibold text-emerald-600 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> 智简简历的真诚原则
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                    <strong>额度透明公开</strong>：每日免费额度明码列明，每天 0 点自动重置。
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                    <strong>绝无平台水印</strong>：哪怕是免费额度导出的文件，也干干净净。
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                    <strong>语义化 Word 导出</strong>：专为 Canva 与经典排版开发，可随意二次编辑。
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                    <strong>数据绝对私密</strong>：不进公开大模型训练池，随时支持自主注销删除。
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-slate-900 text-center mb-8">
              关于费用与权益的常见问题
            </h3>
            <div className="space-y-6">
              <div className="rounded-2xl bg-white p-6 border border-slate-200">
                <h4 className="font-semibold text-slate-800 text-base mb-2">
                  免费额度每天几点重置？
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  每日免费 AI 额度会在北京时间每天凌晨 00:00 自动重置。你可以在每天继续享受免费生成、润色与编辑助手，长期有效。
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 border border-slate-200">
                <h4 className="font-semibold text-slate-800 text-base mb-2">
                  导出的 Word (.docx) 和 PDF 真的没有水印吗？
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  是的。智简简历的所有导出文件都不会添加任何平台水印、Logo 或底部广告文案。你可以直接拿去投递各大名企、外企或国企系统。
                </p>
              </div>

              <div className="rounded-2xl bg-white p-6 border border-slate-200">
                <h4 className="font-semibold text-slate-800 text-base mb-2">
                  如果遇到问题或需要帮助，怎么联系客服？
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  可以通过网站右下角的反馈组件、官方微信公众号（智简简历）或微信小程序随时留言，独立开发者本人会亲自查看并第一时间回复。
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />

      {/* Login Dialog */}
      <WxLoginDialog
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        subtitle="微信扫码登录即可享受每日免费 AI 配额"
      />
    </div>
  );
};
