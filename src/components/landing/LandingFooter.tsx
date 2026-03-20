'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Github, Twitter, MessageCircle } from 'lucide-react';
import { LegalDialog } from '@/components/legal/LegalDialog';

type LegalTab = 'privacy' | 'terms';
type FooterLinkItem = {
  href: string;
  label: string;
};

const LONG_TAIL_LINKS: ReadonlyArray<FooterLinkItem> = [
  { href: '/ai', label: 'AI Resume Polish Online' },
  { href: '/templates', label: 'ATS-Friendly Resume Templates' },
  { href: '/import', label: 'AI Text to Resume Generator' },
  { href: '/ai', label: 'Free AI Resume Optimizer' },
  { href: '/articles?category=resume-writing', label: 'Resume Writing Tips' },
  { href: '/articles?category=interview-tips', label: 'Interview Tips & Templates' },
  { href: '/articles?category=fresh-graduate', label: 'Graduate Resume Guide' },
  { href: '/articles?category=career-guide', label: 'Career Change Resume Tips' },
  { href: '/articles', label: 'Career Guides & Tutorials' },
  { href: '/about', label: 'About the Developer' },
];

export const LandingFooter = () => {
  const [legalOpen, setLegalOpen] = useState<boolean>(false);
  const [legalTab, setLegalTab] = useState<LegalTab>('privacy');

  const openLegal = (tab: LegalTab): void => {
    setLegalTab(tab);
    setLegalOpen(true);
  };

  return (
    <>
    <footer className="bg-white border-t border-slate-100 pt-16 pb-8 relative overflow-hidden">
      {/* Footer Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid md:grid-cols-5 gap-12 mb-16">
          <div className="col-span-1 space-y-4">
            <Link href="/" className="inline-block">
              <Image src="/logo-aijianli.png" alt="AI Resume Pass" width={120} height={40} className="h-10 w-auto object-contain" />
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed">
              <strong>AI Resume Pass</strong>
              <br />
              Free AI-powered resume builder.
              <br />
              Simple, beautiful, and exportable.
            </p>
            <div className="flex gap-4 pt-2">
              <button className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-violet-100 hover:text-violet-600 transition-colors">
                <Github className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-sky-100 hover:text-sky-500 transition-colors">
                <Twitter className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-green-100 hover:text-green-600 transition-colors">
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-6">Product</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><Link href="/#templates" className="hover:text-violet-600 transition-colors">Resume Templates</Link></li>
              <li><Link href="/templates" className="hover:text-violet-600 transition-colors">Role-Specific Templates</Link></li>
              <li><Link href="/ai" className="hover:text-violet-600 transition-colors">AI Resume Generator</Link></li>
              <li><Link href="/import" className="hover:text-violet-600 transition-colors">Text to Resume</Link></li>
              <li><Link href="/articles" className="hover:text-violet-600 transition-colors">Career Guide</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-6">Support</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><Link href="/about" className="hover:text-violet-600 transition-colors">About</Link></li>
              <li><Link href="/dashboard/feedback" className="hover:text-violet-600 transition-colors">Feedback</Link></li>
              <li><Link href="/about" className="hover:text-violet-600 transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-6">Popular</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              {LONG_TAIL_LINKS.map((item: FooterLinkItem) => (
                <li key={item.label}>
                  <Link href={item.href} className="hover:text-violet-600 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-6">Contact</h4>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-xs font-semibold text-slate-900 mb-2">Get in Touch</p>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Have feedback or questions?<br />
                Reach out via the feedback page or email us directly.
              </p>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col items-center gap-2 text-xs text-slate-400 md:items-start">
            <p>
              © {new Date().getFullYear()} AI Resume Pass. All rights reserved.
            </p>
          </div>
          <div className="flex gap-6 text-xs text-slate-400">
            <button type="button" onClick={() => openLegal('privacy')} className="hover:text-slate-600 transition-colors">Privacy Policy</button>
            <button type="button" onClick={() => openLegal('terms')} className="hover:text-slate-600 transition-colors">Terms of Service</button>
          </div>
        </div>
      </div>
    </footer>

    <LegalDialog isOpen={legalOpen} onClose={() => setLegalOpen(false)} initialTab={legalTab} />
    </>
  );
};
