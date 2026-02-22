'use client';

import React from 'react';
import { Mouse, Type, Move, Palette, Wand2, FileDown } from 'lucide-react';

interface EditorDemoSectionProps {
  id?: string;
}

const DEMO_STEPS = [
  {
    icon: <Wand2 className="w-5 h-5" />,
    title: 'AI 智能生成',
    description: '输入你的基本信息，AI 自动生成专业简历内容，零经验也能写出好简历。',
    color: 'violet',
    bgClass: 'bg-[#8B5CF6]/10 text-[#8B5CF6] group-hover:bg-[#8B5CF6]/20',
  },
  {
    icon: <Type className="w-5 h-5" />,
    title: '所见即所得编辑',
    description: '直接在简历上点击编辑，像写文档一样简单。告别繁琐的表格填写。',
    color: 'fuchsia',
    bgClass: 'bg-fuchsia-500/10 text-fuchsia-500 group-hover:bg-fuchsia-500/20',
  },
  {
    icon: <Move className="w-5 h-5" />,
    title: '拖拽排版',
    description: '模块自由拖拽，一键调整顺序。你的简历你做主。',
    color: 'cyan',
    bgClass: 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20',
  },
  {
    icon: <Palette className="w-5 h-5" />,
    title: '一键换肤',
    description: '配色、字号、间距一键切换，秒变高级感。',
    color: 'amber',
    bgClass: 'bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20',
  },
  {
    icon: <Mouse className="w-5 h-5" />,
    title: '实时预览',
    description: '编辑即预览，所有修改立刻呈现在 A4 纸面上。',
    color: 'green',
    bgClass: 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20',
  },
  {
    icon: <FileDown className="w-5 h-5" />,
    title: '多格式导出',
    description: '高清 PDF、PNG 图片、Markdown，一键免费导出。',
    color: 'rose',
    bgClass: 'bg-rose-500/10 text-rose-500 group-hover:bg-rose-500/20',
  },
];

export const LandingEditorDemo = ({ id }: EditorDemoSectionProps) => {
  return (
    <section id={id} className="py-24 bg-[#F8FAFC] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#8B5CF6]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md border border-white rounded-full mb-6 shadow-sm">
            <Mouse className="w-4 h-4 text-[#8B5CF6]" />
            <span className="text-sm font-semibold text-slate-700">不是表格工具</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-6 tracking-tight">
            真正的
            <span className="text-[#8B5CF6]"> 可视化编辑器</span>
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed">
            不同于市面上的「填表格」工具，智简简历让你直接在简历上编辑。
            <br className="hidden md:block" />
            拖拽、点击、输入 —— 就像你想象中简历编辑器该有的样子。
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEMO_STEPS.map((step, index) => (
            <div
              key={index}
              className="group relative p-7 rounded-2xl border border-white bg-white/60 backdrop-blur-md shadow-sm hover:shadow-md hover:bg-white/80 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors duration-300 shadow-sm ${step.bgClass}`}>
                {step.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{step.title}</h3>
              <p className="text-slate-500 leading-relaxed text-sm font-medium">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
