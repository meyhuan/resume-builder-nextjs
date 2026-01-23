'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface FeaturesSectionProps {
  id?: string;
}

const features = [
  {
    title: '完全免费',
    description: '所有功能免费使用，无任何隐藏费用，随时随地制作专业简历',
    metricLabel: '节省费用',
    metricValue: '100%',
    icon: (
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <rect x="7" y="14" width="26" height="18" rx="2" stroke="#9333EA" strokeWidth="2.5" fill="none" />
        <path d="M7 14h26 M20 14v18 M20 14l-5-6h-5l5 6 M20 14l5-6h5l-5 6" stroke="#9333EA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    )
  },
  {
    title: '智能排版',
    description: 'AI自动优化排版布局，无需设计经验，专业效果立现',
    metricLabel: '设计时间',
    metricValue: '0分钟',
    icon: (
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <rect x="8" y="8" width="24" height="24" rx="2" stroke="#9333EA" strokeWidth="2.5" fill="none" />
        <path d="M14 16h12 M14 24h8" stroke="#9333EA" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M34 6l2 2-2 2-2-2z M32 32l3 3-3 3-3-3z" fill="#9333EA" stroke="none"/>
      </svg>
    )
  },
  {
    title: '免费导出',
    description: '支持 PDF、图片、Markdown 等格式，完全免费导出高清简历',
    metricLabel: '导出速度',
    metricValue: '3秒',
    icon: (
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <path d="M12 18l8 8 8-8 M20 6v20" stroke="#9333EA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M8 30h24" stroke="#9333EA" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    )
  },
  {
    title: '极速生成',
    description: '填写基本信息，5分钟内完成简历制作，求职快人一步',
    metricLabel: '制作时间',
    metricValue: '5分钟',
    icon: (
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <path d="M22 4L10 22h8l-2 14 12-18h-8l2-14z" stroke="#9333EA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    )
  },
  {
    title: '海量模板',
    description: '200+专业模板覆盖各行业，简约大气、现代时尚任你选择',
    metricLabel: '模板数量',
    metricValue: '200+',
    icon: (
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <rect x="6" y="6" width="12" height="12" rx="2" stroke="#9333EA" strokeWidth="2.5" fill="none"/>
        <rect x="22" y="6" width="12" height="12" rx="2" stroke="#9333EA" strokeWidth="2.5" fill="none"/>
        <rect x="6" y="22" width="12" height="12" rx="2" stroke="#9333EA" strokeWidth="2.5" fill="none"/>
        <rect x="22" y="22" width="12" height="12" rx="2" stroke="#9333EA" strokeWidth="2.5" fill="none"/>
      </svg>
    )
  },
  {
    title: 'ATS友好',
    description: '确保简历通过ATS系统筛选，提高HR查看率',
    metricLabel: '通过率',
    metricValue: '95%',
    icon: (
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <path d="M20 6L8 10v10c0 6 5 12 12 14s12-8 12-14V10L20 6z" stroke="#9333EA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M15 20l4 4 8-8" stroke="#9333EA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    )
  }
];

export const LandingFeatures = ({ id }: FeaturesSectionProps) => {
  return (
    <section id={id} className="py-24 bg-[#f8f9fb] relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(168,85,247,0.05)_0%,transparent_70%)] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-left mb-16 max-w-3xl">
          <span className="inline-block px-4 py-2 bg-gradient-to-r from-[#a855f7] to-[#6366f1] text-white text-sm font-semibold rounded-full mb-4">
            完全免费
          </span>
          <h2 className="text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
            为什么选择智简简历？
          </h2>
          <p className="text-xl text-gray-500 leading-relaxed">
            所有功能永久免费，无隐藏收费，让每个人都能制作专业简历
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-10 bg-white/80 backdrop-blur-md rounded-[24px] border border-white/80 shadow-sm transition-all duration-700 hover:-translate-y-2 hover:border-[#a855f7]/20 hover:shadow-[0_20px_40px_-10px_rgba(168,85,247,0.15)] hover:bg-white animate-in slide-in-from-bottom"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-16 h-16 rounded-[18px] bg-gradient-to-br from-[#a855f7]/10 to-[#f23a70]/10 flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:rotate-3">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
              <p className="text-gray-500 leading-relaxed mb-6">{feature.description}</p>
              
              <div className="flex items-center gap-3 pt-6 border-t border-gray-100">
                <span className="text-sm font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                  {feature.metricLabel}
                </span>
                <span className="text-xl font-extrabold bg-gradient-to-r from-[#a855f7] to-[#f23a70] bg-clip-text text-transparent">
                  {feature.metricValue}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
