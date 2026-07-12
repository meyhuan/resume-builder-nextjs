'use client';

import type { ReactNode, ReactElement } from 'react';
import { useEffect, useState } from 'react';
import DashboardSidebar from '@/components/dashboard/dashboard-sidebar';
import VipUpgradeDialog from '@/components/vip/vip-upgrade-dialog';
import { WxLoginDialog } from '@/components/auth/WxLoginDialog';
import { useVipCheck } from '@/hooks/use-vip-check';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { BriefcaseBusiness, ChartNoAxesColumnIncreasing, Columns3, FileText } from 'lucide-react';
import { track } from '@/lib/analytics';

interface DashboardLayoutProps {
  readonly children: ReactNode;
}

/**
 * Dashboard layout with fixed left sidebar and scrollable main content area.
 * Includes VIP promo banner for non-VIP users.
 */
export default function DashboardLayout({ children }: DashboardLayoutProps): ReactElement {
  const { showUpgrade, setShowUpgrade } = useVipCheck();
  const [showReLogin, setShowReLogin] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handler = (e: Event): void => {
      const msg = (e as CustomEvent<{ message?: string }>).detail?.message || '请重新扫码登录';
      toast.warning(msg, {
        description: '您的登录信息需要更新，扫码后即可继续使用',
        duration: 8000,
        action: {
          label: '立即登录',
          onClick: () => setShowReLogin(true),
        },
      });
    };
    window.addEventListener('re-login-required', handler);
    return () => window.removeEventListener('re-login-required', handler);
  }, []);

  useEffect(() => {
    track('dashboard_view', {
      entry: 'dashboard_layout',
      pageName: pathname,
    });
  }, [pathname]);

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <nav className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-1 overflow-x-auto border-b border-slate-100 bg-white/95 px-3 shadow-sm backdrop-blur print:hidden lg:hidden" aria-label="移动端工作台导航">
        <Link href="/dashboard" className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-slate-600"><FileText className="mr-1 inline h-4 w-4" />简历</Link>
        <Link href="/dashboard/jobs" className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-violet-700"><BriefcaseBusiness className="mr-1 inline h-4 w-4" />岗位</Link>
        <Link href="/dashboard/applications" className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-slate-600"><Columns3 className="mr-1 inline h-4 w-4" />投递</Link>
        <Link href="/dashboard/review" className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-slate-600"><ChartNoAxesColumnIncreasing className="mr-1 inline h-4 w-4" />复盘</Link>
      </nav>
      <main className="ml-0 min-w-0 flex-1 pt-14 lg:ml-[200px] lg:pt-0">
        {children}
      </main>
      <VipUpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />
      <WxLoginDialog
        isOpen={showReLogin}
        onClose={() => setShowReLogin(false)}
        onSuccess={() => setShowReLogin(false)}
      />
    </div>
  );
}
