import { NextResponse } from 'next/server'
import { consumePdfTemp } from '@/lib/pdf-temp-store'

/**
 * GET /next-api/pdf-file/[token]
 *
 * Serves a previously generated PDF stored by token (single-use, 5 min TTL).
 * Used by the WeChat mini-program to download the PDF via wx.downloadFile.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params
  console.log('[pdf-file] request', { token })
  const entry = await consumePdfTemp(token)
  if (!entry) {
    console.warn('[pdf-file] not found or expired', { token })
    return NextResponse.json({ error: 'File not found or expired' }, { status: 404 })
  }
  console.log('[pdf-file] serving PDF', { token, fileName: entry.fileName, bytes: entry.buffer.length })
  return new NextResponse(entry.buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(entry.fileName)}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
