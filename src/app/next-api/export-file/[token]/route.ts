import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readExportTemp } from '@/lib/export-temp-store'
import { buildExportContentDisposition, getExportFileExtension } from '@/lib/export-file-name'

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
    const record = await prisma.exportRecord.findUnique({
      where: { token },
      select: { ossUrl: true, expiresAt: true, status: true, fileName: true, type: true },
    })
    const available = record?.ossUrl
      && record.status === 'available'
      && record.expiresAt.getTime() > Date.now()
    if (available) {
      console.log('[export-file] proxying OSS asset', { token })
      const ossResponse = await fetch(record.ossUrl as string, { cache: 'no-store' })
      if (!ossResponse.ok) {
        console.warn('[export-file] OSS asset unavailable', { token, status: ossResponse.status })
        return NextResponse.json({ error: 'File not found or expired' }, { status: 404 })
      }
      const body = Buffer.from(await ossResponse.arrayBuffer())
      return new NextResponse(body as unknown as BodyInit, {
        headers: {
          'Content-Type': ossResponse.headers.get('Content-Type') || 'application/octet-stream',
          'Content-Disposition': buildExportContentDisposition(
            'attachment',
            record.fileName,
            getExportFileExtension(record.type),
          ),
          'Cache-Control': 'no-store',
        },
      })
    }
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
    ? buildExportContentDisposition('inline', entry.fileName, entry.extension)
    : buildExportContentDisposition('attachment', entry.fileName, entry.extension)
  console.log('[export-file] serving asset', { token, type: entry.type, confirmed: entry.confirmed, inline, fileName: entry.fileName, bytes: entry.buffer.length })
  return new NextResponse(entry.buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': entry.contentType,
      'Content-Disposition': disposition,
      'Cache-Control': 'no-store',
    },
  })
}
