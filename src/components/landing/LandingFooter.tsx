import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Github, Twitter, MessageCircle } from 'lucide-react';

export const LandingFooter = () => {
  return (
    <footer className="bg-[#F8FAFC] border-t border-white/50 pt-16 pb-8 relative overflow-hidden">
      {/* Footer Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-[#8B5CF6]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1 space-y-4">
            <Link href="/" className="inline-block">
              <Image src="/logo-aijianli.png" alt="智简简历" width={120} height={40} className="h-10 w-auto object-contain" />
            </Link>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              年轻人的第一款 AI 简历工具。
              <br />
              让求职变得简单、有趣、高效。
            </p>
            <div className="flex gap-4 pt-2">
              <button className="w-9 h-9 rounded-xl bg-white/60 backdrop-blur-md border border-white shadow-sm flex items-center justify-center text-slate-400 hover:bg-[#F5F3FF] hover:text-[#8B5CF6] hover:border-[#8B5CF6]/20 transition-all">
                <Github className="w-4 h-4" />
              </button>
              <button className="w-9 h-9 rounded-xl bg-white/60 backdrop-blur-md border border-white shadow-sm flex items-center justify-center text-slate-400 hover:bg-sky-50 hover:text-sky-500 hover:border-sky-500/20 transition-all">
                <Twitter className="w-4 h-4" />
              </button>
              <button className="w-9 h-9 rounded-xl bg-white/60 backdrop-blur-md border border-white shadow-sm flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-500/20 transition-all">
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 mb-6">产品</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-500">
              <li><Link href="/dashboard" className="hover:text-[#8B5CF6] transition-colors">简历模板</Link></li>
              <li><Link href="/dashboard" className="hover:text-[#8B5CF6] transition-colors">AI 简历生成</Link></li>
              <li><Link href="/dashboard" className="hover:text-[#8B5CF6] transition-colors">求职攻略</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 mb-6">支持</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-500">
              <li><Link href="/dashboard" className="hover:text-[#8B5CF6] transition-colors">帮助中心</Link></li>
              <li><Link href="/dashboard" className="hover:text-[#8B5CF6] transition-colors">用户反馈</Link></li>
              <li><Link href="/dashboard" className="hover:text-[#8B5CF6] transition-colors">商务合作</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 mb-6">关注我们</h4>
            <div className="flex items-start gap-4 p-4 bg-white/60 backdrop-blur-md rounded-2xl border border-white shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center text-[10px] font-medium text-slate-400 border border-slate-100/50">
                {/* QR Code Placeholder */}
                <div className="w-full h-full relative flex items-center justify-center">
                   {/* In real app, put QR image here */}
                   <span>QR</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-800 mb-1.5">扫码关注公众号</p>
                <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
                  获取最新求职干货
                  <br />
                  联系开发者反馈建议
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t border-slate-200/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 font-medium text-xs">
            © {new Date().getFullYear()} 智简简历. Designed for Gen Z.
          </p>
          <div className="flex gap-6 text-xs font-medium text-slate-400">
            <Link href="#" className="hover:text-slate-600 transition-colors">隐私政策</Link>
            <Link href="#" className="hover:text-slate-600 transition-colors">服务条款</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
