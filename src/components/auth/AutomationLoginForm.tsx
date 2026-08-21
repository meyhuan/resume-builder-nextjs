'use client'

import { FormEvent, useState } from 'react'
import { AlertCircle, Loader2, LockKeyhole } from 'lucide-react'
import { useAuthStore } from '@/store/use-auth-store'
import { track } from '@/lib/analytics'

interface AutomationUser {
  readonly id: string
  readonly wxId: string
  readonly name: string | null
}

interface AutomationLoginResponse {
  readonly ok?: boolean
  readonly user?: AutomationUser
  readonly error?: string
}

interface AutomationLoginFormProps {
  readonly onSuccess: () => void
  readonly onUseWechat: () => void
}

export function AutomationLoginForm({
  onSuccess,
  onUseWechat,
}: AutomationLoginFormProps): React.ReactElement {
  const { setToken, setUserInfo } = useAuthStore()
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/next-api/auth/automation-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password }),
      })
      const payload = (await response.json().catch(() => ({}))) as AutomationLoginResponse

      if (!response.ok || !payload.ok || !payload.user) {
        throw new Error(payload.error || '登录失败，请检查账号和密码')
      }

      setToken(payload.user.wxId)
      setUserInfo({
        id: payload.user.id,
        name: payload.user.name || '自动化测试用户',
      })
      track('login_success', {
        entry: 'automation_login',
        loginMethod: 'automation_password',
      })
      onSuccess()
    } catch (loginError: unknown) {
      setError(loginError instanceof Error ? loginError.message : '登录失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative z-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
          <LockKeyhole size={24} />
        </span>
        <p className="text-sm font-semibold text-slate-800">仅限授权自动化测试账号</p>
        <p className="mt-1 text-xs text-slate-500">普通用户请使用微信扫码登录</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="automation-username" className="mb-1.5 block text-sm font-medium text-slate-700">
            账号
          </label>
          <input
            id="automation-username"
            name="username"
            type="text"
            autoComplete="username"
            aria-label="账号"
            autoFocus
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          />
        </div>

        <div>
          <label htmlFor="automation-password" className="mb-1.5 block text-sm font-medium text-slate-700">
            密码
          </label>
          <input
            id="automation-password"
            name="password"
            type="password"
            autoComplete="current-password"
            aria-label="密码"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          />
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-600">
            <AlertCircle className="mt-0.5 shrink-0" size={16} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <Loader2 className="animate-spin" size={17} />}
          {submitting ? '正在登录...' : '登录'}
        </button>
      </form>

      <button
        type="button"
        onClick={onUseWechat}
        className="mt-5 w-full text-center text-xs font-medium text-slate-500 transition hover:text-violet-600"
      >
        改用微信扫码登录
      </button>
    </div>
  )
}
