'use client';

import type { ReactNode, ReactElement } from 'react';
import DashboardSidebar from '@/components/dashboard/dashboard-sidebar';
import VipUpgradeDialog from '@/components/vip/vip-upgrade-dialog';
import { useVipCheck } from '@/hooks/use-vip-check';

interface DashboardLayoutProps {
  readonly children: ReactNode;
}

/**
 * Dashboard layout with fixed left sidebar and scrollable main content area.
 * Includes VIP promo banner for non-VIP users.
 */
export default function DashboardLayout({ children }: DashboardLayoutProps): ReactElement {
  const { showUpgrade, setShowUpgrade } = useVipCheck();

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <main className="flex-1 ml-[200px]">
        {children}
      </main>
      {/* VIP upgrade dialog */}
      <VipUpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />
    </div>
  );
}
