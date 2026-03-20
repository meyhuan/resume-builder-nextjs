'use client';

import React from 'react';
import { LandingButton } from './LandingButton';
import { Wand2, FileText } from 'lucide-react';
import { EditorShowcase } from './EditorShowcase';
import Link from 'next/link';

const TRUST_STATS = [
  { label: 'Job Seekers', value: '10,000+' },
  { label: 'Free Forever', value: '100%' },
  { label: 'Resumes Created', value: '50,000+' },
];

export const LandingHero = () => {
  return (
    <section id="hero" className="relative pt-20 pb-16 overflow-hidden bg-white selection:bg-fuchsia-200">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-violet-500/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-fuchsia-500/20 rounded-full blur-[100px] animate-pulse-slow [animation-delay:2s]" />
        <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] bg-cyan-400/10 rounded-full blur-[80px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Centered Hero Content */}
        <div className="text-center max-w-4xl mx-auto flex flex-col items-center gap-5 animate-in slide-in-from-bottom duration-700">
          {/* Badges */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50/50 border border-violet-100 text-[11px] font-medium text-violet-600 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
              </span>
              ✨ Free Forever — No Watermarks, No Paywalls
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 leading-[1.15] tracking-tight">
            Build a Professional Resume
            <br />
            <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
              in Minutes with AI
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-base lg:text-lg text-slate-500 max-w-2xl leading-relaxed mt-2 mx-auto">
            Stop staring at a blank page. <strong className="text-slate-700 font-semibold">AI writes tailored resume content based on your experience.</strong> ATS-friendly templates, real-time editing, and <strong className="text-slate-700 font-semibold">free HD PDF export — no watermarks, no tricks</strong>.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
            <Link href="/ai">
              <LandingButton size="lg" className="rounded-full shadow-[0_8px_20px_rgba(139,92,246,0.25)] hover:shadow-[0_10px_25px_rgba(139,92,246,0.35)] text-base px-8 h-12">
                <Wand2 className="w-5 h-5 mr-2" />
                Build My Resume Free
              </LandingButton>
            </Link>
            <Link href="/editor/new">
              <LandingButton variant="outline" size="lg" className="rounded-full text-slate-700 hover:text-violet-700 bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-violet-200 h-12 px-8 transition-all duration-300">
                <span className="flex items-center gap-2 font-medium">
                  <FileText className="w-4 h-4" /> Start from Scratch
                </span>
              </LandingButton>
            </Link>
          </div>

          {/* Trust Stats Bar */}
          <div className="flex items-center justify-center gap-6 sm:gap-12 mt-8 mb-2">
            {TRUST_STATS.map((stat, index) => (
              <React.Fragment key={stat.label}>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">{stat.value}</span>
                  <span className="text-xs sm:text-sm text-slate-500 font-medium">{stat.label}</span>
                </div>
                {index < TRUST_STATS.length - 1 && (
                  <div className="w-px h-10 bg-slate-200" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Hero Visual — Interactive Editor Showcase */}
        <div className="relative mt-10 max-w-5xl mx-auto animate-in zoom-in duration-1000 delay-200">
          <EditorShowcase />
        </div>
      </div>

      <style jsx global>{`
        @keyframes gradient-x {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-x {
          animation: gradient-x 6s ease infinite;
        }
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </section>
  );
};
