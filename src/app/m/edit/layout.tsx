import { type ReactElement, type ReactNode } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { MobileRouteTransition } from './_components/mobile-route-transition'

/**
 * Mobile edit layout (server component): guards all /m/edit/* routes.
 * Requires the {@code auth_uid} cookie; otherwise sends the user to /login.
 */
export default async function MobileEditLayout(
  { children }: { readonly children: ReactNode },
): Promise<ReactElement> {
  const store = await cookies()
  const uid: string | undefined = store.get('auth_uid')?.value
  if (!uid) {
    redirect('/login?redirect=/m/edit')
  }
  return <MobileRouteTransition>{children}</MobileRouteTransition>
}
