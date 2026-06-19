import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardMembershipLayout({ children }: { readonly children: ReactNode }): ReactNode {
  return children;
}

