import { NextResponse } from 'next/server'
import { readExportTemp } from '@/lib/export-temp-store'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params
  const url = new URL(req.url)
  const inline: boolean = url.searchParams.get('inline') === '1'
  console.log('[export-file] request', { token, inline })
  const entry = await readExportTemp(token)
  if (!entry) {
    console.warn('[export-file] not found or expired', { token })
    return NextResponse.json({ error: 'File not found or expired' }, { status: 404 })
  }
  // Defense in depth: a non-inline (distribution) download requires the asset
  // to be confirmed (quota consumed). Inline preview is allowed for the
  // unconfirmed asset so the user can verify the file before confirming.
  if (!inline && !entry.confirmed) {
    console.warn('[export-file] blocked unconfirmed download', { token })
    return NextResponse.json({ error: 'Export not confirmed yet', code: 'NOT_CONFIRMED' }, { status: 409 })
  }
  const disposition: string = inline
    ? `inline; filename="${encodeURIComponent(entry.fileName)}.${entry.extension}"`
    : `attachment; filename="${encodeURIComponent(entry.fileName)}.${entry.extension}"`
  console.log('[export-file] serving asset', { token, type: entry.type, confirmed: entry.confirmed, inline, fileName: entry.fileName, bytes: entry.buffer.length })
  return new NextResponse(entry.buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': entry.contentType,
      'Content-Disposition': disposition,
      'Cache-Control': 'no-store',
    },
  })
}
