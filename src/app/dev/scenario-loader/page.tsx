import { Suspense, type ReactElement } from 'react'
import ScenarioLoaderClient from './scenario-loader-client'

export default function ScenarioLoaderPage(): ReactElement {
  return (
    <Suspense fallback={null}>
      <ScenarioLoaderClient />
    </Suspense>
  )
}
