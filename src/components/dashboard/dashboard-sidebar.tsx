'use client'

import { type ReactElement, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Crown, Download, FileText, Menu, MessageSquareHeart, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/use-auth-store'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { VipExpirationReminder } from '@/components/vip/vip-expiration-reminder'

const NAV_ITEMS = [
  { key: 'resume', label: '我的简历', href: '/dashboard', icon: FileText },
  { key: 'job-fit', label: '岗位定制', href: '/dashboard/job-fit', icon: Sparkles, badge: '新' },
  { key: 'exports', label: '导出记录', href: '/dashboard/exports', icon: Download },
  { key: 'membership', label: '会员中心', href: '/dashboard/membership', icon: Crown },
  { key: 'feedback', label: '用户反馈', href: '/dashboard/feedback', icon: MessageSquareHeart },
] as const

function isActive(pathname: string, href: string): boolean {
  return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
}

function SidebarContent({ onNavigate }: { readonly onNavigate?: () => void }): ReactElement {
  const pathname = usePathname()
  const { userInfo } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Persisted account information is available after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const displayName = userInfo?.id && /^\d+$/.test(String(userInfo.id))
    ? `用户_${userInfo.id}`
    : userInfo?.name?.trim() || userInfo?.email || '用户'
  const avatarText = userInfo?.id ? String(userInfo.id).slice(-2) : displayName.slice(0, 1)

  return (
    <div className="flex h-full flex-col px-3 py-5">
      <Link href="/" onClick={onNavigate} className="flex h-10 items-center px-2" aria-label="返回智简简历首页">
        <Image src="/logo-aijianli.png" alt="智简简历" width={120} height={40} priority className="h-9 w-auto object-contain" />
      </Link>

      <nav className="mt-7 flex flex-col gap-1.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onNavigate}
              className={`flex h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition-colors ${active ? 'bg-violet-50 text-violet-600' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
              {'badge' in item ? <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-600">{item.badge}</span> : null}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto">
        {mounted ? (
          <div className="mb-3 overflow-hidden rounded-xl border border-violet-100 bg-violet-50/70">
            <Link href="/dashboard/membership" onClick={onNavigate} className="flex items-center gap-2.5 px-2.5 py-3 hover:bg-violet-100/60" aria-label="查看账户与会员信息">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-xs font-semibold text-white">
                {userInfo?.avatar ? <Image src={userInfo.avatar} alt={displayName} width={36} height={36} className="h-9 w-9 object-cover" /> : avatarText}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-semibold text-slate-900">{displayName}</span>
                  {userInfo?.vip?.isVip ? <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-1.5 py-0.5 text-[9px] font-bold text-white"><Crown className="h-2.5 w-2.5" />VIP</span> : null}
                </span>
                <span className="block truncate text-[11px] text-slate-500">
                  {userInfo?.vip?.isVip ? 'VIP 会员 · 查看权益' : userInfo?.integral !== undefined ? `免费用户 · ${userInfo.integral} 积分` : '免费用户 · 查看额度'}
                </span>
              </span>
            </Link>
            {!userInfo?.vip?.isVip ? (
              <Link href="/dashboard/membership" onClick={onNavigate} className="flex items-center justify-center gap-1.5 border-t border-violet-100 bg-white/60 px-3 py-2 text-[11px] font-semibold text-violet-600 hover:bg-white">
                <Crown className="h-3.5 w-3.5" />升级会员 · 解锁无限使用
              </Link>
            ) : null}
          </div>
        ) : <div className="mb-3 h-[92px] animate-pulse rounded-xl bg-slate-100" aria-hidden="true" />}
        <p className="mt-2 text-[11px] text-slate-400">@智简简历 {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}

export default function DashboardSidebar(): ReactElement {
  const userInfo = useAuthStore((state) => state.userInfo)

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[200px] border-r border-slate-200 bg-white print:hidden md:block">
        <SidebarContent />
      </aside>
      <div className="fixed left-4 top-4 z-50 print:hidden md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-white shadow-sm" aria-label="打开控制台导航"><Menu className="h-5 w-5" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] p-0">
            <SheetTitle className="sr-only">控制台导航</SheetTitle>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
      <VipExpirationReminder isVip={userInfo?.vip?.isVip ?? false} vipExpireTime={userInfo?.vip?.vipExpireTime ?? null} />
    </>
  )
}
