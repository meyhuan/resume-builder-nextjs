import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  const startedAt = Date.now()
  const checks: Record<string, 'ok' | 'error'> = {
    app: 'ok',
    db: 'ok',
  }

  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    checks.db = 'error'
  }

  const ok = Object.values(checks).every((status) => status === 'ok')
  return NextResponse.json(
    {
      status: ok ? 'ok' : 'error',
      service: 'resume-builder-nextjs',
      checks,
      durationMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  )
}
