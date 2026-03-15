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
  { href: '/ai', label: 'AI 简历在线润色' },
  { href: '/templates', label: 'ATS 友好简历模板' },
  { href: '/import', label: 'AI 文本转简历生成器' },
  { href: '/ai', label: '免费 AI 简历优化工具' },
  { href: '/articles?category=resume-writing', label: '简历优化技巧大全' },
  { href: '/articles?category=interview-tips', label: '面试技巧与自我介绍模板' },
  { href: '/articles?category=fresh-graduate', label: '应届生求职简历指南' },
  { href: '/articles?category=career-guide', label: '职场转行简历怎么写' },
  { href: '/articles', label: '求职攻略与简历写作教程' },
  { href: '/about', label: '独立开发者打造的免费简历工具' },
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
              <Image src="/logo-aijianli.png" alt="智简简历" width={120} height={40} className="h-10 w-auto object-contain" />
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed">
              <strong>aijianli.cn (智简简历)</strong>
              <br />
              永久免费的 AI 极简简历在线制作工具。
              <br />
              让简历制作变得简单、免费、可导出。
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
              <li><Link href="/templates" className="hover:text-violet-600 transition-colors">岗位简历模板</Link></li>
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
            <h4 className="font-bold text-slate-900 mb-6">热门搜索入口</h4>
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
          <div className="flex flex-col items-center gap-2 text-xs text-slate-400 md:items-start">
            <p>
              © {new Date().getFullYear()} 智简简历. All rights reserved.
            </p>
            <p>
              版权 © 2026{' '}
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-slate-600 transition-colors"
              >
                鄂ICP备2021017715号-1
              </a>{' '}
              保留所有权利
            </p>
          </div>
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
