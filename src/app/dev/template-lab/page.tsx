import { Suspense, type ReactElement } from 'react'
import TemplateLabClient from './template-lab-client'

export const dynamic = 'force-dynamic'

export default function TemplateLabPage(): ReactElement {
  return (
    <Suspense fallback={<div data-template-lab="loading" />}>
      <TemplateLabClient />
    </Suspense>
  )
}
