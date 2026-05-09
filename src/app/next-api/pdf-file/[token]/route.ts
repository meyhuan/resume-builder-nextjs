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
  const entry = consumePdfTemp(token)
  if (!entry) {
    return NextResponse.json({ error: 'File not found or expired' }, { status: 404 })
  }
  return new NextResponse(entry.buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(entry.fileName)}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
