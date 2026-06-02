import { NextResponse } from 'next/server'
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
 *   1. Verifies signed body.
 *   2. If asset already confirmed, returns success (idempotent).
 *   3. Peeks quota; if insufficient, returns 402 QUOTA_EXCEEDED.
 *   4. Consumes quota and flips the asset's `confirmed` flag.
 *
 * Body: { wxId, timestamp, sign }
 */

interface ConfirmRequestBody {
  readonly wxId?: unknown
  readonly timestamp?: unknown
  readonly sign?: unknown
  readonly fileName?: unknown
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

  const wxId: string = String(body.wxId ?? '')
  const timestamp: number = Number(body.timestamp)
  const sign: string = String(body.sign ?? '')
  const requestedFileName: string | undefined = typeof body.fileName === 'string' && body.fileName.trim()
    ? sanitizeExportFileName(body.fileName)
    : undefined
  const signError = verifyMiniSign({ wxId, timestamp, sign })
  if (signError) {
    console.warn('[exports/mini/confirm] sign error', { id, wxId, signError })
    return NextResponse.json({ error: signError }, { status: 403 })
  }

  console.log('[exports/mini/confirm] requested', { id, wxId })

  const entry = await readExportTemp(id)
  if (!entry) {
    console.warn('[exports/mini/confirm] asset missing or expired', { id })
    return NextResponse.json({ error: '导出已过期，请重新导出', code: 'EXPIRED' }, { status: 410 })
  }

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

  const peek = await peekQuotaForUser(wxId, 'pdf:export')
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

  const consumed = await checkQuotaForUser(wxId, 'pdf:export')
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
