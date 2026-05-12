import { NextResponse } from 'next/server'
import { verifyMiniSign } from '@/lib/verify-mini-sign'
import { markConfirmed, readExportTemp } from '@/lib/export-temp-store'
import { peekQuotaForUser, checkQuotaForUser } from '@/lib/quota/quota-checker'

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
    return NextResponse.json({
      id,
      downloadUrl: `/next-api/export-file/${id}`,
      expiresAt: new Date(entry.expiresAt).toISOString(),
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

  const next = await markConfirmed(id)
  if (!next) {
    console.error('[exports/mini/confirm] markConfirmed failed', { id })
    return NextResponse.json({ error: '确认失败，请重试' }, { status: 500 })
  }

  return NextResponse.json({
    id,
    downloadUrl: `/next-api/export-file/${id}`,
    expiresAt: new Date(next.expiresAt).toISOString(),
    confirmed: true,
    remaining: consumed.remaining,
    isVip: consumed.isVip,
  })
}
