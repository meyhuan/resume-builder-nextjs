'use client';

import type { ReactElement } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FileText, MessageSquareHeart, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { BrandLogo } from '@/components/ui/brand-logo';

/** Navigation item definition. */
interface NavItem {
  readonly key: string;
  readonly label: string;
  readonly href: string;
  readonly icon: ReactElement;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'resume', label: 'My Resumes', href: '/dashboard', icon: <FileText className="w-[18px] h-[18px]" /> },
  // { key: 'ai', label: 'AI Resume', href: '/ai', icon: <Code2 className="w-[18px] h-[18px]" /> },
  { key: 'feedback', label: 'Feedback', href: '/dashboard/feedback', icon: <MessageSquareHeart className="w-[18px] h-[18px]" /> },
];

const BRAND_COLOR = '#4F46E5';
const COPYRIGHT_YEAR = new Date().getFullYear();

/**
 * Dashboard sidebar — fixed left navigation panel.
 * Matches the UP resume dashboard style with logo, nav items, user info, and copyright.
 */
export default function DashboardSidebar(): ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
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
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo className="w-8 h-8" />
          <span className="font-bold text-lg tracking-tight text-slate-900">
            AI Resume Pass
          </span>
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
        {/* User Card */}
        {mounted && (
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50 mb-3">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold"
              style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, #7C3AED)` }}
            >
              {user?.fullName?.[0] || user?.primaryEmailAddress?.emailAddress?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">
                {user?.fullName || user?.primaryEmailAddress?.emailAddress || 'User'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {isSignedIn ? 'Free Plan' : 'Guest'}
              </p>
            </div>
          </div>
        )}

        {/* Logout */}
        {mounted && isSignedIn && (
          <button
            type="button"
            onClick={() => { void signOut({ redirectUrl: '/' }); router.push('/'); }}
            className="flex items-center gap-2 w-full px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors mb-3"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        )}

        {/* Copyright */}
        <p className="text-[11px] text-slate-300 px-4">
          @AI Resume Pass {COPYRIGHT_YEAR}
        </p>
      </div>
    </aside>
  );
}
