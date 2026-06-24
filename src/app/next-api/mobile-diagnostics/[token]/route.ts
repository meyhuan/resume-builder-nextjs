import { NextResponse } from 'next/server'
import { readDiagnosticsTemp } from '@/lib/mobile-diagnostics-temp-store'

export const runtime = 'nodejs'

interface RouteParams {
  readonly params: Promise<{
    readonly token: string
  }>
}

export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { token } = await params
  const entry = await readDiagnosticsTemp(token)
  if (!entry) {
    return NextResponse.json({ error: 'Diagnostics file not found or expired' }, { status: 404 })
  }

  return new NextResponse(entry.buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${entry.fileName}"`,
      'Cache-Control': 'no-store',
    },
  })
}
