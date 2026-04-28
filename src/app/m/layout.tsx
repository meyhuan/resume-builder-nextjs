import { type ReactElement, type ReactNode } from 'react'
import MobileDebugTools from './_components/mobile-debug-tools'

/**
 * Root layout for all mobile (/m/*) pages. Ships the on-device debug panel
 * (vConsole) conditionally — see MobileDebugTools for activation rules.
 */
export default function MobileRootLayout(
  { children }: { readonly children: ReactNode },
): ReactElement {
  return (
    <>
      <MobileDebugTools />
      {children}
    </>
  )
}
