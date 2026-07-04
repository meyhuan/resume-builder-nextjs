import { NextResponse } from 'next/server'
import { getReleaseInfo } from '@/lib/release-info'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const release = await getReleaseInfo()

  return NextResponse.json(release, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
