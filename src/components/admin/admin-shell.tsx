'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowLeft,
  BarChart3,
  Crown,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookPen,
  Shield,
  X,
  Gauge,
} from 'lucide-react'
import { clearStoredAdminPassword, getStoredAdminPassword, setStoredAdminPassword } from '@/lib/admin-auth'
import { getPublicJavaApiBaseUrl } from '@/lib/java-api-base'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  shortLabel: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: '日常',
    items: [
      { href: '/admin', label: '会员管理', shortLabel: '会员', icon: Crown },
      { href: '/admin/codes', label: '兑换码', shortLabel: '兑换码', icon: Gift },
      { href: '/admin/xhs-notes', label: '笔记奖励', shortLabel: '笔记奖励', icon: NotebookPen },
    ],
  },
  {
    label: '数据',
    items: [
      { href: '/admin/analytics', label: '埋点统计', shortLabel: '埋点', icon: BarChart3 },
      { href: '/admin/extension-metrics', label: '插件填写', shortLabel: '插件', icon: Gauge },
    ],
  },
  {
    label: '配置',
    items: [
      { href: '/admin/vip-configs', label: 'VIP套餐', shortLabel: '套餐', icon: LayoutDashboard },
    ],
  },
]

const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items)

function isActive(href: string, pathname: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function AdminNav(props: { onNavigate?: () => void }): React.ReactElement {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-xs shadow-violet-500/30">
          <LayoutDashboard className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 leading-tight">管理后台</h2>
          <p className="text-[11px] text-slate-400">AI 简历构建器</p>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-3.5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href, pathname)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={props.onNavigate}
                    className={cn(
                      'flex min-h-[44px] items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                      active
                        ? 'bg-violet-50 text-violet-700 font-semibold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-violet-600' : 'text-slate-400')} />
                      <span>{item.label}</span>
                    </div>
                    {active && <span className="h-2 w-2 rounded-full bg-violet-600" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <Link
          href="/dashboard"
          onClick={props.onNavigate}
          className="flex min-h-[44px] items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-slate-400" />
          <span>返回用户端工作台</span>
        </Link>
      </div>
    </div>
  )
}

export function AdminShell(props: { children: ReactNode }): React.ReactElement {
  const pathname = usePathname()
  const [phase, setPhase] = useState<'checking' | 'login' | 'ready'>('checking')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const activeNavItem = ALL_NAV_ITEMS.find((item) => isActive(item.href, pathname)) || ALL_NAV_ITEMS[0]

  useEffect(() => {
    const stored = getStoredAdminPassword()
    if (!stored) {
      setPhase('login')
      return
    }
    setPhase('ready')
    void verify(stored, true)
  }, [])

  async function verify(nextPassword: string, fromStorage: boolean): Promise<void> {
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch(`${getPublicJavaApiBaseUrl()}/admin/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: nextPassword }),
      })
      const json = await response.json().catch(() => null) as { status?: number } | null
      if (json?.status === 100) {
        setStoredAdminPassword(nextPassword)
        setPhase('ready')
        return
      }
      if (fromStorage) clearStoredAdminPassword()
      setPhase('login')
      setError(fromStorage ? '' : '密码错误')
    } catch {
      if (fromStorage) {
        setPhase('login')
        setError('无法验证已保存的密码，请重新登录')
        return
      }
      setError('登录失败，请检查网络')
    } finally {
      setSubmitting(false)
    }
  }

  function logout(): void {
    clearStoredAdminPassword()
    setPassword('')
    setMenuOpen(false)
    setPhase('login')
  }

  if (phase !== 'ready') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-sm rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 shadow-inner">
              <Shield className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">管理员验证</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              {phase === 'checking' ? '正在验证登录状态...' : '请输入管理员密码以访问后台'}
            </p>
          </div>
          {phase === 'login' && (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void verify(password, false)
              }}
              className="space-y-3.5"
            >
              {error && (
                <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs sm:text-sm text-rose-700 border border-rose-100">{error}</p>
              )}
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="管理员密码"
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-base sm:text-sm outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100 min-h-[46px]"
                autoFocus
              />
              <button
                type="submit"
                disabled={submitting || !password.trim()}
                className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white shadow-xs hover:bg-violet-700 active:scale-[0.99] disabled:opacity-50 transition-all min-h-[44px]"
              >
                {submitting ? '验证中...' : '登录管理后台'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] flex-col md:flex-row bg-slate-50 text-slate-800 overflow-hidden">
      {/* Mobile Sticky Top App Bar */}
      <header className="sticky top-0 z-30 flex md:hidden items-center justify-between border-b border-slate-200/80 bg-white/95 px-3 py-2.5 backdrop-blur-sm shadow-xs shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="打开菜单"
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 active:scale-95 transition-all"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white shadow-xs">
              <LayoutDashboard className="h-4 w-4" />
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-900 leading-tight">管理后台</span>
              <span className="text-[11px] text-violet-600 font-medium leading-tight">{activeNavItem.label}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/dashboard"
            className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 active:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>用户端</span>
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:border-rose-200 hover:text-rose-600 active:bg-rose-50 transition-colors"
            title="退出管理员"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>退出</span>
          </button>
        </div>
      </header>

      {/* Mobile Horizontal Quick-Nav Scroll Bar */}
      <div className="flex md:hidden border-b border-slate-200/70 bg-white px-2 py-1.5 overflow-x-auto no-scrollbar gap-1.5 shrink-0 shadow-2xs">
        {ALL_NAV_ITEMS.map((item) => {
          const active = isActive(item.href, pathname)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 min-h-[32px]',
                active
                  ? 'bg-violet-600 text-white shadow-xs shadow-violet-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 active:bg-slate-200'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.shortLabel}</span>
            </Link>
          )
        })}
      </div>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block">
        <div className="sticky top-0 h-screen">
          <AdminNav />
        </div>
      </aside>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative flex w-72 max-w-[82vw] flex-col bg-white shadow-2xl h-full z-10 animate-in slide-in-from-left duration-200">
            <button
              type="button"
              aria-label="关闭菜单"
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-3.5 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:scale-95 z-20"
            >
              <X className="h-5 w-5" />
            </button>
            <AdminNav onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main Content View */}
      <div className="flex min-w-0 flex-1 flex-col bg-slate-50 overflow-y-auto min-h-0">
        {/* Desktop Header */}
        <header className="sticky top-0 z-20 hidden md:flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 lg:px-8 shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-800">{activeNavItem.label}</h1>
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-600 border border-violet-100">
              系统控制台
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>返回前端主站</span>
            </Link>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-rose-200 hover:text-rose-600 active:bg-rose-50 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>退出登录</span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="min-w-0 flex-1 p-3.5 sm:p-5 md:p-6 lg:p-8">
          <div className="mx-auto max-w-5xl">
            {props.children}
          </div>
        </main>
      </div>
    </div>
  )
}
