'use client';

import React from 'react';
import { Mouse, Type, Move, Palette, Wand2, FileDown } from 'lucide-react';

interface EditorDemoSectionProps {
  id?: string;
}

const DEMO_STEPS = [
  {
    icon: <Wand2 className="w-5 h-5" />,
    title: 'AI Content Generation',
    description: 'Enter your basic info and AI generates professional resume content — even with zero experience.',
    color: 'violet',
    bgClass: 'bg-violet-100 text-violet-600 group-hover:bg-violet-200',
  },
  {
    icon: <Type className="w-5 h-5" />,
    title: 'WYSIWYG Editing',
    description: 'Click directly on your resume to edit — as easy as writing a document. No more form filling.',
    color: 'fuchsia',
    bgClass: 'bg-fuchsia-100 text-fuchsia-600 group-hover:bg-fuchsia-200',
  },
  {
    icon: <Move className="w-5 h-5" />,
    title: 'Drag & Drop Layout',
    description: 'Freely drag and reorder sections. Your resume, your way.',
    color: 'cyan',
    bgClass: 'bg-cyan-100 text-cyan-600 group-hover:bg-cyan-200',
  },
  {
    icon: <Palette className="w-5 h-5" />,
    title: 'One-Click Themes',
    description: 'Switch colors, fonts, and spacing instantly for a polished look.',
    color: 'amber',
    bgClass: 'bg-amber-100 text-amber-600 group-hover:bg-amber-200',
  },
  {
    icon: <Mouse className="w-5 h-5" />,
    title: 'Live Preview',
    description: 'Every edit appears instantly on a real A4 page — what you see is what you get.',
    color: 'green',
    bgClass: 'bg-green-100 text-green-600 group-hover:bg-green-200',
  },
  {
    icon: <FileDown className="w-5 h-5" />,
    title: 'Multi-Format Export',
    description: 'Export as HD PDF, PNG image, or Markdown — all free, one click.',
    color: 'rose',
    bgClass: 'bg-rose-100 text-rose-600 group-hover:bg-rose-200',
  },
];

export const LandingEditorDemo = ({ id }: EditorDemoSectionProps) => {
  return (
    <section id={id} className="py-24 bg-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-fuchsia-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-50 border border-violet-100 rounded-full mb-6">
            <Mouse className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-violet-600">Not a Form Filler</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
            A True
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500"> Visual Editor</span>
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed">
            Unlike form-based resume tools, AI Resume Pass lets you edit directly on the resume.
            <br className="hidden md:block" />
            Drag, click, type — the resume editor you always wished existed.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEMO_STEPS.map((step, index) => (
            <div
              key={index}
              className="group relative p-7 rounded-2xl border border-slate-100 bg-white hover:shadow-xl hover:shadow-violet-500/5 hover:-translate-y-1 transition-all duration-500"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors duration-300 ${step.bgClass}`}>
                {step.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{step.title}</h3>
              <p className="text-slate-500 leading-relaxed text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
