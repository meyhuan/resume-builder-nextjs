import 'server-only'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { isJobFitEnabledForUser } from './flags'

export class JobFitAuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message)
  }
}

export async function requireJobFitUser(): Promise<{ id: string; wxId: string }> {
  const wxId = (await cookies()).get('auth_uid')?.value
  if (!wxId) throw new JobFitAuthError('请先登录', 401, 'UNAUTHORIZED')
  if (!isJobFitEnabledForUser(wxId)) throw new JobFitAuthError('岗位定制暂未对当前账号开放', 404, 'FEATURE_DISABLED')
  const user = await prisma.user.upsert({
    where: { wxId },
    update: {},
    create: { wxId, name: `用户_${wxId}` },
    select: { id: true, wxId: true },
  })
  return { id: user.id, wxId: user.wxId! }
}
