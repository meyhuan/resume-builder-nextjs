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
    title: 'Free Forever',
    description: 'All features, all templates, all exports — completely free. No VIP tiers, no paywalls.',
  },
  {
    icon: <Shield className="w-5 h-5 text-violet-500" />,
    title: 'Privacy First',
    description: 'Your resume data belongs to you. Never used for AI training, never shared with third parties.',
  },
  {
    icon: <Code2 className="w-5 h-5 text-cyan-500" />,
    title: 'Always Improving',
    description: 'As an indie developer, I continuously listen to feedback and ship improvements.',
  },
  {
    icon: <MessageCircle className="w-5 h-5 text-green-500" />,
    title: 'Real Human Support',
    description: 'Have a question? Reach out anytime. No chatbots — you\'ll hear directly from the developer.',
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
              <span className="text-sm font-semibold text-rose-600">Our Promise</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Why Is It
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500"> Completely Free?</span>
            </h2>

            <div className="space-y-4 text-lg text-slate-600 leading-relaxed">
              <p>
                Hi, I’m the developer behind AI Resume Pass.
              </p>
              <p>
                I remember the anxiety of job hunting after graduation — opening Word with no clue how to format a resume,
                only to find tools that were either ugly, expensive, or slapped watermarks on exports.
              </p>
              <p>
                So I decided to build something different:
                <span className="font-semibold text-slate-900"> beautiful, powerful, and completely free</span> —
                so every job seeker can have a professional resume without barriers.
              </p>
            </div>

            <Link href="/ai">
              <LandingButton size="lg" className="rounded-full shadow-lg shadow-violet-500/30 text-lg px-8 mt-4">
                Build My Resume Free
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
