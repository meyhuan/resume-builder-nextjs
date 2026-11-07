import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyMiniSign } from '@/lib/verify-mini-sign'
import { markConfirmed, readExportTemp, type ExportTempEntry } from '@/lib/export-temp-store'
import { uploadExportAsset } from '@/lib/upload-export-asset'
import { peekQuotaForUser, checkQuotaForUser } from '@/lib/quota/quota-checker'
import { sanitizeExportFileName } from '@/lib/export-file-name'

/**
 * POST /next-api/exports/mini/[id]/confirm
 *
 * Final step in the preview→confirm export flow:
 *   1. Verifies signed body or same-origin cookie authentication.
 *   2. If asset already confirmed, returns success (idempotent).
 *   3. Peeks quota; if insufficient, returns 402 QUOTA_EXCEEDED.
 *   4. Consumes quota (except free Markdown) and flips `confirmed`.
 *
 * Body: { wxId?, timestamp?, sign?, fileName? }
 */

interface ConfirmRequestBody {
  readonly wxId?: unknown
  readonly timestamp?: unknown
  readonly sign?: unknown
  readonly fileName?: unknown
}

function hasAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true
  try {
    const url = new URL(req.url)
    // Production Nginx preserves Host and overwrites X-Forwarded-Proto.
    // Next's internal request URL can still contain localhost:3000.
    const host = req.headers.get('host') || url.host
    const protocol = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || url.protocol.slice(0, -1)
    if (protocol !== 'http' && protocol !== 'https') return false
    return new URL(origin).origin === new URL(`${protocol}://${host}`).origin
  } catch {
    return false
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params
  let body: ConfirmRequestBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  let wxId: string = String(body.wxId ?? '')
  const timestamp: number = Number(body.timestamp)
  const sign: string = String(body.sign ?? '')
  const requestedFileName: string | undefined = typeof body.fileName === 'string' && body.fileName.trim()
    ? sanitizeExportFileName(body.fileName)
    : undefined
  if (body.wxId || body.sign || body.timestamp) {
    const signError = verifyMiniSign({ wxId, timestamp, sign })
    if (signError) return NextResponse.json({ error: signError }, { status: 403 })
  } else {
    if (!hasAllowedOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    wxId = (await cookies()).get('auth_uid')?.value || ''
    if (!wxId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[exports/mini/confirm] requested', { id, wxId })

  const entry = await readExportTemp(id)
  if (!entry) {
    console.warn('[exports/mini/confirm] asset missing or expired', { id })
    return NextResponse.json({ error: '导出已过期，请重新导出', code: 'EXPIRED' }, { status: 410 })
  }

  if (entry.wxId !== wxId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (entry.confirmed) {
    console.log('[exports/mini/confirm] already confirmed (idempotent)', { id })
    const next = requestedFileName ? await markConfirmed(id, requestedFileName) : null
    const confirmedEntry: ExportTempEntry = next ? { ...entry, ...next, confirmed: true } : entry
    await persistExportRecord(id, wxId, confirmedEntry)
    return NextResponse.json({
      id,
      downloadUrl: `/next-api/export-file/${id}`,
      fileName: confirmedEntry.fileName,
      expiresAt: new Date(confirmedEntry.expiresAt).toISOString(),
      confirmed: true,
    })
  }

  const free = { allowed: true, remaining: 'unlimited' as const, isVip: false, message: '' }
  const peek = entry.type === 'markdown' ? free : await peekQuotaForUser(wxId, 'pdf:export')
  console.log('[exports/mini/confirm] quota peek', { id, wxId, ...peek })
  if (!peek.allowed) {
    return NextResponse.json({
      error: peek.message,
      code: 'QUOTA_EXCEEDED',
      remaining: peek.remaining,
      isVip: peek.isVip,
    }, { status: 402 })
  }

  const ossAsset = await uploadExportAsset({
    token: id,
    buffer: entry.buffer,
    contentType: entry.contentType,
    extension: entry.extension,
  })

  const consumed = entry.type === 'markdown' ? free : await checkQuotaForUser(wxId, 'pdf:export')
  console.log('[exports/mini/confirm] quota consumed', { id, wxId, ...consumed })
  if (!consumed.allowed) {
    return NextResponse.json({
      error: consumed.message,
      code: 'QUOTA_EXCEEDED',
      remaining: consumed.remaining,
      isVip: consumed.isVip,
    }, { status: 402 })
  }

  const next = await markConfirmed(id, requestedFileName)
  if (!next) {
    console.error('[exports/mini/confirm] markConfirmed failed', { id })
    return NextResponse.json({ error: '确认失败，请重试' }, { status: 500 })
  }

  const confirmedEntry: ExportTempEntry = { ...entry, ...next, confirmed: true }
  await persistExportRecord(id, wxId, confirmedEntry, ossAsset)

  return NextResponse.json({
    id,
    downloadUrl: `/next-api/export-file/${id}`,
    fileName: confirmedEntry.fileName,
    expiresAt: new Date(next.expiresAt).toISOString(),
    confirmed: true,
    remaining: consumed.remaining,
    isVip: consumed.isVip,
  })
}

async function persistExportRecord(
  token: string,
  wxId: string,
  entry: ExportTempEntry,
  ossAsset?: { readonly key: string; readonly url: string },
): Promise<void> {
  if (!entry.userId || !entry.resumeId) {
    console.warn('[exports/mini/confirm] missing export metadata, skip record', {
      token,
      wxId,
      hasUserId: Boolean(entry.userId),
      hasResumeId: Boolean(entry.resumeId),
    })
    return
  }

  await prisma.exportRecord.upsert({
    where: { token },
    update: {
      userId: entry.userId,
      wxId: entry.wxId || wxId,
      resumeId: entry.resumeId,
      resumeTitle: entry.resumeTitle || entry.fileName,
      templateId: entry.templateId || null,
      type: entry.type,
      fileName: entry.fileName,
      ...(ossAsset ? { ossKey: ossAsset.key, ossUrl: ossAsset.url } : {}),
      expiresAt: new Date(entry.expiresAt),
      status: entry.expiresAt > Date.now() ? 'available' : 'expired',
      confirmedAt: new Date(),
    },
    create: {
      userId: entry.userId,
      wxId: entry.wxId || wxId,
      resumeId: entry.resumeId,
      resumeTitle: entry.resumeTitle || entry.fileName,
      templateId: entry.templateId || null,
      type: entry.type,
      fileName: entry.fileName,
      token,
      ossKey: ossAsset?.key,
      ossUrl: ossAsset?.url,
      expiresAt: new Date(entry.expiresAt),
      status: entry.expiresAt > Date.now() ? 'available' : 'expired',
    },
  })
}
