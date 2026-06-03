import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

const AUTH_COOKIE_NAME = 'auth_uid'
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
const DEFAULT_E2E_WX_ID = 'e2e_default_user'
const DEFAULT_E2E_REDIRECT = '/m'

interface E2eLoginBody {
  readonly secret?: unknown
  readonly wxId?: unknown
  readonly name?: unknown
  readonly redirect?: unknown
}

/**
 * Test-only login shortcut for browser automation.
 *
 * Enable with:
 *   E2E_AUTH_ENABLED=true
 *   E2E_AUTH_SECRET=<strong random value>
 *   E2E_AUTH_DEFAULT_WX_ID=e2e_default_user
 *
 * This endpoint only works for local loopback hosts, including production
 * builds started locally with `next start`. Public deployments return 404.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isE2eAuthAvailable(request)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const expectedSecret: string = String(process.env.E2E_AUTH_SECRET || '')
  const actualSecret: string = String(request.nextUrl.searchParams.get('secret') || '')

  if (!isGetLoginAllowed(expectedSecret, actualSecret)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await loginE2eUser(request, {
    wxId: request.nextUrl.searchParams.get('wxId'),
    name: request.nextUrl.searchParams.get('name'),
  })

  const redirectPath: string = sanitizeRedirect(
    request.nextUrl.searchParams.get('next') ||
      request.nextUrl.searchParams.get('r') ||
      request.nextUrl.searchParams.get('redirect') ||
      process.env.E2E_AUTH_DEFAULT_REDIRECT ||
      DEFAULT_E2E_REDIRECT,
  )
  return NextResponse.redirect(new URL(redirectPath, request.url), { status: 302 })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isE2eAuthAvailable(request)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body: E2eLoginBody = await readJsonBody(request)
  const expectedSecret: string = String(process.env.E2E_AUTH_SECRET || '')
  const actualSecret: string = String(
    request.headers.get('x-e2e-auth-secret') || body.secret || '',
  )

  if (!isValidSecret(expectedSecret, actualSecret)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const user = await loginE2eUser(request, {
    wxId: body.wxId,
    name: body.name,
  })

  return NextResponse.json({
    ok: true,
    user,
    cookie: AUTH_COOKIE_NAME,
  })
}

async function loginE2eUser(request: NextRequest, input: {
  readonly wxId: unknown
  readonly name: unknown
}): Promise<{ readonly id: string; readonly wxId: string | null; readonly name: string | null }> {
  const wxId: string = resolveE2eWxId(input.wxId)
  const name: string = sanitizeDisplayName(input.name, `自动化测试用户_${wxId}`)

  const user = await prisma.user.upsert({
    where: { wxId },
    update: { name },
    create: { wxId, name },
    select: { id: true, wxId: true, name: true },
  })

  const cookieStore = await cookies()
  cookieStore.set(AUTH_COOKIE_NAME, wxId, {
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    httpOnly: false,
  })

  return user
}

function isValidSecret(expectedSecret: string, actualSecret: string): boolean {
  return Boolean(expectedSecret) && actualSecret === expectedSecret
}

function isGetLoginAllowed(expectedSecret: string, actualSecret: string): boolean {
  if (isValidSecret(expectedSecret, actualSecret)) return true
  return process.env.E2E_AUTH_AUTO_LOGIN === 'true'
}

function isE2eAuthAvailable(request: NextRequest): boolean {
  if (process.env.E2E_AUTH_ENABLED !== 'true') return false
  if (process.env.E2E_AUTH_AUTO_LOGIN !== 'true' && !process.env.E2E_AUTH_SECRET) return false
  return isLoopbackHost(request)
}

function resolveE2eWxId(requestedWxId: unknown): string {
  const defaultWxId: string = sanitizeIdentifier(
    process.env.E2E_AUTH_DEFAULT_WX_ID,
    DEFAULT_E2E_WX_ID,
  )

  if (process.env.NODE_ENV === 'production') {
    return defaultWxId
  }

  return sanitizeIdentifier(requestedWxId, defaultWxId)
}

async function readJsonBody(request: NextRequest): Promise<E2eLoginBody> {
  try {
    return (await request.json()) as E2eLoginBody
  } catch {
    return {}
  }
}

function sanitizeIdentifier(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed: string = value.trim()
  if (!trimmed) return fallback
  return trimmed.replace(/[^\w.-]/g, '_').slice(0, 80) || fallback
}

function sanitizeDisplayName(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed: string = value.trim()
  return trimmed.slice(0, 80) || fallback
}

function sanitizeRedirect(target: string): string {
  if (!target.startsWith('/')) return '/m'
  if (target.startsWith('//')) return '/m'
  return target
}

function isLoopbackHost(request: NextRequest): boolean {
  const hostname: string = request.nextUrl.hostname.toLowerCase()
  if (hostname === 'localhost') return true
  if (hostname === '::1' || hostname === '[::1]') return true
  if (hostname === '0:0:0:0:0:0:0:1') return true
  if (hostname.startsWith('127.')) return true
  return false
}
