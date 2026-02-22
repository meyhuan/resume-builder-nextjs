'use client';

import React, { useState } from 'react';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQSectionProps {
  id?: string;
}

const faqItems = [
  {
    question: '智简简历是免费的吗？',
    answer: '是的。智简简历的核心功能始终对所有用户免费，包括：AI 辅助生成简历、实时可视化排版、内容润色/结构重写/JD 匹配、多语言自动生成、模板拖拽排版、Web/小程序多端同步、免费模板无限次导出。'
  },
  {
    question: '导出简历的最佳格式是什么？',
    answer: '目前招聘方公认的 PDF 格式，是最优简历文件格式。PDF 能最大限度保持排版一致性，ATS 也可以良好识别。目前智简简历，支持一键导出高清 PDF 简历。'
  },
  {
    question: '我没有实习/项目怎么写简历？',
    answer: '智简简历内置针对“零经验”的 AI 引导，会帮你：挖掘课程作业、转换校园经历、结构化个人特长、补齐求职行业需要的技能点。非常适合大一到大三、转专业、跨方向求职的同学。'
  },
  {
    question: '如何针对不同岗位进行针对性的优化简历？',
    answer: '这正是智简简历的强项之一：从一份基础简历，一键派生出多个版本，针对不同 JD 自动重写要点。非常适合同时投运营、产品、数据、市场等多个方向的同学。'
  },
  {
    question: '能在手机上编辑吗？',
    answer: '可以。智简简历支持：Web 网页版、微信小程序。PC/平板/手机均可实时同步，换设备也不会丢失任何内容。'
  },
  {
    question: '为什么智简简历比其他简历编辑工具更适合求职？',
    answer: '因为智简简历是为“学生与求职者”设计的，而不是通用模板工具。相比于 Word 等文档工具，智简简历针对简历排版做了专业优化，简历排版更加高效。相对于其他简历工具来讲，智简简历提供了更加深度的 AI 集成，辅助生成简历内容质量更高。'
  },
  {
    question: '使用过程中遇到问题怎么办？',
    answer: '你可以通过：官网右下角、小程序留言、官方公众号，随时联系到人工支持，您的问题都能获得及时回复。'
  }
];

export const LandingFAQ = ({ id }: FAQSectionProps) => {
  const [activeIndices, setActiveIndices] = useState<number[]>([0]);

  const toggleItem = (index: number) => {
    setActiveIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  return (
    <section id={id} className="py-24 bg-slate-50 relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6 tracking-tight">
            FAQ <span className="text-slate-400 font-normal">常见问题</span>
          </h2>
        </div>

        <div className="space-y-4">
          {faqItems.map((item, index) => {
            const isActive = activeIndices.includes(index);
            return (
              <div
                key={index}
                className={cn(
                  "group bg-white rounded-2xl border border-slate-200 transition-all duration-300 overflow-hidden cursor-pointer",
                  isActive ? "shadow-lg shadow-violet-500/5 border-violet-200 ring-1 ring-violet-500/20" : "hover:border-violet-300"
                )}
                onClick={() => toggleItem(index)}
              >
                <div className="flex items-start justify-between p-6 gap-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "mt-1 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                      isActive ? "bg-violet-100 text-violet-600" : "bg-slate-100 text-slate-400 group-hover:text-violet-500"
                    )}>
                      <MessageCircle className="w-3.5 h-3.5" />
                    </div>
                    <h3 className={cn(
                      "text-lg font-bold leading-tight transition-colors pt-0.5",
                      isActive ? "text-violet-900" : "text-slate-700 group-hover:text-violet-700"
                    )}>
                      {item.question}
                    </h3>
                  </div>
                  <ChevronDown className={cn(
                    "w-5 h-5 text-slate-300 transition-transform duration-300 flex-shrink-0 mt-1",
                    isActive && "rotate-180 text-violet-500"
                  )} />
                </div>
                
                <div className={cn(
                  "px-6 sm:px-[64px] overflow-hidden transition-all duration-300 ease-in-out",
                  isActive ? "max-h-[500px] pb-6 opacity-100" : "max-h-0 opacity-0"
                )}>
                  <p className="text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
