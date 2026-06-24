import { NextResponse } from 'next/server'
import { saveDiagnosticsTemp, sanitizeDiagnosticsFileName } from '@/lib/mobile-diagnostics-temp-store'

export const runtime = 'nodejs'

const MAX_DIAGNOSTICS_BYTES = 256 * 1024

interface DiagnosticsRequestBody {
  readonly diagnostics?: unknown
  readonly fileName?: string
}

export async function POST(request: Request): Promise<NextResponse> {
  const contentLength: number = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_DIAGNOSTICS_BYTES) {
    return NextResponse.json({ error: 'Diagnostics payload too large' }, { status: 413 })
  }

  let body: DiagnosticsRequestBody
  try {
    body = await request.json() as DiagnosticsRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const diagnostics: unknown = body.diagnostics ?? body
  const serialized: string = JSON.stringify(diagnostics, null, 2)
  const buffer: Buffer = Buffer.from(serialized, 'utf8')
  if (buffer.length > MAX_DIAGNOSTICS_BYTES) {
    return NextResponse.json({ error: 'Diagnostics payload too large' }, { status: 413 })
  }

  const saved = await saveDiagnosticsTemp({
    buffer,
    fileName: sanitizeDiagnosticsFileName(body.fileName),
  })

  return NextResponse.json({
    token: saved.token,
    fileName: saved.fileName,
    expiresAt: new Date(saved.expiresAt).toISOString(),
    downloadUrl: `/next-api/mobile-diagnostics/${saved.token}`,
  })
}
