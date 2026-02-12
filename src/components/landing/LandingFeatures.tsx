'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Wand2, LayoutTemplate, Download, Zap, Award } from 'lucide-react';

interface FeaturesSectionProps {
  id?: string;
}

const features = [
  {
    title: '完全免费',
    description: '100% Free。导出无水印，功能无限制。',
    icon: <Award className="w-6 h-6 text-fuchsia-500" />,
    className: 'md:col-span-2 md:row-span-2 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5',
    gradient: 'from-violet-500 to-fuchsia-500'
  },
  {
    title: 'AI 智能排版',
    description: '无需调整格式，内容自动适配 A4 纸张。',
    icon: <Wand2 className="w-6 h-6 text-violet-500" />,
    className: 'md:col-span-1 md:row-span-1',
    gradient: 'from-violet-400 to-violet-600'
  },
  {
    title: 'ATS 友好',
    description: '生成的 PDF 可被大厂筛选系统完美识别。',
    icon: <Zap className="w-6 h-6 text-amber-500" />,
    className: 'md:col-span-1 md:row-span-1',
    gradient: 'from-amber-400 to-orange-500'
  },
  {
    title: '极速导出',
    description: '支持高清 PDF、图片、Markdown 多格式。',
    icon: <Download className="w-6 h-6 text-cyan-500" />,
    className: 'md:col-span-1 md:row-span-1',
    gradient: 'from-cyan-400 to-blue-500'
  },
  {
    title: '200+ 模板',
    description: '涵盖各行业的高颜值模板。',
    icon: <LayoutTemplate className="w-6 h-6 text-rose-500" />,
    className: 'md:col-span-1 md:row-span-1',
    gradient: 'from-rose-400 to-pink-500'
  },
];

export const LandingFeatures = ({ id }: FeaturesSectionProps) => {
  return (
    <section id={id} className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
            不仅仅是简历工具
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500">更是你的求职加速器</span>
          </h2>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[240px]">
          {features.map((feature, index) => (
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
