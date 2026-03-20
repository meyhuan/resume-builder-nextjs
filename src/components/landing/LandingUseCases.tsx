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
    tag: 'Students & Graduates',
    tagColor: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    title: 'Great resumes, even with zero experience',
    pain: 'No internships, no idea what to write, staring at a blank document.',
    solution:
      'AI adapts its guided flow based on your background (student or recent graduate), helping you highlight coursework, campus activities, and club experience using the STAR method.',
    features: ['Identity-tailored AI flow', 'Campus experience structuring', 'Entry-level templates'],
    cta: 'Build My Resume Free',
    href: '/ai',
  },
  {
    icon: <Briefcase className="w-5 h-5" />,
    tag: 'Professionals & Career Changers',
    tagColor: 'bg-blue-50 text-blue-600 border-blue-100',
    title: 'Highlight transferable skills, match any role',
    pain: 'Switching careers but unsure how to reframe your experience. Sending resumes with no callbacks.',
    solution:
      'Select your target role and AI adjusts tone, keywords, and emphasis automatically. Section-level AI polish refines each work entry for maximum impact.',
    features: ['Role-specific generation', 'Section-level AI polish', 'JD smart matching'],
    cta: 'Optimize My Resume',
    href: '/ai',
  },
  {
    icon: <Bot className="w-5 h-5" />,
    tag: 'AI Tool Users',
    tagColor: 'bg-violet-50 text-violet-600 border-violet-100',
    title: 'Turn AI-generated text into a polished resume',
    pain: 'Used ChatGPT or Claude to draft resume content, but the formatting is ugly and you can\'t export a proper PDF.',
    solution:
      'Paste any text resume content and AI auto-parses the structure, applies professional templates, and exports a crisp PDF. Works with content from ChatGPT, Claude, Gemini, and more.',
    features: ['AI smart formatting', 'Auto structure parsing', 'Pro templates + PDF export'],
    cta: 'Format My Resume',
    href: '/import',
  },
  {
    icon: <Target className="w-5 h-5" />,
    tag: 'Active Job Seekers',
    tagColor: 'bg-amber-50 text-amber-600 border-amber-100',
    title: 'One resume, multiple tailored versions',
    pain: 'Applying to marketing, product, and ops roles with the same generic resume gets zero callbacks.',
    solution:
      'Paste different job descriptions and AI rewrites your resume highlights for each. Generate multiple targeted versions, each optimized with role-specific keywords to boost your pass rate.',
    features: ['Auto JD-matched rewriting', 'One-click version branching', 'ATS keyword optimization'],
    cta: 'Customize My Resume',
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
            <span className="text-sm font-semibold text-violet-600">Use Cases</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
            Whoever You Are,
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500"> We’ve Got You Covered</span>
          </h2>
          <p className="text-lg text-slate-500">
            AI adapts its strategy for different backgrounds and scenarios, solving your specific resume challenges.
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
                <span className="font-medium text-rose-400">Pain point: </span>{item.pain}
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
