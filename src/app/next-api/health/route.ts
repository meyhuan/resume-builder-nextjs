import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(): Promise<NextResponse> {
  const startedAt = Date.now()
  const checks: Record<string, 'ok' | 'error'> = {
    app: 'ok',
    db: 'ok',
    jobFitSchema: 'ok',
  }

  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    checks.db = 'error'
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ table_name: string | null }>>`SELECT to_regclass('"JobFitTask"')::text AS table_name`
    if (!rows[0]?.table_name) checks.jobFitSchema = 'error'
  } catch {
    checks.jobFitSchema = 'error'
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
