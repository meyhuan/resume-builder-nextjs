'use client';

import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import {
  LayoutList,
  Wand2,
  ArrowLeft,
  Save,
  FileDown,
  Undo2,
  Redo2,
  GripVertical,
  Palette,
  Layers,
} from 'lucide-react';

/** Showcase animation phase definition */
interface PhaseConfig {
  readonly id: ShowcasePhase;
  readonly label: string;
  readonly icon: typeof Wand2;
}

type ShowcasePhase = 'ai-generate' | 'theme-switch' | 'template-switch' | 'section-manage';

const PHASES: readonly PhaseConfig[] = [
  { id: 'ai-generate', label: 'AI Generate', icon: Wand2 },
  { id: 'theme-switch', label: 'Theme Colors', icon: Palette },
  { id: 'template-switch', label: 'Templates', icon: Layers },
  { id: 'section-manage', label: 'Sections', icon: LayoutList },
];

const PHASE_DURATION_MS = 5000;

/** Theme color presets for animation */
const THEME_COLORS: readonly string[] = ['#8B5CF6', '#2563EB', '#059669', '#DC2626', '#D97706'];

/** Resume content lines for typing animation */
interface ResumeLine {
  readonly type: 'name' | 'subtitle' | 'contact' | 'section' | 'entry' | 'detail' | 'skill';
  readonly text: string;
}

const RESUME_LINES: readonly ResumeLine[] = [
  { type: 'name', text: 'John Smith' },
  { type: 'subtitle', text: 'Frontend Developer · 3 Years Experience' },
  { type: 'contact', text: 'john@email.com · +1 555-0100 · San Francisco' },
  { type: 'section', text: 'Education' },
  { type: 'entry', text: 'Stanford University — Computer Science (B.S.)' },
  { type: 'detail', text: '2018.09 - 2022.06  |  GPA: 3.8/4.0' },
  { type: 'section', text: 'Work Experience' },
  { type: 'entry', text: 'Google — Senior Frontend Engineer' },
  { type: 'detail', text: '• Led core module development and performance optimization for creator dashboard' },
  { type: 'detail', text: '• Spearheaded frontend architecture upgrade, improving initial load speed by 40%' },
  { type: 'detail', text: '• Led a 5-person team to build live data dashboard from scratch' },
  { type: 'section', text: 'Skills' },
  { type: 'skill', text: 'React · TypeScript · Next.js · Vue · Node.js · TailwindCSS' },
];

/** Section names for drag demo */
const SECTIONS: readonly string[] = ['Personal Info', 'Education', 'Work Experience', 'Projects', 'Skills'];

/** Template names */
const TEMPLATE_NAMES: readonly string[] = ['Simple', 'Professional', 'Modern', 'Creative'];

/** Toolbar item definition */
interface ToolbarItem {
  readonly label: string;
}

const TOOLBAR_ITEMS: readonly ToolbarItem[] = [
  { label: 'Sections' },
  { label: 'Styling' },
  { label: 'Examples' },
  { label: 'AI Optimize' },
];

/**
 * EditorShowcase — Animated, non-interactive showcase of the resume editor.
 * Cycles through phases to demonstrate AI generation, theme switching,
 * template switching, and module management features.
 */
export const EditorShowcase = (): ReactElement => {
  const [phaseIndex, setPhaseIndex] = useState<number>(0);
  const [typingLine, setTypingLine] = useState<number>(0);
  const [colorIndex, setColorIndex] = useState<number>(0);
  const [templateIndex, setTemplateIndex] = useState<number>(0);
  const [dragHighlight, setDragHighlight] = useState<number>(-1);
  const phase: PhaseConfig = PHASES[phaseIndex % PHASES.length];
  const themeColor: string = THEME_COLORS[colorIndex];

  // Phase cycling
  useEffect(() => {
    const timer: NodeJS.Timeout = setInterval(() => {
      setPhaseIndex((p) => (p + 1) % PHASES.length);
      setTypingLine(0);
      setDragHighlight(-1);
    }, PHASE_DURATION_MS);
    return () => clearInterval(timer);
  }, []);

  // AI typing animation
  useEffect(() => {
    if (phase.id !== 'ai-generate') return;
    const timer: NodeJS.Timeout = setInterval(() => {
      setTypingLine((p) => Math.min(p + 1, RESUME_LINES.length));
    }, 300);
    return () => clearInterval(timer);
  }, [phase.id]);

  // Theme color cycling
  useEffect(() => {
    if (phase.id !== 'theme-switch') return;
    const timer: NodeJS.Timeout = setInterval(() => {
      setColorIndex((p) => (p + 1) % THEME_COLORS.length);
    }, 900);
    return () => clearInterval(timer);
  }, [phase.id]);

  // Template cycling
  useEffect(() => {
    if (phase.id !== 'template-switch') return;
    const timer: NodeJS.Timeout = setInterval(() => {
      setTemplateIndex((p) => (p + 1) % TEMPLATE_NAMES.length);
    }, 1200);
    return () => clearInterval(timer);
  }, [phase.id]);

  // Section drag highlight cycling
  useEffect(() => {
    if (phase.id !== 'section-manage') return;
    let step = 0;
    const timer: NodeJS.Timeout = setInterval(() => {
      setDragHighlight(step % SECTIONS.length);
      step++;
    }, 700);
    return () => {
      clearInterval(timer);
      setDragHighlight(-1);
    };
  }, [phase.id]);

  // Determine which toolbar item is highlighted based on phase
  const activeToolbar: string =
    phase.id === 'section-manage'
      ? 'Sections'
      : phase.id === 'theme-switch' || phase.id === 'template-switch'
        ? 'Styling'
        : phase.id === 'ai-generate'
          ? 'AI Optimize'
          : '';

  return (
    <div className="relative">
      {/* Browser Frame */}
      <div className="rounded-2xl overflow-hidden border border-slate-200/60 shadow-[0_20px_60px_rgba(0,0,0,0.08)] bg-white">
        {/* Browser Chrome */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <div className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-4 py-1 bg-white rounded-lg border border-slate-200 text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              airesumepass.com/editor
            </div>
          </div>
        </div>

        {/* Editor Header */}
        <div className="bg-white border-b border-slate-100 px-3 h-9 flex items-center">
          {/* Left: nav + title */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-slate-400 text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded">
              <ArrowLeft className="w-3 h-3" /> Back
            </span>
            <div className="h-3.5 w-px bg-slate-200 mx-0.5" />
            <Undo2 className="w-3 h-3 text-slate-300 mx-0.5" />
            <Redo2 className="w-3 h-3 text-slate-300 mx-0.5" />
            <div className="h-3.5 w-px bg-slate-200 mx-0.5" />
            <span className="text-[10px] font-medium text-slate-600 truncate hidden sm:inline">John's Resume</span>
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full ml-0.5" />
          </div>
          {/* Center: toolbar actions */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-0.5 bg-white/70 backdrop-blur-md rounded-lg p-0.5 border border-slate-100">
              {TOOLBAR_ITEMS.map((item) => (
                <span
                  key={item.label}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-all duration-300 whitespace-nowrap ${
                    activeToolbar === item.label
                      ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
                      : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
          {/* Right: save + export */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[9px] text-emerald-500 hidden lg:inline mr-0.5">Saved</span>
            <Save className="w-3 h-3 text-slate-300" />
            <FileDown className="w-3 h-3 text-slate-300" />
            <span className="px-2 py-0.5 text-[9px] font-medium bg-[#8B5CF6] text-white rounded hidden sm:inline">Download</span>
          </div>
        </div>

        {/* Editor Body */}
        <div className="flex min-h-[360px] lg:min-h-[440px]">
          {/* Canvas Area */}
          <div className="flex-1 bg-[#F8FAFC] p-3 sm:p-4 lg:p-8 flex justify-center items-start overflow-hidden">
            <div
              className="w-full max-w-[340px] bg-white rounded-lg shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden transition-all duration-500"
              style={{ minHeight: 400 }}
            >
              {/* Resume accent bar */}
              <div
                className="h-1 w-full transition-colors duration-700"
                style={{ backgroundColor: themeColor }}
              />
              {/* Resume Content */}
              <div className="p-4 sm:p-5 space-y-2.5">
                {RESUME_LINES.map((line, i) => {
                  const visible: boolean = phase.id === 'ai-generate' ? i < typingLine : true;
                  const isTypingCursor: boolean = phase.id === 'ai-generate' && i === typingLine - 1;
                  if (!visible) return null;
                  return (
                    <div
                      key={`${line.type}-${i}`}
                      className={`transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                    >
                      {line.type === 'name' && (
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 transition-colors duration-700"
                            style={{ backgroundColor: themeColor }}
                          >
                            J
                          </div>
                          <div className="text-sm font-bold text-slate-800">{line.text}</div>
                        </div>
                      )}
                      {line.type === 'subtitle' && (
                        <div className="text-[10px] text-slate-500 -mt-0.5 ml-12">{line.text}</div>
                      )}
                      {line.type === 'contact' && (
                        <div className="text-[9px] text-slate-400 ml-12">{line.text}</div>
                      )}
                      {line.type === 'section' && (
                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 mt-1.5">
                          <div
                            className="w-1 h-3 rounded-full transition-colors duration-700"
                            style={{ backgroundColor: themeColor }}
                          />
                          <span
                            className="text-[10px] font-bold transition-colors duration-700"
                            style={{ color: themeColor }}
                          >
                            {line.text}
                          </span>
                        </div>
                      )}
                      {line.type === 'entry' && (
                        <div className="text-[10px] font-semibold text-slate-700">{line.text}</div>
                      )}
                      {line.type === 'detail' && (
                        <div className="text-[9px] text-slate-500 leading-relaxed">{line.text}</div>
                      )}
                      {line.type === 'skill' && (
                        <div className="flex flex-wrap gap-1">
                          {line.text.split(' · ').map((skill) => (
                            <span
                              key={skill}
                              className="text-[9px] px-1.5 py-0.5 rounded transition-colors duration-700"
                              style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                      {isTypingCursor && (
                        <span className="inline-block w-0.5 h-3 bg-[#8B5CF6] animate-pulse ml-0.5 -mb-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar — hidden on mobile */}
          <div className="hidden lg:flex w-[200px] border-l border-slate-100 bg-white/80 backdrop-blur-md flex-col p-3.5 gap-3 shrink-0 overflow-hidden">
            {/* AI Generate sidebar */}
            {phase.id === 'ai-generate' && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="text-[11px] font-semibold text-slate-700">AI Generation</div>
                <div className="bg-[#8B5CF6]/5 border border-[#8B5CF6]/20 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-pulse" />
                    <span className="text-[10px] font-medium text-[#8B5CF6]">AI is generating content...</span>
                  </div>
                  <div className="w-full bg-[#8B5CF6]/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-[#8B5CF6] rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${(typingLine / RESUME_LINES.length) * 100}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-slate-400 leading-relaxed">
                    Based on your info, AI is generating professional resume content
                  </div>
                </div>
                <div className="space-y-1.5">
                  {['Analyzing job requirements', 'Matching strengths', 'Optimizing wording'].map((step, i) => {
                    const completed: boolean = i <= Math.floor(typingLine / 4);
                    return (
                      <div key={step} className="flex items-center gap-2 text-[10px]">
                        <div
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors duration-300 ${
                            completed ? 'bg-[#8B5CF6] text-white' : 'bg-slate-100 text-slate-300'
                          }`}
                        >
                          <svg className="w-2 h-2" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <span className={completed ? 'text-slate-700' : 'text-slate-400'}>{step}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Theme switch sidebar */}
            {phase.id === 'theme-switch' && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="text-[11px] font-semibold text-slate-700">Color Style</div>
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Theme Color</div>
                <div className="grid grid-cols-5 gap-2">
                  {THEME_COLORS.map((color, i) => (
                    <div
                      key={color}
                      className="w-7 h-7 rounded-full border-2 transition-all duration-300 cursor-default"
                      style={{
                        backgroundColor: color,
                        borderColor: i === colorIndex ? 'white' : 'transparent',
                        boxShadow: i === colorIndex ? `0 0 0 2px ${color}` : 'none',
                        transform: i === colorIndex ? 'scale(1.2)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-1.5">
                      <span className="font-medium text-slate-600">Line Height</span>
                      <span className="text-[#8B5CF6] font-mono bg-[#8B5CF6]/10 px-1 rounded text-[9px]">1.6</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#8B5CF6] rounded-full w-[60%] transition-all" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-1.5">
                      <span className="font-medium text-slate-600">Spacing</span>
                      <span className="text-blue-500 font-mono bg-blue-500/10 px-1 rounded text-[9px]">1.2x</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full w-[45%] transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Template switch sidebar */}
            {phase.id === 'template-switch' && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="text-[11px] font-semibold text-slate-700">Switch Template</div>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATE_NAMES.map((name, i) => (
                    <div
                      key={name}
                      className={`aspect-[3/4] rounded-lg border-2 transition-all duration-300 flex flex-col items-center justify-center gap-1.5 cursor-default ${
                        i === templateIndex
                          ? 'border-[#8B5CF6] bg-[#8B5CF6]/5'
                          : 'border-slate-100 bg-slate-50'
                      }`}
                    >
                      {/* Mini resume skeleton */}
                      <div className="w-[70%] space-y-1">
                        <div className="h-0.5 w-full rounded bg-slate-200" />
                        <div className="h-0.5 w-3/4 rounded bg-slate-200" />
                        <div className="h-0.5 w-full rounded bg-slate-100" />
                        <div className="h-0.5 w-5/6 rounded bg-slate-100" />
                      </div>
                      <span
                        className={`text-[9px] font-medium transition-colors duration-300 ${
                          i === templateIndex ? 'text-[#8B5CF6]' : 'text-slate-400'
                        }`}
                      >
                        {name}
                      </span>
                      {i === templateIndex && (
                        <div className="w-3.5 h-3.5 bg-[#8B5CF6] text-white rounded-full flex items-center justify-center absolute-ish">
                          <svg className="w-2 h-2" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section manage sidebar */}
            {phase.id === 'section-manage' && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="text-[11px] font-semibold text-slate-700">Section Manager</div>
                <div className="space-y-1.5">
                  {SECTIONS.map((section, i) => (
                    <div
                      key={section}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-[10px] font-medium transition-all duration-300 cursor-default ${
                        i === dragHighlight
                          ? 'border-[#8B5CF6] bg-[#8B5CF6]/5 text-[#8B5CF6] scale-[1.03] shadow-sm'
                          : 'border-slate-100 bg-white/60 text-slate-600'
                      }`}
                    >
                      <GripVertical className="w-3 h-3 text-slate-300 shrink-0" />
                      {section}
                    </div>
                  ))}
                </div>
                <div className="text-[9px] text-slate-400 text-center font-medium">Drag to reorder sections</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Feature Labels */}
      <div
        className={`absolute top-[15%] right-0 lg:right-[-2%] bg-white/90 backdrop-blur-lg px-3 py-2 rounded-xl shadow-lg border border-white/50 z-20 transition-all duration-500 ${
          phase.id === 'ai-generate' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-[#8B5CF6]" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500">Generation time</div>
            <div className="text-xs font-bold text-slate-800">Just 3 minutes</div>
          </div>
        </div>
      </div>

      <div
        className={`absolute bottom-[20%] left-0 lg:left-[-2%] bg-white/90 backdrop-blur-lg px-3 py-2 rounded-xl shadow-lg border border-white/50 z-20 transition-all duration-500 ${
          phase.id === 'theme-switch' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
            <Palette className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500">Customize freely</div>
            <div className="text-xs font-bold text-slate-800">One-click colors</div>
          </div>
        </div>
      </div>

      <div
        className={`absolute top-[25%] left-0 lg:left-[-2%] bg-white/90 backdrop-blur-lg px-3 py-2 rounded-xl shadow-lg border border-white/50 z-20 transition-all duration-500 ${
          phase.id === 'template-switch' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
            <Layers className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500">Multiple templates</div>
            <div className="text-xs font-bold text-slate-800">Switch freely</div>
          </div>
        </div>
      </div>

      <div
        className={`absolute bottom-[15%] right-0 lg:right-[-2%] bg-white/90 backdrop-blur-lg px-3 py-2 rounded-xl shadow-lg border border-white/50 z-20 transition-all duration-500 ${
          phase.id === 'section-manage' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
            <LayoutList className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500">Drag & drop</div>
            <div className="text-xs font-bold text-slate-800">Flexible management</div>
          </div>
        </div>
      </div>

      {/* Phase Indicator Pills */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 mt-6 flex-wrap">
        {PHASES.map((p, i) => {
          const Icon = p.icon;
          const isActive: boolean = i === phaseIndex % PHASES.length;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPhaseIndex(i);
                setTypingLine(0);
                setDragHighlight(-1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                isActive
                  ? 'bg-[#8B5CF6] text-white shadow-sm'
                  : 'bg-white/80 backdrop-blur-sm text-slate-500 border border-white shadow-sm hover:bg-white'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span className="hidden sm:inline">{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
