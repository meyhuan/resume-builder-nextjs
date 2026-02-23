'use client';

import React from 'react';
import { Wand2, Sparkles, Brain, FileCheck, Languages, Target, Check, ArrowRight } from 'lucide-react';

interface FeaturesSectionProps {
  id?: string;
}

/** Mini visual: AI generating resume — two-panel input→output layout */
const AiGenerateVisual = (): React.ReactElement => (
  <div className="mt-3 flex gap-3 flex-1 min-h-0">
    {/* Left: User input form */}
    <div className="flex-1 bg-white/60 backdrop-blur-sm rounded-xl border border-white shadow-sm p-3 space-y-2 flex flex-col">
      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">输入信息</div>
      {[
        { label: '姓名', value: '张小明' },
        { label: '目标岗位', value: '前端开发工程师' },
        { label: '学历', value: '北京大学 · 本科' },
      ].map((field) => (
        <div key={field.label} className="space-y-0.5">
          <div className="text-[9px] text-slate-400">{field.label}</div>
          <div className="h-6 bg-white rounded-md border border-slate-100 px-2 flex items-center text-[10px] text-slate-700 font-medium">{field.value}</div>
        </div>
      ))}
      <div className="flex items-center gap-1.5 mt-auto pt-1">
        <div className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-pulse" />
        <span className="text-[10px] font-medium text-[#8B5CF6]">AI 正在分析...</span>
      </div>
    </div>
    {/* Right: Generated resume output */}
    <div className="flex-1 bg-white/60 backdrop-blur-sm rounded-xl border border-white shadow-sm p-3 space-y-2 flex flex-col">
      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">生成结果</div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-[#8B5CF6] flex items-center justify-center text-white text-[9px] font-bold shrink-0">张</div>
        <div className="space-y-0.5">
          <div className="h-2 w-12 bg-slate-200 rounded" />
          <div className="h-1.5 w-20 bg-slate-100 rounded" />
        </div>
      </div>
      {['w-full', 'w-[90%]', 'w-[75%]', 'w-full', 'w-[85%]'].map((w, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="w-0.5 h-2 rounded-full bg-[#8B5CF6]/30" />
          <div className={`h-1.5 ${w} bg-slate-100 rounded animate-pulse`} style={{ animationDelay: `${i * 150}ms` }} />
        </div>
      ))}
      <div className="flex flex-wrap gap-1 mt-auto pt-1">
        {['React', 'TS', 'Vue'].map((tag) => (
          <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded bg-[#8B5CF6]/10 text-[#8B5CF6] font-medium">{tag}</span>
        ))}
      </div>
    </div>
  </div>
);

/** Mini visual: Before/After text polish */
const PolishVisual = (): React.ReactElement => (
  <div className="mt-3 space-y-2">
    <div className="bg-rose-50/80 rounded-lg px-3 py-1 border border-rose-100">
      <div className="text-[10px] text-rose-400 font-medium mb-1">优化前</div>
      <div className="text-[11px] text-slate-500 line-through decoration-rose-300">负责项目前端开发工作</div>
    </div>
    <div className="flex justify-center">
      <ArrowRight className="w-3.5 h-3.5 text-fuchsia-400 rotate-90" />
    </div>
    <div className="bg-emerald-50/80 rounded-lg px-3 py-1 border border-emerald-100">
      <div className="text-[10px] text-emerald-500 font-medium mb-1">优化后</div>
      <div className="text-[11px] text-slate-700 font-medium">主导前端架构升级，首屏加载提速 40%</div>
    </div>
  </div>
);

/** Mini visual: JD Match percentage ring */
const MatchVisual = (): React.ReactElement => (
  <div className="mt-8 flex items-center gap-4">
    <div className="relative w-16 h-16 shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="28" fill="none" stroke="#f1f5f9" strokeWidth="5" />
        <circle cx="32" cy="32" r="28" fill="none" stroke="#F59E0B" strokeWidth="5" strokeDasharray="176" strokeDashoffset="30" strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-amber-600">92%</span>
      </div>
    </div>
    <div className="space-y-1.5 flex-1">
      {['技能匹配', '经验契合', '学历符合'].map((label) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-100 flex items-center justify-center">
            <Check className="w-2 h-2 text-amber-600" />
          </div>
          <span className="text-[10px] text-slate-600 font-medium">{label}</span>
        </div>
      ))}
    </div>
  </div>
);

/** Mini visual: ATS checklist */
const AtsVisual = (): React.ReactElement => (
  <div className="mt-3 space-y-2">
    {['PDF 格式正确', '关键词覆盖', '结构化信息', '无乱码风险'].map((item) => (
      <div key={item} className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white shadow-sm">
        <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
          <Check className="w-2.5 h-2.5 text-emerald-600" />
        </div>
        <span className="text-[11px] font-medium text-slate-700">{item}</span>
      </div>
    ))}
  </div>
);

/** Mini visual: Language toggle */
const LanguageVisual = (): React.ReactElement => (
  <div className="mt-3 space-y-2.5">
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-100">中文</span>
      <ArrowRight className="w-3 h-3 text-slate-300" />
      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">English</span>
    </div>
    <div className="bg-white/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-white shadow-sm space-y-1.5">
      <div className="text-[10px] text-slate-400">教育背景 → Education</div>
      <div className="text-[10px] text-slate-400">工作经历 → Work Experience</div>
      <div className="text-[10px] text-slate-400">技能特长 → Skills</div>
    </div>
  </div>
);

/** Feature card visual components mapped by index */
const FEATURE_VISUALS: readonly React.FC[] = [AiGenerateVisual, PolishVisual, MatchVisual, AtsVisual, LanguageVisual];

interface FeatureItem {
  readonly title: string;
  readonly description: string;
  readonly icon: React.ReactElement;
  readonly color: string;
  readonly bgColor: string;
  readonly span: string;
}

const AI_FEATURES: readonly FeatureItem[] = [
  {
    title: 'AI 一键生成',
    description: '输入基本信息，AI 自动生成完整、专业的简历内容。零经验也能写出让 HR 眼前一亮的简历。',
    icon: <Brain className="w-5 h-5" />,
    color: 'text-[#8B5CF6]',
    bgColor: 'bg-[#8B5CF6]/10',
    span: 'md:col-span-2 md:row-span-2',
  },
  {
    title: 'AI 内容润色',
    description: '一键优化措辞，让经历描述更有说服力。',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'text-fuchsia-500',
    bgColor: 'bg-fuchsia-500/10',
    span: 'md:col-span-1 md:row-span-1',
  },
  {
    title: 'JD 智能匹配',
    description: '粘贴职位描述，AI 自动调整简历重点。',
    icon: <Target className="w-5 h-5" />,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    span: 'md:col-span-1 md:row-span-1',
  },
  {
    title: 'ATS 格式优化',
    description: 'PDF 可被主流招聘系统完美解析。',
    icon: <FileCheck className="w-5 h-5" />,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    span: 'md:col-span-1 md:row-span-1',
  },
  {
    title: '多语言生成',
    description: '中英文一键切换，外企投递不再愁。',
    icon: <Languages className="w-5 h-5" />,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    span: 'md:col-span-1 md:row-span-1',
  },
];

export const LandingFeatures = ({ id }: FeaturesSectionProps): React.ReactElement => {
  return (
    <section id={id} className="py-24 bg-[#F8FAFC] relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-[#8B5CF6]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 backdrop-blur-sm border border-white rounded-full shadow-sm mb-6">
            <Wand2 className="w-4 h-4 text-[#8B5CF6]" />
            <span className="text-sm font-semibold text-[#8B5CF6]">AI 加持</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
            不仅好用，
            <span className="text-[#8B5CF6]">还很聪明</span>
          </h2>
          <p className="text-lg text-slate-500">
            AI 贯穿简历制作全流程，从生成到润色到投递优化，帮你节省 90% 的时间。
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 auto-rows-[220px]">
          {AI_FEATURES.map((feature, index) => {
            const Visual = FEATURE_VISUALS[index];
            const isHero: boolean = index === 0;
            return (
              <div
                key={feature.title}
                className={`group relative rounded-2xl border border-white bg-white/70 backdrop-blur-md shadow-sm hover:shadow-md hover:bg-white/90 transition-all duration-200 overflow-hidden flex flex-col ${feature.span} ${isHero ? 'p-6' : 'p-5'}`}
              >
                {/* Icon + Title */}
                <div className="flex items-center gap-3 mb-1">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${feature.bgColor} ${feature.color} shrink-0`}>
                    {feature.icon}
                  </div>
                  <h3 className={`font-bold text-slate-800 ${isHero ? 'text-xl' : 'text-base'}`}>{feature.title}</h3>
                </div>
                {/* Description */}
                <p className={`text-slate-500 leading-relaxed ${isHero ? 'text-sm' : 'text-xs'}`}>{feature.description}</p>
                {/* Visual illustration */}
                <Visual />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
