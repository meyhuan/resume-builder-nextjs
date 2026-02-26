'use client';

import React from 'react';
import Link from 'next/link';
import { GraduationCap, Briefcase, Bot, Target, ArrowRight } from 'lucide-react';

interface UseCasesSectionProps {
  id?: string;
}

interface UseCaseItem {
  readonly icon: React.ReactElement;
  readonly tag: string;
  readonly tagColor: string;
  readonly title: string;
  readonly pain: string;
  readonly solution: string;
  readonly features: readonly string[];
  readonly cta: string;
  readonly href: string;
}

const USE_CASES: readonly UseCaseItem[] = [
  {
    icon: <GraduationCap className="w-5 h-5" />,
    tag: '应届生 / 在校生',
    tagColor: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    title: '零经验也能写出好简历',
    pain: '没有实习经历、不知道简历写什么、打开 Word 无从下手。',
    solution:
      '智简简历根据你的身份（在校生/应届生）自动调整 AI 引导流程，帮你挖掘课程项目、校园活动、社团经历，用 STAR 法则生成专业简历条目。',
    features: ['身份定制 AI 引导', '校园经历结构化', '零经验专属模板'],
    cta: '免费生成简历',
    href: '/ai',
  },
  {
    icon: <Briefcase className="w-5 h-5" />,
    tag: '职场人 / 转行者',
    tagColor: 'bg-blue-50 text-blue-600 border-blue-100',
    title: '突出可迁移能力，精准匹配岗位',
    pain: '转行不知道怎么包装经历，投了很多简历却没有回音。',
    solution:
      '选择目标岗位类别，AI 会根据岗位特点自动调整用词和重点。支持模块级 AI 润色，针对单条工作经历精准优化。',
    features: ['岗位针对性生成', '模块级 AI 润色', 'JD 智能匹配'],
    cta: '优化我的简历',
    href: '/ai',
  },
  {
    icon: <Bot className="w-5 h-5" />,
    tag: 'AI 工具用户',
    tagColor: 'bg-violet-50 text-violet-600 border-violet-100',
    title: '有文字内容，一键变成专业简历',
    pain: '用豆包、ChatGPT、DeepSeek 生成了简历内容，但排版丑、无法加头像、不能导出 PDF。',
    solution:
      '粘贴任意文本简历内容，AI 自动解析结构、应用专业模板排版，一键导出高清 PDF。支持豆包、通义千问、ChatGPT、DeepSeek、Kimi 等平台生成的内容。',
    features: ['AI 智能排版', '自动结构化解析', '专业模板 + PDF 导出'],
    cta: '立即排版',
    href: '/import',
  },
  {
    icon: <Target className="w-5 h-5" />,
    tag: '海投求职者',
    tagColor: 'bg-amber-50 text-amber-600 border-amber-100',
    title: '一份简历，多个版本，精准投递',
    pain: '同时投运营、产品、市场多个方向，一份简历投所有岗位效果很差。',
    solution:
      '粘贴不同岗位的 JD，AI 自动重写简历要点，一键派生多个针对性版本。每个版本都针对目标岗位关键词优化，大幅提升简历通过率。',
    features: ['JD 自动匹配重写', '多版本一键派生', 'ATS 关键词优化'],
    cta: '开始定制简历',
    href: '/ai',
  },
];

export const LandingUseCases = ({ id }: UseCasesSectionProps): React.ReactElement => {
  return (
    <section id={id} className="py-24 bg-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-fuchsia-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-full shadow-sm mb-6">
            <Target className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-violet-600">场景解决方案</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
            不管你是谁，
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500">都能搞定简历</span>
          </h2>
          <p className="text-lg text-slate-500">
            针对不同求职身份和场景，AI 自动调整策略，精准解决你的简历痛点。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {USE_CASES.map((item) => (
            <article
              key={item.tag}
              className="group relative p-7 rounded-2xl border border-slate-100 bg-white/70 backdrop-blur-md shadow-sm hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-1 transition-all duration-500 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${item.tagColor}`}>
                  {item.tag}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-400 mb-3 leading-relaxed">
                <span className="font-medium text-rose-400">痛点：</span>{item.pain}
              </p>
              <p className="text-sm text-slate-600 leading-relaxed flex-1">{item.solution}</p>
              <div className="flex flex-wrap gap-2 mt-4 mb-5">
                {item.features.map((f) => (
                  <span key={f} className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                    {f}
                  </span>
                ))}
              </div>
              <Link
                href={item.href}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors group/link"
              >
                {item.cta}
                <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-0.5" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
