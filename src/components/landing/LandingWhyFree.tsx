'use client';

import React from 'react';
import { Heart, Code2, Shield, MessageCircle } from 'lucide-react';
import { LandingButton } from './LandingButton';
import Link from 'next/link';

interface WhyFreeSectionProps {
  id?: string;
}

const PROMISES = [
  {
    icon: <Heart className="w-5 h-5 text-rose-500" />,
    title: '永久免费',
    description: '所有功能、所有模板、所有导出，不收一分钱。没有 VIP，没有付费墙。',
  },
  {
    icon: <Shield className="w-5 h-5 text-violet-500" />,
    title: '隐私安全',
    description: '你的简历数据只属于你。不会被用于训练 AI，不会被分享给第三方。',
  },
  {
    icon: <Code2 className="w-5 h-5 text-cyan-500" />,
    title: '持续迭代',
    description: '作为独立开发者，我会持续听取用户反馈，不断优化产品体验。',
  },
  {
    icon: <MessageCircle className="w-5 h-5 text-green-500" />,
    title: '真人支持',
    description: '遇到任何问题，通过公众号随时找到我。不是客服机器人，是开发者本人。',
  },
];

export const LandingWhyFree = ({ id }: WhyFreeSectionProps) => {
  return (
    <section id={id} className="py-24 bg-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Story */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-100 rounded-full">
              <Heart className="w-4 h-4 text-rose-500" />
              <span className="text-sm font-semibold text-rose-600">独立开发者的承诺</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              为什么
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500"> 完全免费？</span>
            </h2>

            <div className="space-y-4 text-lg text-slate-600 leading-relaxed">
              <p>
                你好，我是智简简历的开发者。
              </p>
              <p>
                我还记得自己刚毕业时投简历的焦虑 —— 打开 Word 不知道怎么排版，
                搜到的简历工具要么丑、要么贵、要么导出带水印。
              </p>
              <p>
                所以我决定自己做一款：
                <span className="font-semibold text-slate-900">好看、好用、完全免费</span>的简历工具，
                让每一个求职路上的年轻人都能用上。
              </p>
            </div>

            <Link href="/ai">
              <LandingButton size="lg" className="rounded-full shadow-lg shadow-violet-500/30 text-lg px-8 mt-4">
                免费生成简历
              </LandingButton>
            </Link>
          </div>

          {/* Right — Promise Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {PROMISES.map((item, index) => (
              <div
                key={index}
                className="group p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-1 transition-all duration-500"
              >
                <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
