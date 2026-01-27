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
        'fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 border-b border-transparent',
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg border-[#a855f7]/10 py-3' : 'bg-white/80 backdrop-blur-sm py-4'
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group transition-transform hover:scale-105">
            <Image src="/logo-aijianli.png" alt="智简简历" width={120} height={40} className="h-10 w-auto object-contain" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="relative group"
                onMouseEnter={() => item.hasDropdown && setActiveDropdown(item.id)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                {item.hasDropdown ? (
                  <button className="flex items-center gap-1 text-gray-600 font-medium hover:text-[#a855f7] transition-colors">
                    {item.label}
                    <ChevronDown className={cn("w-4 h-4 transition-transform", activeDropdown === item.id && "rotate-180")} />
                  </button>
                ) : (
                  <Link href={item.href} className="text-gray-600 font-medium hover:text-[#a855f7] transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:height-[2px] after:bg-gradient-to-r after:from-[#a855f7] after:to-[#f23a70] hover:after:w-full after:transition-all">
                    {item.label}
                  </Link>
                )}

                {item.hasDropdown && (
                  <div className={cn(
                    "absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-[#a855f7]/10 py-2 transition-all duration-300 opacity-0 invisible translate-y-[-10px]",
                    activeDropdown === item.id && "opacity-100 visible translate-y-0"
                  )}>
                    {item.items?.map((sub) => (
                      <Link
                        key={sub.id}
                        href={sub.href}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-[#a855f7]/5 hover:text-[#a855f7] border-l-4 border-transparent hover:border-[#a855f7] transition-all"
                      >
                        {sub.label}
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
                  <LandingButton variant="outline" size="sm">进入控制台</LandingButton>
                </Link>
                <div className="relative group/user">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform">
                    {userInfo?.avatar ? (
                      <Image src={userInfo.avatar} alt="Avatar" width={36} height={36} className="rounded-full" />
                    ) : (
                      <User size={20} />
                    )}
                  </div>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover/user:opacity-100 group-hover/user:visible transition-all">
                    <div className="px-4 py-2 border-b border-gray-50 mb-1">
                      <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">当前账号</p>
                      <p className="text-sm font-medium text-gray-700 truncate">{userInfo?.email || '用户'}</p>
                    </div>
                    <button 
                      onClick={() => logout()}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} />
                      退出登录
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <LandingButton variant="outline" size="sm" onClick={() => setIsLoginOpen(true)}>注册/登录</LandingButton>
                <LandingButton size="sm" onClick={() => setIsLoginOpen(true)}>免费制作</LandingButton>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-[#a855f7]/10 px-4 py-6 space-y-4 animate-in slide-in-from-top duration-300">
            {menuItems.map((item) => (
              <div key={item.id} className="space-y-2 border-b border-gray-100 pb-2">
                <Link href={item.href} className="block text-gray-600 font-medium" onClick={() => setMobileMenuOpen(false)}>
                  {item.label}
                </Link>
                {item.items?.map((sub) => (
                  <Link key={sub.id} href={sub.href} className="block pl-4 text-sm text-gray-500" onClick={() => setMobileMenuOpen(false)}>
                    {sub.label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="flex flex-col gap-3 pt-2">
              {token ? (
                <Link href="/dashboard" className="w-full">
                  <LandingButton size="sm" className="w-full">进入控制台</LandingButton>
                </Link>
              ) : (
                <>
                  <LandingButton variant="outline" size="sm" className="w-full" onClick={() => setIsLoginOpen(true)}>注册/登录</LandingButton>
                  <LandingButton size="sm" className="w-full" onClick={() => setIsLoginOpen(true)}>免费制作</LandingButton>
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
