'use client';

import React from 'react';
import { LandingButton } from './LandingButton';
import { LandingBadge } from './LandingBadge';
import { Sparkles, Wand2, Zap, Heart, Shield } from 'lucide-react';
import Link from 'next/link';

const TRUST_STATS = [
  { label: '求职者使用', value: '10,000+' },
  { label: '永久免费', value: '100%' },
  { label: '简历生成', value: '50,000+' },
];

export const LandingHero = () => {
  return (
    <section id="hero" className="relative pt-32 pb-24 overflow-hidden bg-[#F8FAFC] selection:bg-[#8B5CF6]/20">
      {/* Dynamic Background Elements - Glassmorphism base */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-[#8B5CF6]/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] animate-pulse-slow [animation-delay:2s]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Centered Hero Content */}
        <div className="text-center max-w-4xl mx-auto flex flex-col items-center gap-8 animate-in slide-in-from-bottom duration-700">
          {/* Badges */}
          <div className="flex gap-2 flex-wrap justify-center">
            <LandingBadge variant="primary" className="pl-1 pr-3 py-1 flex items-center gap-2 bg-white/60 backdrop-blur-md border-white shadow-sm text-slate-700">
              <span className="bg-[#8B5CF6] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">AI</span>
              <span className="font-medium">由独立开发者用心打造</span>
            </LandingBadge>
            <LandingBadge variant="accent" className="flex items-center gap-1 bg-white/60 backdrop-blur-md border-white shadow-sm text-slate-700 font-medium">
              <Heart className="w-3.5 h-3.5 text-rose-500" /> 永久免费，无任何隐藏收费
            </LandingBadge>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl lg:text-7xl font-bold text-slate-800 leading-[1.15] tracking-tight">
            AI 帮你写简历
            <br />
            <span className="text-[#8B5CF6]">
              你只需点击开始
            </span>
          </h1>

          {/* Subheading — warm, personal */}
          <p className="text-lg lg:text-xl text-slate-500 max-w-2xl leading-relaxed">
            一个程序员，为求职路上的你做了这款工具。
            <span className="font-semibold text-slate-700">微信扫码即用，</span>
            AI 智能生成、可视化编辑、多格式导出 —— 完全免费，没有套路。
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 justify-center pt-2">
            <Link href="/dashboard">
              <LandingButton size="lg" className="rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] shadow-sm text-lg px-8 transition-all">
                <Wand2 className="w-5 h-5 mr-2" />
                免费开始制作
              </LandingButton>
            </Link>
            <Link href="#editor-demo">
              <LandingButton variant="glass" size="lg" className="rounded-xl bg-white/60 backdrop-blur-md border-white shadow-sm text-slate-600 hover:text-[#8B5CF6] transition-all">
                <span className="flex items-center gap-2 font-medium">
                  <Sparkles className="w-5 h-5" /> 看看有多好用
                </span>
              </LandingButton>
            </Link>
          </div>

          {/* Trust Stats Bar */}
          <div className="flex items-center gap-6 sm:gap-10 pt-10 mt-2 border-t border-slate-200/50 w-full justify-center">
            {TRUST_STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1.5">
                <span className="text-2xl font-bold text-slate-800">{stat.value}</span>
                <span className="text-xs font-medium text-slate-500">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero Visual — Resume Preview with AI overlay */}
        <div className="relative mt-16 max-w-5xl mx-auto animate-in zoom-in-95 duration-700 delay-200">
          <div className="relative rounded-2xl overflow-hidden shadow-xl bg-white/40 backdrop-blur-xl border border-white">
            {/* Mock Editor Top Bar */}
            <div className="bg-white/60 backdrop-blur-md border-b border-white px-6 py-3 flex items-center gap-3">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1.5 bg-white/50 backdrop-blur-sm rounded-lg border border-white text-xs text-slate-500 font-medium font-mono shadow-sm">
                  aijianli.cn/editor
                </div>
              </div>
            </div>
            {/* Mock Editor Content */}
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] min-h-[400px]">
              {/* Sidebar */}
              <div className="hidden lg:block border-r border-white p-5 space-y-4 bg-white/30 backdrop-blur-sm">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">模块</div>
                {['个人信息', '教育经历', '实习经历', '项目经历', '技能特长'].map((item) => (
                  <div key={item} className="px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-white/50 hover:bg-white border border-transparent hover:border-white shadow-sm transition-all cursor-default flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                    {item}
                  </div>
                ))}
                <div className="pt-3 border-t border-white/50">
                  <div className="px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#8B5CF6] flex items-center gap-2 shadow-sm">
                    <Wand2 className="w-4 h-4" /> AI 智能填写
                  </div>
                </div>
              </div>
              {/* Preview Area */}
              <div className="p-6 lg:p-10 flex items-center justify-center bg-slate-50/50">
                <div className="w-full max-w-[380px] bg-white rounded-xl shadow-md border border-white p-6 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#8B5CF6]" />
                  <div className="flex gap-4 items-center pt-2">
                    <div className="w-12 h-12 rounded-full bg-[#F5F3FF] flex items-center justify-center text-[#8B5CF6] font-bold text-xl">Z</div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-24 bg-slate-200 rounded-md" />
                      <div className="h-3 w-36 bg-slate-100 rounded-md" />
                    </div>
                  </div>
                  <div className="space-y-2.5 pt-4 border-t border-slate-50">
                    <div className="h-3 w-full bg-slate-100 rounded-md" />
                    <div className="h-3 w-[90%] bg-slate-50 rounded-md" />
                    <div className="h-3 w-[75%] bg-slate-50 rounded-md" />
                  </div>
                  <div className="space-y-2.5 pt-4 border-t border-slate-50">
                    <div className="h-3 w-16 bg-[#F5F3FF] rounded-md" />
                    <div className="h-3 w-full bg-slate-50 rounded-md" />
                    <div className="h-3 w-[85%] bg-slate-50 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating AI Cards */}
          <div className="absolute top-[20%] right-[-3%] lg:right-[-5%] bg-white/80 backdrop-blur-xl p-3.5 rounded-2xl shadow-lg border border-white animate-float-delayed z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] flex items-center justify-center text-[#8B5CF6]">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">制作耗时</div>
                <div className="text-sm font-bold text-slate-800">3 分钟</div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-[15%] left-[-3%] lg:left-[-5%] bg-white/80 backdrop-blur-xl p-3.5 rounded-2xl shadow-lg border border-white animate-float z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">导出格式</div>
                <div className="text-sm font-bold text-slate-800">PDF / 图片</div>
              </div>
            </div>
          </div>

          {/* AI Working Indicator */}
          <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-xl px-4 py-2.5 rounded-xl shadow-lg border border-white flex items-center gap-2.5 animate-bounce-subtle z-20">
            <div className="flex gap-1">
               <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse" />
               <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse [animation-delay:150ms]" />
               <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse [animation-delay:300ms]" />
            </div>
            <span className="text-sm font-bold text-slate-700">AI 正在优化...</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes gradient-x {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-x {
          animation: gradient-x 6s ease infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 6s ease-in-out infinite;
          animation-delay: 3s;
        }
        .animate-float-slow {
          animation: float 8s ease-in-out infinite;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.1); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </section>
  );
};
