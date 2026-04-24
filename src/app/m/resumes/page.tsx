import type { ReactElement } from 'react'
import MobileResumesClient from './resumes-client'

/**
 * Mobile-only "all resumes" page. Replaces the PC `/dashboard` as the
 * navigation target from `/m`'s "查看全部" link.
 */
export default function Page(): ReactElement {
  return <MobileResumesClient />
}
