'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Github, Twitter, MessageCircle } from 'lucide-react';
import { LegalDialog } from '@/components/legal/LegalDialog';

type LegalTab = 'privacy' | 'terms';

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
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1 space-y-4">
            <Link href="/" className="inline-block">
              <Image src="/logo-aijianli.png" alt="智简简历" width={120} height={40} className="h-10 w-auto object-contain" />
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed">
              永久免费的 AI 简历工具。
              <br />
              让求职变得简单、高效。
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
            <h4 className="font-bold text-slate-900 mb-6">产品</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><Link href="/#templates" className="hover:text-violet-600 transition-colors">简历模板</Link></li>
              <li><Link href="/ai" className="hover:text-violet-600 transition-colors">AI 简历生成</Link></li>
              <li><Link href="/import" className="hover:text-violet-600 transition-colors">AI 文本转简历</Link></li>
              <li><Link href="/articles" className="hover:text-violet-600 transition-colors">求职攻略</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-6">支持</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><Link href="/about" className="hover:text-violet-600 transition-colors">关于开发者</Link></li>
              <li><Link href="/about" className="hover:text-violet-600 transition-colors">用户反馈</Link></li>
              <li><Link href="/about" className="hover:text-violet-600 transition-colors">商务合作</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-6">联系开发者</h4>
            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-20 h-auto bg-white rounded-xl shadow-sm overflow-hidden shrink-0">
                <Image src="/wx.webp" alt="微信二维码" width={600} height={818} className="w-full h-auto object-contain" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-900 mb-1">微信：kkyycc01</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  扫码添加「职场学长袁小智」
                  <br />
                  问题反馈 · 求职交流 · 商务合作
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-xs">
            © {new Date().getFullYear()} 智简简历. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-slate-400">
            <button type="button" onClick={() => openLegal('privacy')} className="hover:text-slate-600 transition-colors">隐私政策</button>
            <button type="button" onClick={() => openLegal('terms')} className="hover:text-slate-600 transition-colors">服务条款</button>
          </div>
        </div>
      </div>
    </footer>

    <LegalDialog isOpen={legalOpen} onClose={() => setLegalOpen(false)} initialTab={legalTab} />
    </>
  );
};
