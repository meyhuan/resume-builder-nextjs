'use client';

import type { ReactNode, ReactElement } from 'react';
import { useEffect, useState } from 'react';
import DashboardSidebar from '@/components/dashboard/dashboard-sidebar';
import VipUpgradeDialog from '@/components/vip/vip-upgrade-dialog';
import { WxLoginDialog } from '@/components/auth/WxLoginDialog';
import { useVipCheck } from '@/hooks/use-vip-check';
import { toast } from 'sonner';

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

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <main className="flex-1 ml-[200px]">
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
