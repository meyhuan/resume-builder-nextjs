import { NextRequest, NextResponse } from 'next/server'
import { getServerJavaApiBaseUrl } from '@/lib/java-api-base'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''
const XHS_ADMIN_TOKEN = process.env.XHS_ADMIN_TOKEN || ADMIN_PASSWORD

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const adminPassword = typeof body.adminPassword === 'string' ? body.adminPassword : ''
  if (!ADMIN_PASSWORD || adminPassword !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid admin password' }, { status: 403 })
  }

  const action = typeof body.action === 'string' ? body.action : 'list'
  const javaBase = getServerJavaApiBaseUrl()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (XHS_ADMIN_TOKEN) headers['X-Xhs-Admin-Token'] = XHS_ADMIN_TOKEN

  const response = action === 'list'
    ? await fetch(`${javaBase}/xhs-note/admin/list${body.status === undefined ? '' : `?status=${encodeURIComponent(String(body.status))}`}`, { headers, cache: 'no-store' })
    : await fetch(`${javaBase}/xhs-note/admin/${action}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        cache: 'no-store',
      })

  const data = await response.json().catch(() => null)
  return NextResponse.json(data ?? { error: 'Invalid xhs admin response' }, { status: response.status })
}
