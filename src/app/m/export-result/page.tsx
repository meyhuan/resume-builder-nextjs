import type { Metadata } from 'next'
import { Suspense, type ReactElement } from 'react'
import ExportResultClient from './export-result-client'

export const metadata: Metadata = {
  title: '导出简历',
  robots: { index: false, follow: false },
}

export default function MobileExportResultPage(): ReactElement {
  return (
    <Suspense>
      <ExportResultClient />
    </Suspense>
  )
}
