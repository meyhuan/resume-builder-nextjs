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
} from 'lucide-react'
import { clearStoredAdminPassword, getStoredAdminPassword, setStoredAdminPassword } from '@/lib/admin-auth'
import { getPublicJavaApiBaseUrl } from '@/lib/java-api-base'
import { cn } from '@/lib/utils'

const NAV_GROUPS = [
  {
    label: '日常',
    items: [
      { href: '/admin', label: '会员', icon: Crown },
      { href: '/admin/codes', label: '兑换码', icon: Gift },
      { href: '/admin/xhs-notes', label: '笔记奖励', icon: NotebookPen },
    ],
  },
  {
    label: '数据',
    items: [
      { href: '/admin/analytics', label: '埋点', icon: BarChart3 },
      { href: '/admin/extension-metrics', label: '插件填写', icon: BarChart3 },
    ],
  },
  {
    label: '配置',
    items: [
      { href: '/admin/vip-configs', label: '套餐', icon: LayoutDashboard },
    ],
  },
] as const

function isActive(href: string, pathname: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function AdminNav(props: { onNavigate?: () => void }): React.ReactElement {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-5 py-5">
        <LayoutDashboard className="h-5 w-5 text-violet-600" />
        <h2 className="text-lg font-bold text-slate-800">管理后台</h2>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto p-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-xs font-medium text-slate-400">{group.label}</p>
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
                      'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      active ? 'bg-violet-50 font-medium text-violet-700' : 'text-slate-700 hover:bg-slate-100',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t p-4">
        <Link
          href="/dashboard"
          onClick={props.onNavigate}
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          返回用户端
        </Link>
      </div>
    </div>
  )
}

export function AdminShell(props: { children: ReactNode }): React.ReactElement {
  const [phase, setPhase] = useState<'checking' | 'login' | 'ready'>('checking')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

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
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
              <Shield className="h-6 w-6 text-violet-600" />
            </div>
            <h1 className="text-lg font-bold text-slate-800">管理后台</h1>
            <p className="mt-1 text-sm text-slate-500">
              {phase === 'checking' ? '正在验证登录状态' : '请输入管理员密码'}
            </p>
          </div>
          {phase === 'login' && (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void verify(password, false)
              }}
            >
              {error && (
                <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
              )}
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="管理员密码"
                autoComplete="current-password"
                className="mb-3 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                type="submit"
                disabled={submitting || !password.trim()}
                className="min-h-11 w-full rounded-xl bg-violet-600 font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {submitting ? '验证中...' : '登录'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="hidden w-64 shrink-0 border-r bg-white md:block">
        <div className="sticky top-0 h-screen">
          <AdminNav />
        </div>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="关闭菜单"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="relative h-full w-72 max-w-[85vw] bg-white shadow-xl">
            <button
              type="button"
              aria-label="关闭菜单"
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-4 flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            <AdminNav onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-white px-4 py-3 md:px-8">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="打开菜单"
              onClick={() => setMenuOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base font-semibold text-slate-800">管理后台</h1>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <LogOut className="h-4 w-4" />
            退出
          </button>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-8">{props.children}</main>
      </div>
    </div>
  )
}
