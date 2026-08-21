import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

const AUTH_COOKIE_NAME = 'auth_uid'
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
const FAILURE_WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 5

interface LoginBody {
  readonly username?: unknown
  readonly password?: unknown
}

interface FailureEntry {
  count: number
  startedAt: number
}

const failuresByIp = new Map<string, FailureEntry>()

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.AUTOMATION_LOGIN_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const clientIp = getClientIp(request)
  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: '尝试次数过多，请 15 分钟后再试' },
      { status: 429 },
    )
  }

  const expectedUsername = String(process.env.AUTOMATION_LOGIN_USERNAME || '')
  const expectedPassword = String(process.env.AUTOMATION_LOGIN_PASSWORD || '')
  const authUid = String(process.env.AUTOMATION_LOGIN_AUTH_UID || '').trim()

  if (!expectedUsername || !expectedPassword || !authUid) {
    console.error('[automation-login] Required server configuration is missing')
    return NextResponse.json({ error: '自动化登录尚未配置完成' }, { status: 503 })
  }

  const body = await readBody(request)
  const username = typeof body.username === 'string' ? body.username : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!secureEqual(username, expectedUsername) || !secureEqual(password, expectedPassword)) {
    recordFailure(clientIp)
    return NextResponse.json({ error: '账号或密码错误' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { wxId: authUid },
    select: { id: true, wxId: true, name: true },
  })

  if (!user?.wxId) {
    console.error('[automation-login] Configured auth UID does not match an existing user')
    return NextResponse.json({ error: '自动化测试账号尚未初始化' }, { status: 503 })
  }

  failuresByIp.delete(clientIp)
  const response = NextResponse.json({ ok: true, user })
  response.cookies.set(AUTH_COOKIE_NAME, user.wxId, {
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    httpOnly: false,
  })
  return response
}

async function readBody(request: NextRequest): Promise<LoginBody> {
  try {
    return (await request.json()) as LoginBody
  } catch {
    return {}
  }
}

function secureEqual(actual: string, expected: string): boolean {
  const actualHash = createHash('sha256').update(actual, 'utf8').digest()
  const expectedHash = createHash('sha256').update(expected, 'utf8').digest()
  return timingSafeEqual(actualHash, expectedHash)
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    const host = forwardedHost || request.headers.get('host')
    const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
    const protocol = forwardedProtocol || request.nextUrl.protocol.replace(':', '')
    const expectedOrigin = host ? `${protocol}://${host}` : request.nextUrl.origin
    return new URL(origin).origin === new URL(expectedOrigin).origin
  } catch {
    return false
  }
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwardedFor || request.headers.get('x-real-ip') || 'unknown'
}

function getActiveFailure(ip: string): FailureEntry | null {
  const entry = failuresByIp.get(ip)
  if (!entry) return null
  if (Date.now() - entry.startedAt >= FAILURE_WINDOW_MS) {
    failuresByIp.delete(ip)
    return null
  }
  return entry
}

function isRateLimited(ip: string): boolean {
  return (getActiveFailure(ip)?.count || 0) >= MAX_FAILURES
}

function recordFailure(ip: string): void {
  const current = getActiveFailure(ip)
  if (current) {
    current.count += 1
    return
  }
  failuresByIp.set(ip, { count: 1, startedAt: Date.now() })
}
