import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { fetchJavaWithLog, parseJsonWithLog } from '@/lib/api/fetch-with-log'

const AUTH_COOKIE_NAME = 'auth_uid'
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

interface SsoVerifyResult {
  readonly status: number
  readonly data?: { readonly uid: number | string; readonly openid?: string; readonly unionid?: string }
}

/**
 * GET /m/sso?token=<one-time-token>&r=<redirect-path>
 *
 * Entry point used by the WeChat mini-program web-view handoff. Exchanges a
 * one-time SSO token issued by the Java backend for a long-lived {@code auth_uid}
 * cookie, upserts the Prisma User (so new mini-program users get a Next.js row),
 * then 302s to the requested in-app path.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const reqUrl: URL = new URL(request.url)
  const { searchParams } = reqUrl
  const token: string | null = searchParams.get('token')
  const redirectParam: string = searchParams.get('r') || '/m'
  const safeRedirect: string = sanitizeRedirect(redirectParam)
  const ua: string = request.headers.get('user-agent') || ''
  console.log('[m/sso] GET in', {
    href: reqUrl.href,
    hasToken: Boolean(token),
    r: redirectParam,
    safeRedirect,
    ua: ua.slice(0, 80),
  })
  if (!token) {
    console.warn('[m/sso] missing token, returning 400')
    return renderErrorPage('缺少登录参数，请返回小程序重新进入', 400)
  }
  let uid: string
  try {
    uid = await verifyTokenWithJava(token)
    console.log('[m/sso] token verified, uid =', uid)
  } catch (error: unknown) {
    const message: string = error instanceof Error ? error.message : '登录校验失败'
    console.error('[m/sso] verifyTokenWithJava failed:', message)
    return renderErrorPage(message, 401)
  }
  await ensureUserExists(uid)
  const cookieStore = await cookies()
  const isProd: boolean = process.env.NODE_ENV === 'production'
  cookieStore.set(AUTH_COOKIE_NAME, uid, {
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
    secure: isProd,
    httpOnly: false,
  })
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'aijianli.cn'
  const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const baseUrl = `${protocol}://${host}`

  const finalUrl: URL = new URL(safeRedirect, baseUrl)
  console.log('[m/sso] redirecting to final destination ->', finalUrl.href)
  return NextResponse.redirect(finalUrl.href, { status: 302 })
}

/**
 * Prevent open-redirect: only allow in-app paths (must start with '/m' or '/').
 */
function sanitizeRedirect(target: string): string {
  if (!target.startsWith('/')) {
    return '/m'
  }
  if (target.startsWith('//')) {
    return '/m'
  }
  return target
}

async function verifyTokenWithJava(token: string): Promise<string> {
  const response: Response = await fetchJavaWithLog('/sso/verify', {
    logPrefix: '[m/sso]',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`SSO verify HTTP ${response.status}`)
  }
  const payload = await parseJsonWithLog<SsoVerifyResult>(response, '[m/sso]')
  if (payload.status !== 100 || !payload.data?.uid) {
    throw new Error('登录令牌无效或已过期')
  }
  // Prefer unionid (cross-app unique) > openid > numeric uid
  return payload.data.unionid || payload.data.openid || String(payload.data.uid)
}

async function ensureUserExists(wxId: string): Promise<void> {
  try {
    await prisma.user.upsert({
      where: { wxId },
      update: {},
      create: { wxId, name: `用户_${wxId}` },
    })
  } catch (error: unknown) {
    console.error('[m/sso] ensureUserExists failed', error)
  }
}

function renderErrorPage(message: string, status: number): NextResponse {
  const html: string = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>登录失败</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
      min-height: 100vh; background: #f8fafc; color: #0f172a;
      display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { max-width: 360px; width: 100%; background: #fff; border-radius: 16px;
      box-shadow: 0 10px 30px rgba(15,23,42,0.08); padding: 28px; text-align: center; }
    .icon { width: 48px; height: 48px; margin: 0 auto 12px; border-radius: 50%;
      background: #fef2f2; color: #ef4444; display: flex; align-items: center; justify-content: center; font-size: 24px; }
    h1 { font-size: 17px; margin: 0 0 8px; }
    p { font-size: 14px; line-height: 1.6; color: #64748b; margin: 0 0 20px; }
    button { width: 100%; padding: 12px; border: 0; border-radius: 10px;
      background: #7c3aed; color: #fff; font-size: 15px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">!</div>
    <h1>登录失败</h1>
    <p>${escapeHtml(message)}</p>
    <button onclick="closeToMini()">返回小程序</button>
  </div>
  <script src="https://res.wx.qq.com/open/js/jweixin-1.3.2.js"></script>
  <script>
    function closeToMini() {
      if (window.wx && window.wx.miniProgram && typeof window.wx.miniProgram.navigateBack === 'function') {
        window.wx.miniProgram.navigateBack();
      } else if (window.history.length > 1) {
        window.history.back();
      }
    }
  </script>
</body>
</html>`
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
