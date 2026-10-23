import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { syncUserIdentity } from '@/lib/sync-user-identity'
import { fetchJavaWithLog, parseJsonWithLog } from '@/lib/api/fetch-with-log'
import { MINI_PROGRAM_CONTEXT_COOKIE, MINI_PROGRAM_VERSION_COOKIE } from '@/lib/mini-program-version-cookie'
import { createHash } from 'node:crypto'

const AUTH_COOKIE_NAME = 'auth_uid'
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
const MINI_VERSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

// Share only ongoing exchanges across duplicate WebView requests (and dev HMR).
// Never cache a completed login: a later replay must still be rejected by Java.
const ssoGlobal = globalThis as typeof globalThis & { miniSsoFlights?: Map<string, Promise<string>> }
const identityFlights = ssoGlobal.miniSsoFlights ??= new Map<string, Promise<string>>()

async function exchangeIdentity(token: string): Promise<string> {
  const key = createHash('sha256').update(token).digest('hex')
  const existing = identityFlights.get(key)
  if (existing) {
    console.info('[m/sso] joining in-flight exchange')
    return existing
  }
  if (identityFlights.size >= 200) throw new Error('SSO busy')
  const flight = (async () => {
    const verified = await verifyTokenWithJava(token)
    const user = await syncUserIdentity(verified)
    if (!user.wxId) throw new Error('账号同步失败，请重新登录')
    return user.wxId
  })()
  identityFlights.set(key, flight)
  try {
    return await flight
  } finally {
    identityFlights.delete(key)
  }
}

interface SsoVerifyResult {
  readonly status: number
  readonly data?: { readonly uid: number | string; readonly openid?: string; readonly unionid?: string }
}

/**
 * GET /m/sso?token=<one-time-token>&r=<redirect-path>
 *
 * Read-only landing page for the WeChat web-view handoff. The page submits
 * POST /m/sso to exchange the one-time token, synchronize the user and set
 * the auth cookie, then replaces the landing page in browser history.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  if (!token) return renderErrorPage('缺少登录参数，请返回小程序重新进入', 400)
  // DevTools inspects web-view URLs with an additional GET. A read-only
  // landing page prevents that probe from consuming the one-time token.
  const target = sanitizeRedirect(url.searchParams.get('r') || '/m')
  return new NextResponse(`<!doctype html><html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>智简简历</title>
<style>
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:#f8fafc}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#0f172a}
.loading{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 24px calc(24px + env(safe-area-inset-bottom));opacity:0;animation:reveal .16s ease-out .18s forwards}
.spinner{width:32px;height:32px;border:3px solid #ede9fe;border-top-color:#7c3aed;border-radius:50%;animation:spin .8s linear infinite}
.loading p{margin:16px 0 0;color:#64748b;font-size:14px;line-height:1.6}
form{margin:0}button{display:block;margin:16px auto;padding:12px 24px;border:0;border-radius:12px;background:#7c3aed;color:white;font:inherit}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes reveal{to{opacity:1}}
@media(prefers-reduced-motion:reduce){.loading{opacity:1;animation:none}.spinner{animation:none}}
</style></head><body>
<main class="loading" role="status" aria-live="polite">
<div class="spinner" aria-hidden="true"></div>
<p>正在打开页面…</p>
<form method="post" action="/m/sso">
<input type="hidden" name="token" value="${escapeHtml(token)}">
<input type="hidden" name="r" value="${escapeHtml(target)}">
<noscript><button type="submit">继续登录</button></noscript>
</form></main><script>
try{history.replaceState(null,'','/m/sso')}catch(e){}
let exchangeStarted = false;
async function exchangeWhenVisible(){
  // DevTools can preload a hidden document before the actual WebView is shown.
  if (exchangeStarted || document.visibilityState === 'hidden') return;
  exchangeStarted = true;
  try {
    const response = await fetch('/m/sso', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'Accept': 'application/json' },
      body: new FormData(document.forms[0])
    });
    const result = await response.json();
    if (!response.ok) {
      document.querySelector('.loading p').textContent = result.error || '暂时无法打开页面，请返回小程序后重新进入。';
      document.querySelector('.spinner').hidden = true;
      document.title = '暂时无法打开页面';
      return;
    }
    // The handoff must not remain behind the editor in WebView history.
    window.location.replace(result.redirect);
  } catch(e) {
    document.title = '暂时无法打开页面';
    document.querySelector('.spinner').hidden = true;
    document.querySelector('.loading p').textContent = '暂时无法完成登录，请点击左上角返回小程序后重新进入。';
  }
}
window.addEventListener('pageshow', exchangeWhenVisible);
document.addEventListener('visibilitychange', exchangeWhenVisible);
</script>
</body></html>`, { headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
  } })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const wantsJson = request.headers.get('accept')?.includes('application/json') ?? false
  const fail = (message: string, status: number): NextResponse => wantsJson
    ? NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
    : renderErrorPage(message, status)
  const reqUrl: URL = new URL(request.url)
  const form = await request.formData()
  const tokenValue = form.get('token')
  const token = typeof tokenValue === 'string' ? tokenValue : null
  const redirectValue = form.get('r')
  const redirectParam = typeof redirectValue === 'string' ? redirectValue : '/m'
  const safeRedirect: string = sanitizeRedirect(redirectParam)
  const miniVersion: string = extractMiniVersion(safeRedirect)
  const ua: string = request.headers.get('user-agent') || ''
  console.log('[m/sso] POST in', {
    hasToken: Boolean(token),
    r: redirectParam,
    safeRedirect,
    miniVersion,
    ua: ua.slice(0, 80),
  })
  if (!token) {
    console.warn('[m/sso] missing token, returning 400')
    return fail('缺少登录参数，请返回小程序重新进入', 400)
  }
  let identity: string
  try {
    identity = await exchangeIdentity(token)
  } catch (error: unknown) {
    const message: string = error instanceof Error ? error.message : '登录校验失败'
    console.error('[m/sso] verifyTokenWithJava failed:', message)
    const code = error && typeof error === 'object' && 'code' in error ? error.code : null
    if (code === 'P1001' || code === 'P1002' || code === 'P2024') {
      return fail('服务暂时连接不稳定，请稍后返回小程序重新进入。', 503)
    }
    return fail('暂时无法完成登录，请返回小程序后重新进入。', 401)
  }
  const cookieStore = await cookies()
  const isProd: boolean = process.env.NODE_ENV === 'production'
  cookieStore.set(AUTH_COOKIE_NAME, identity, {
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
    secure: isProd,
    httpOnly: false,
  })
  cookieStore.set(MINI_PROGRAM_CONTEXT_COOKIE, '1', {
    path: '/m',
    maxAge: MINI_VERSION_COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
    secure: isProd,
    httpOnly: false,
  })
  if (miniVersion) {
    cookieStore.set(MINI_PROGRAM_VERSION_COOKIE, miniVersion, {
      path: '/',
      maxAge: MINI_VERSION_COOKIE_MAX_AGE_SECONDS,
      sameSite: 'lax',
      secure: isProd,
      httpOnly: false,
    })
  }
  if (wantsJson) {
    return NextResponse.json({ redirect: safeRedirect }, { headers: { 'Cache-Control': 'no-store' } })
  }
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'aijianli.cn'
  const protocol = request.headers.get('x-forwarded-proto') || reqUrl.protocol.replace(':', '')
  const baseUrl = `${protocol}://${host}`

  const finalUrl: URL = new URL(safeRedirect, baseUrl)
  console.log('[m/sso] redirecting to final destination ->', finalUrl.href)
  return NextResponse.redirect(finalUrl.href, { status: 303, headers: { 'Cache-Control': 'no-store' } })
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

function extractMiniVersion(target: string): string {
  try {
    const url = new URL(target, 'https://aijianli.cn')
    const value = url.searchParams.get('miniVersion') ?? url.searchParams.get('mpVersion') ?? ''
    return sanitizeMiniVersion(value)
  } catch {
    return ''
  }
}

function sanitizeMiniVersion(value: string): string {
  const normalized = value.trim()
  return /^[0-9A-Za-z._-]{1,32}$/.test(normalized) ? normalized : ''
}

async function verifyTokenWithJava(token: string): Promise<{ wxId: string; javaUserId: string }> {
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
  // Prefer unionid (cross-app unique) > openid > numeric uid for the session,
  // but always retain the Java ID so an existing account can be recovered.
  return {
    wxId: payload.data.unionid || payload.data.openid || String(payload.data.uid),
    javaUserId: String(payload.data.uid),
  }
}

function renderErrorPage(message: string, status: number): NextResponse {
  const html: string = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover" />
  <title>登录失败</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
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
    <h1>暂时无法打开页面</h1>
    <p>${escapeHtml(message)}</p>
    <button onclick="closeToMini()">返回小程序重试</button>
  </div>
  <script src="https://res.wx.qq.com/open/js/jweixin-1.3.2.js"></script>
  <script>
    function closeToMini() {
      if (window.wx && window.wx.miniProgram && typeof window.wx.miniProgram.navigateBack === 'function') {
        window.wx.miniProgram.navigateBack();
      } else {
        document.querySelector('p').textContent = '请点击左上角返回，再重新打开功能入口。';
      }
    }
  </script>
</body>
</html>`
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
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
