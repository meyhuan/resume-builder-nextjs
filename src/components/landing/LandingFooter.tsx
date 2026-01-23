import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export const LandingFooter = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-100 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-12 mb-16">
        <div className="col-span-1 md:col-span-1">
          <Link href="/" className="inline-block mb-6">
            <Image src="/logo-aijianli.png" alt="智简简历" width={120} height={40} className="h-10 w-auto object-contain" />
          </Link>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            助力每一位求职者打造专业、精美的简历。我们坚持全站功能完全免费，让好简历触手可及。
          </p>
        </div>

        <div>
          <h4 className="font-bold text-gray-900 mb-6">快速链接</h4>
          <ul className="space-y-4 text-sm text-gray-600">
            <li><Link href="/dashboard" className="hover:text-[#a855f7] transition-colors">简历模板</Link></li>
            <li><Link href="/dashboard" className="hover:text-[#a855f7] transition-colors">AI 简历生成</Link></li>
            <li><Link href="/dashboard" className="hover:text-[#a855f7] transition-colors">求职攻略</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-gray-900 mb-6">支持与服务</h4>
          <ul className="space-y-4 text-sm text-gray-600">
            <li><Link href="/dashboard" className="hover:text-[#a855f7] transition-colors">帮助中心</Link></li>
            <li><Link href="/dashboard" className="hover:text-[#a855f7] transition-colors">意见反馈</Link></li>
            <li><Link href="/dashboard" className="hover:text-[#a855f7] transition-colors">关于我们</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-gray-900 mb-6">联系我们</h4>
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
              {/* Placeholder for WeChat QR */}
              <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-400">
                微信扫码
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              扫描左侧二维码<br />
              添加官方客服微信<br />
              获取更多求职帮助
            </p>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-gray-400 text-xs">
          © {new Date().getFullYear()} 智简简历. All rights reserved.
        </p>
        <div className="flex gap-6 text-xs text-gray-400">
          <Link href="#" className="hover:text-gray-600">隐私政策</Link>
          <Link href="#" className="hover:text-gray-600">服务条款</Link>
          <Link href="#" className="hover:text-gray-600">京ICP备12345678号</Link>
        </div>
      </div>
    </footer>
  );
};
