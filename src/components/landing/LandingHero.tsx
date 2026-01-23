'use client';

import React from 'react';
import { LandingButton } from './LandingButton';
import { LandingBadge } from './LandingBadge';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export const LandingHero = () => {
  return (
    <section id="hero" className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-br from-white to-[#faf8ff]">
      {/* Background Decor */}
      <div className="absolute top-0 left-[-50%] w-[200%] h-full bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.08),transparent_70%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-16 items-center relative z-10">
        <div className="flex flex-col gap-8 animate-in slide-in-from-bottom duration-700">
          <div className="flex gap-2 flex-wrap">
            <LandingBadge variant="primary">完全免费使用</LandingBadge>
            <LandingBadge variant="accent">5分钟极速生成</LandingBadge>
          </div>

          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.2]">
            <span className="bg-gradient-to-r from-[#a855f7] to-[#f23a70] bg-clip-text text-transparent">免费AI简历</span>
            <br />
            填充内容
            <br />
            一键导出精美简历
          </h1>

          <p className="text-lg text-gray-600 max-w-lg leading-relaxed">
            所有功能完全免费，无隐藏收费。AI智能生成专业简历，免费导出 PDF/图片/Markdown，求职快人一步！
          </p>

          <div className="flex flex-wrap gap-4">
            <Link href="/dashboard">
              <LandingButton size="lg">免费制作简历</LandingButton>
            </Link>
            <LandingButton variant="outline" size="lg">
              <span className="flex items-center gap-2">
                查看模板 <ChevronRight className="w-5 h-5" />
              </span>
            </LandingButton>
          </div>

          <div className="grid grid-cols-3 gap-8 pt-4">
            <div>
              <div className="text-2xl font-bold bg-gradient-to-r from-[#a855f7] to-[#f23a70] bg-clip-text text-transparent">100%</div>
              <div className="text-sm text-gray-500">免费使用</div>
            </div>
            <div>
              <div className="text-2xl font-bold bg-gradient-to-r from-[#a855f7] to-[#f23a70] bg-clip-text text-transparent">5分钟</div>
              <div className="text-sm text-gray-500">极速生成</div>
            </div>
            <div>
              <div className="text-2xl font-bold bg-gradient-to-r from-[#a855f7] to-[#f23a70] bg-clip-text text-transparent">200+</div>
              <div className="text-sm text-gray-500">精美模板</div>
            </div>
          </div>
        </div>

        <div className="relative animate-in zoom-in duration-1000 delay-200">
          <div className="relative w-full h-[450px]">
            {/* Resume Stack */}
            <div className="absolute top-0 left-0 w-[200px] h-[280px] z-30 shadow-2xl rounded-xl overflow-hidden border-2 border-white hover:scale-105 transition-transform duration-300 animate-bounce-slow">
              <Image src="/index-resume-1.png" alt="模板1" fill className="object-cover" />
            </div>
            <div className="absolute top-[80px] left-[120px] w-[200px] h-[280px] z-20 shadow-2xl rounded-xl overflow-hidden border-2 border-white opacity-85 hover:scale-105 transition-transform duration-300 animate-bounce-slow [animation-delay:0.5s]">
              <Image src="/index-resume-2.png" alt="模板2" fill className="object-cover" />
            </div>
            <div className="absolute top-[160px] left-[240px] w-[200px] h-[280px] z-10 shadow-2xl rounded-xl overflow-hidden border-2 border-white opacity-70 hover:scale-105 transition-transform duration-300 animate-bounce-slow [animation-delay:1s]">
              <Image src="/index-resume-3.png" alt="模板3" fill className="object-cover" />
            </div>

            {/* Decorative Elements */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 400 400">
              <circle cx="80" cy="320" r="40" className="fill-[#a855f7]/20 animate-pulse" />
              <circle cx="320" cy="60" r="60" className="fill-[#f23a70]/15 animate-pulse [animation-delay:0.5s]" />
              <circle cx="350" cy="280" r="50" className="fill-[#a855f7]/10 animate-pulse [animation-delay:1s]" />
            </svg>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
};
