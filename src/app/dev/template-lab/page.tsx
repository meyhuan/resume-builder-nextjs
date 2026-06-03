import { Suspense, type ReactElement } from 'react'
import TemplateLabClient from './template-lab-client'

export default function TemplateLabPage(): ReactElement {
  return (
    <Suspense fallback={null}>
      <TemplateLabClient />
    </Suspense>
  )
}
