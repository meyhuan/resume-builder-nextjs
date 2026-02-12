'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LandingButton } from './LandingButton';
import { cn } from '@/lib/utils';
import { Menu, X, ChevronDown, User, LogOut } from 'lucide-react';
import { WxLoginDialog } from '../auth/WxLoginDialog';
import { useAuthStore } from '@/store/use-auth-store';

export const LandingHeader = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const { token, userInfo, logout } = useAuthStore();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems = [
    { id: 'templates', label: '简历模板', href: '/dashboard' },
    {
      id: 'ai',
      label: 'AI简历',
      hasDropdown: true,
      items: [
        { id: 'ai-gen', label: 'AI 简历生成', href: '/dashboard' },
        { id: 'ai-diag', label: 'AI 简历诊断', href: '/dashboard' },
      ],
    },
    { id: 'guide', label: '求职攻略', href: '/dashboard' },
    { id: 'about', label: '关于我们', href: '/dashboard' },
  ];

  return (
    <>
      <header className={cn(
        'fixed top-0 left-0 right-0 z-[1000] transition-all duration-300',
        isScrolled 
          ? 'bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.03)] py-3' 
          : 'bg-transparent py-5'
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group transition-transform hover:scale-105">
            <div className="relative">
              <div className="absolute inset-0 bg-violet-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
              <Image src="/logo-aijianli.png" alt="智简简历" width={120} height={40} className="h-10 w-auto object-contain relative z-10" />
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="relative group px-1"
                onMouseEnter={() => item.hasDropdown && setActiveDropdown(item.id)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                {item.hasDropdown ? (
                  <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-600 hover:text-violet-700 rounded-full hover:bg-white/50 transition-all">
                    {item.label}
                    <ChevronDown className={cn("w-4 h-4 transition-transform text-slate-400 group-hover:text-violet-500", activeDropdown === item.id && "rotate-180")} />
                  </button>
                ) : (
                  <Link 
                    href={item.href!} 
                    className="flex items-center px-4 py-2 text-sm font-medium text-slate-600 hover:text-violet-700 rounded-full hover:bg-white/50 transition-all"
                  >
                    {item.label}
                  </Link>
                )}

                {item.hasDropdown && (
                  <div className={cn(
                    "absolute top-full left-0 mt-2 w-56 p-2 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(31,38,135,0.07)] border border-white/20 transition-all duration-300 opacity-0 invisible translate-y-2 origin-top-left ring-1 ring-black/5",
                    activeDropdown === item.id && "opacity-100 visible translate-y-0"
                  )}>
                    {item.items?.map((sub) => (
                      <Link
                        key={sub.id}
                        href={sub.href}
                        className="block px-4 py-3 text-sm text-slate-600 hover:text-violet-700 hover:bg-violet-50/50 rounded-xl transition-colors"
                      >
                        <div className="font-medium">{sub.label}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {token ? (
              <div className="flex items-center gap-4">
                <Link href="/dashboard">
                  <LandingButton variant="glass" size="sm" className="rounded-full">进入控制台</LandingButton>
                </Link>
                <div className="relative group/user">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 p-[2px] cursor-pointer hover:shadow-lg hover:shadow-violet-500/20 transition-all">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                      {userInfo?.avatar ? (
                        <Image src={userInfo.avatar} alt="Avatar" width={36} height={36} className="rounded-full" />
                      ) : (
                        <User size={20} className="text-violet-500" />
                      )}
                    </div>
                  </div>
                  <div className="absolute right-0 top-full mt-2 w-64 p-2 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(31,38,135,0.07)] border border-white/20 opacity-0 invisible group-hover/user:opacity-100 group-hover/user:visible transition-all translate-y-2">
                    <div className="px-4 py-3 mb-1">
                      <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">当前账号</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">{userInfo?.email || '用户'}</p>
                    </div>
                    <div className="h-px bg-slate-100 mx-2 mb-2"></div>
                    <button 
                      onClick={() => logout()}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                    >
                      <LogOut size={16} />
                      退出登录
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <LandingButton variant="ghost" size="sm" onClick={() => setIsLoginOpen(true)} className="rounded-full hover:bg-white/50">登录</LandingButton>
                <LandingButton size="sm" onClick={() => setIsLoginOpen(true)} className="rounded-full shadow-lg shadow-violet-500/25">免费制作</LandingButton>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden p-2 text-slate-600 hover:bg-white/50 rounded-full transition-colors" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white/90 backdrop-blur-xl border-b border-white/20 px-4 py-6 space-y-4 animate-in slide-in-from-top duration-300 shadow-xl">
            {menuItems.map((item) => (
              <div key={item.id} className="space-y-2 border-b border-slate-100 pb-2">
                <Link href={item.href!} className="block text-slate-700 font-semibold text-lg" onClick={() => setMobileMenuOpen(false)}>
                  {item.label}
                </Link>
                {item.items?.map((sub) => (
                  <Link key={sub.id} href={sub.href} className="block pl-4 text-slate-500 hover:text-violet-600" onClick={() => setMobileMenuOpen(false)}>
                    {sub.label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="flex flex-col gap-3 pt-4">
              {token ? (
                <Link href="/dashboard" className="w-full">
                  <LandingButton size="md" className="w-full rounded-xl">进入控制台</LandingButton>
                </Link>
              ) : (
                <>
                  <LandingButton variant="outline" size="md" className="w-full rounded-xl" onClick={() => setIsLoginOpen(true)}>注册/登录</LandingButton>
                  <LandingButton size="md" className="w-full rounded-xl" onClick={() => setIsLoginOpen(true)}>免费制作</LandingButton>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <WxLoginDialog 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
        onSuccess={() => {
          // Additional logic on success if needed
        }}
      />
    </>
  );
};
