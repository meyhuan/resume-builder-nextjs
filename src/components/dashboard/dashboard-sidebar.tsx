'use client';

import type { ReactElement } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { FileText, MessageSquareHeart, Crown, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/use-auth-store';
import { useState, useEffect } from 'react';
import { VipExpirationReminder } from '@/components/vip/vip-expiration-reminder';

/** Navigation item definition. */
interface NavItem {
  readonly key: string;
  readonly label: string;
  readonly href: string;
  readonly icon: ReactElement;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'resume', label: '我的简历', href: '/dashboard', icon: <FileText className="w-[18px] h-[18px]" /> },
  { key: 'membership', label: '会员中心', href: '/dashboard/membership', icon: <Sparkles className="w-[18px] h-[18px]" /> },
  { key: 'feedback', label: '用户反馈', href: '/dashboard/feedback', icon: <MessageSquareHeart className="w-[18px] h-[18px]" /> },
];

const BRAND_COLOR = '#4F46E5';
const COPYRIGHT_YEAR = new Date().getFullYear();

/**
 * Dashboard sidebar — fixed left navigation panel.
 * Matches the UP resume dashboard style with logo, nav items, user info, and copyright.
 */
export default function DashboardSidebar(): ReactElement {
  const pathname = usePathname();
  const { userInfo } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[200px] bg-white border-r border-slate-100 flex flex-col z-40 print:hidden">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <Link href="/" className="block">
          <Image
            src="/logo-aijianli.png"
            alt="智简简历"
            width={120}
            height={40}
            className="h-9 w-auto object-contain"
          />
        </Link>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 pt-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-lg mb-1 text-[14px] font-medium transition-all duration-150
                ${active
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }
              `}
            >
              <span className={active ? 'text-indigo-500' : 'text-slate-400'}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: User Info + Copyright */}
      <div className="px-3 pb-4 mt-auto">
        {/* User Card with VIP upgrade for non-VIP */}
        {mounted && (
          <div className="rounded-xl bg-slate-50 mb-3 overflow-hidden">
            {/* User Info Row */}
            <div className="flex items-center gap-3 px-3 py-3">
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold"
                style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, #7C3AED)` }}
              >
                {userInfo?.name?.[0] || userInfo?.email?.[0] || '用'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {userInfo?.name || userInfo?.email || '用户'}
                  </p>
                  {userInfo?.vip?.isVip && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[10px] font-bold">
                      <Crown className="w-3 h-3" />
                      VIP
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {userInfo?.vip?.isVip
                    ? 'VIP 会员'
                    : userInfo?.integral !== undefined
                      ? `积分 ${userInfo.integral}`
                      : '免费用户'}
                </p>
              </div>
            </div>
            {/* VIP Upgrade Row for non-VIP */}
            {!userInfo?.vip?.isVip && (
              <Link
                href="/dashboard/membership"
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 bg-rose-50/80 hover:bg-rose-50 border-t border-slate-100/50 transition-colors"
              >
                <Crown className="w-3.5 h-3.5" />
                升级 VIP · 解锁无限
              </Link>
            )}
          </div>
        )}

        {/* Copyright */}
        <p className="text-[11px] text-slate-300 px-4">
          @智简简历 {COPYRIGHT_YEAR}
        </p>
      </div>

      <VipExpirationReminder
        isVip={userInfo?.vip?.isVip ?? false}
        vipExpireTime={userInfo?.vip?.vipExpireTime ?? null}
      />
    </aside>
  );
}
