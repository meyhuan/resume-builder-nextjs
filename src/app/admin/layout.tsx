'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { LayoutDashboard, ArrowLeft } from 'lucide-react';
import AuthGuard from '@/components/auth/AuthGuard';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r flex flex-col">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-blue-600" />
              管理后台
            </h2>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mt-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              返回用户端
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          <header className="bg-white border-b px-8 py-4 sticky top-0 z-10">
            <h1 className="text-lg font-semibold text-gray-800">模板快照管理</h1>
          </header>
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
