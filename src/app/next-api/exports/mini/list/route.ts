import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyMiniSign } from '@/lib/verify-mini-sign'

interface ListRequestBody {
  readonly wxId?: unknown
  readonly timestamp?: unknown
  readonly sign?: unknown
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: ListRequestBody
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
    console.warn('[exports/mini/list] sign error', { wxId, signError })
    return NextResponse.json({ error: signError }, { status: 403 })
  }

  const now = new Date()
  await prisma.exportRecord.updateMany({
    where: {
      wxId,
      status: 'available',
      expiresAt: { lt: now },
    },
    data: { status: 'expired' },
  })

  const records = await prisma.exportRecord.findMany({
    where: { wxId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      resumeId: true,
      resumeTitle: true,
      templateId: true,
      type: true,
      fileName: true,
      token: true,
      expiresAt: true,
      status: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    items: records.map((record) => {
      const available = record.status === 'available' && record.expiresAt.getTime() > Date.now()
      return {
        id: record.id,
        resumeId: record.resumeId,
        resumeTitle: record.resumeTitle,
        templateId: record.templateId,
        type: record.type,
        fileName: record.fileName,
        downloadUrl: `/next-api/export-file/${record.token}`,
        expiresAt: record.expiresAt.toISOString(),
        createdAt: record.createdAt.toISOString(),
        available,
        status: available ? 'available' : 'expired',
      }
    }),
  })
}
