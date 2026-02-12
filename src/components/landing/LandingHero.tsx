'use client';

import React from 'react';
import { LandingButton } from './LandingButton';
import { LandingBadge } from './LandingBadge';
import Image from 'next/image';
import { ChevronRight, Sparkles, Wand2, Zap } from 'lucide-react';
import Link from 'next/link';

export const LandingHero = () => {
  return (
    <section id="hero" className="relative pt-32 pb-20 overflow-hidden bg-white selection:bg-fuchsia-200">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-violet-500/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-fuchsia-500/20 rounded-full blur-[100px] animate-pulse-slow [animation-delay:2s]" />
        <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] bg-cyan-400/10 rounded-full blur-[80px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center relative z-10">
        <div className="flex flex-col gap-8 animate-in slide-in-from-bottom duration-700">
          <div className="flex gap-2 flex-wrap">
            <LandingBadge variant="primary" className="pl-1 pr-3 py-1 flex items-center gap-2">
              <span className="bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">NEW</span>
              <span>AI 智能引擎 v2.0</span>
            </LandingBadge>
            <LandingBadge variant="accent" className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> 100% 免费使用
            </LandingBadge>
          </div>

          <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight">
            让简历成为你的
            <br />
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-rose-500 bg-clip-text text-transparent animate-gradient-x bg-[length:200%_auto]">
              AI 超能力
            </span>
          </h1>

          <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
            年轻人的第一款 AI 简历工具。
            <span className="font-semibold text-slate-900">无需注册，微信扫码即用。</span>
            智能排版、一键润色、多格式导出，让你的下一份 Offer 触手可及。
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link href="/dashboard">
              <LandingButton size="lg" className="rounded-full shadow-lg shadow-violet-500/30 hover:shadow-violet-500/40 text-lg px-8">
                <Wand2 className="w-5 h-5 mr-2" />
                立即免费制作
              </LandingButton>
            </Link>
            <LandingButton variant="glass" size="lg" className="rounded-full text-slate-700 hover:text-violet-700">
              <span className="flex items-center gap-2">
                查看热门模板 <ChevronRight className="w-5 h-5" />
              </span>
            </LandingButton>
          </div>

          <div className="flex items-center gap-8 pt-8 border-t border-slate-100">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 relative overflow-hidden">
                  <Image src={`/avatar-${i}.png`} alt="User" width={40} height={40} className="object-cover" />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-500">
                1w+
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg key={i} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-slate-500">受到 10,000+ 求职者的信赖</span>
            </div>
          </div>
        </div>

        <div className="relative animate-in zoom-in duration-1000 delay-200 lg:h-[600px] flex items-center justify-center perspective-1000">
          <div className="relative w-full h-full max-w-[500px] max-h-[600px]">
            {/* Glassmorphism Back Card */}
            <div className="absolute top-[10%] right-[5%] w-[80%] h-[70%] bg-gradient-to-br from-violet-100/50 to-fuchsia-100/50 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl rotate-6 z-0 animate-float-slow"></div>
            
            {/* Main Resume Card */}
            <div className="absolute top-[15%] left-[5%] w-[85%] h-[75%] bg-white rounded-2xl shadow-[0_20px_50px_rgba(124,58,237,0.15)] overflow-hidden border border-slate-100 z-10 rotate-[-3deg] transition-transform hover:rotate-0 hover:scale-105 duration-500">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
              <div className="p-6 h-full flex flex-col gap-4">
                <div className="flex gap-4 items-center border-b border-slate-100 pb-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden">
                    <Image src="/index-resume-1.png" alt="Profile" width={64} height={64} className="object-cover opacity-80" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-3 w-48 bg-slate-100 rounded animate-pulse delay-75"></div>
                  </div>
                </div>
                <div className="space-y-3 flex-1">
                  <div className="h-3 w-full bg-slate-50 rounded"></div>
                  <div className="h-3 w-[90%] bg-slate-50 rounded"></div>
                  <div className="h-20 w-full bg-slate-50 rounded mt-4"></div>
                  <div className="h-3 w-full bg-slate-50 rounded"></div>
                  <div className="h-3 w-[80%] bg-slate-50 rounded"></div>
                </div>
              </div>
              
              {/* AI Badge Overlay */}
              <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-violet-100 flex items-center gap-2 animate-bounce-subtle">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm font-semibold text-violet-700">AI 优化完成</span>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute top-[30%] right-[-10%] bg-white/80 backdrop-blur-lg p-3 rounded-2xl shadow-xl border border-white/50 animate-float-delayed z-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">效率提升</div>
                  <div className="text-sm font-bold text-slate-800">300%</div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-[20%] left-[-5%] bg-white/80 backdrop-blur-lg p-3 rounded-2xl shadow-xl border border-white/50 animate-float z-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-fuchsia-100 flex items-center justify-center text-fuchsia-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">ATS 通过率</div>
                  <div className="text-sm font-bold text-slate-800">99.8%</div>
                </div>
              </div>
            </div>
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
