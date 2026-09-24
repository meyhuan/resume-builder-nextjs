'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { syncUserIdentity, type UserIdentity } from '@/lib/sync-user-identity'

export async function syncNextUserAction(userData: UserIdentity) {
  try {
    const user = await syncUserIdentity(userData)
    return { success: true, user }
  } catch (error: unknown) {
    console.error('Server Action Error (syncNextUserAction):', error)
    return { success: false, error: '账号同步失败，请重试或联系客服' }
  }
}

export async function revalidateDashboard() {
  revalidatePath('/dashboard')
}

/**
 * @deprecated Use /editor/new route instead for blank resume creation.
 */
export async function createResume(): Promise<never> {
  redirect('/editor/new')
}
