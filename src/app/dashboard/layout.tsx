import type { ReactNode, ReactElement } from 'react';
import DashboardSidebar from '@/components/dashboard/dashboard-sidebar';

interface DashboardLayoutProps {
  readonly children: ReactNode;
}

/**
 * Dashboard layout with fixed left sidebar and scrollable main content area.
 */
export default function DashboardLayout({ children }: DashboardLayoutProps): ReactElement {
  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <main className="flex-1 ml-[200px]">
        {children}
      </main>
    </div>
  );
}
