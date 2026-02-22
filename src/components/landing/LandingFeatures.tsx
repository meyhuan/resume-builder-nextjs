'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Wand2, Sparkles, Brain, FileCheck, Languages, Target } from 'lucide-react';

interface FeaturesSectionProps {
  id?: string;
}

const AI_FEATURES = [
  {
    title: 'AI 一键生成',
    description: '输入基本信息，AI 自动生成完整、专业的简历内容。零经验同学也能写出让 HR 眼前一亮的简历。',
    icon: <Brain className="w-6 h-6 text-violet-500" />,
    className: 'md:col-span-2 md:row-span-2 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5',
    gradient: 'from-violet-500 to-fuchsia-500',
  },
  {
    title: 'AI 内容润色',
    description: '一键优化措辞，让你的经历描述更有说服力、更专业。',
    icon: <Sparkles className="w-6 h-6 text-fuchsia-500" />,
    className: 'md:col-span-1 md:row-span-1',
    gradient: 'from-fuchsia-400 to-pink-500',
  },
  {
    title: 'JD 智能匹配',
    description: '粘贴职位描述，AI 自动调整简历重点，提升匹配度。',
    icon: <Target className="w-6 h-6 text-amber-500" />,
    className: 'md:col-span-1 md:row-span-1',
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    title: 'ATS 格式优化',
    description: '生成的 PDF 可被主流招聘系统完美解析，不再被机器筛掉。',
    icon: <FileCheck className="w-6 h-6 text-green-500" />,
    className: 'md:col-span-1 md:row-span-1',
    gradient: 'from-green-400 to-emerald-500',
  },
  {
    title: '多语言生成',
    description: '中英文一键切换，外企投递不再愁翻译。',
    icon: <Languages className="w-6 h-6 text-cyan-500" />,
    className: 'md:col-span-1 md:row-span-1',
    gradient: 'from-cyan-400 to-blue-500',
  },
];

export const LandingFeatures = ({ id }: FeaturesSectionProps) => {
  return (
    <section id={id} className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-fuchsia-50 border border-fuchsia-100 rounded-full mb-6">
            <Wand2 className="w-4 h-4 text-fuchsia-500" />
            <span className="text-sm font-semibold text-fuchsia-600">AI 加持</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
            不仅好用
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500">还很聪明</span>
          </h2>
          <p className="text-lg text-slate-500">
            AI 贯穿简历制作全流程，从生成到润色到投递优化，帮你节省 90% 的时间。
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[240px]">
          {AI_FEATURES.map((feature, index) => (
            <div
              key={index}
              className={cn(
                "group relative p-8 rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden flex flex-col justify-between",
                feature.className
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-500"
                style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
              />
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-500 bg-slate-50 group-hover:bg-white shadow-sm"
              )}>
                {feature.icon}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">{feature.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{feature.description}</p>
              </div>
              {/* Decor */}
              <div className={cn(
                "absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-[40px] opacity-20 transition-opacity duration-500 group-hover:opacity-40",
                `bg-gradient-to-r ${feature.gradient}`
              )} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
