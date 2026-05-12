'use client'

import { Suspense, useEffect, useMemo, useState, type ReactElement } from 'react'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { TEMPLATE_REGISTRY } from '@/templates/template-loader'

interface PrintRendererProps {
  readonly resume: ResumeData
  readonly templateId: string
}

const DEFAULT_THEME: ThemeTokens = {
  primaryColor: '#111827',
  textColor: '#111827',
  fontFamily: 'Inter, "Noto Sans SC", system-ui, sans-serif',
  fontSize: 15,
  lineHeight: 1.55,
  spacingScale: 1,
  pagePaddingVertical: 22,
  pagePaddingHorizontal: 18,
}

function resolveTheme(templateId: string): ThemeTokens {
  const recommended: string | undefined = TEMPLATE_REGISTRY[templateId]?.recommendedPrimaryColor
  if (!recommended) return DEFAULT_THEME
  return { ...DEFAULT_THEME, primaryColor: recommended }
}

/**
 * Client-side renderer for the print page. Mounts the lazy template component
 * with resume data and a recommended theme. Sets `data-print-ready="1"` on the
 * outer container after fonts + first paint, so puppeteer can wait for it.
 */
export default function PrintRenderer({ resume, templateId }: PrintRendererProps): ReactElement {
  const config = TEMPLATE_REGISTRY[templateId] || TEMPLATE_REGISTRY['simple']
  const theme: ThemeTokens = useMemo(() => resolveTheme(config?.id ?? 'simple'), [config])
  const [ready, setReady] = useState<boolean>(false)

  useEffect(() => {
    let cancelled = false
    const markReady = (): void => {
      if (cancelled) return
      console.log('[print-renderer] ready signal')
      setReady(true)
    }
    const fontsPromise: Promise<unknown> = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready ?? Promise.resolve()
    void fontsPromise.finally((): void => {
      requestAnimationFrame((): void => {
        requestAnimationFrame(markReady)
      })
    })
    return () => { cancelled = true }
  }, [templateId])

  if (!config) {
    console.error('[print-renderer] no template config', { templateId })
    return <div data-print-error="no-template">Template not found: {templateId}</div>
  }

  const TemplateComponent = config.component

  return (
    <div data-print-template={config.id} data-print-ready={ready ? '1' : '0'}>
      <Suspense fallback={<div data-print-loading="1" />}>
        <TemplateComponent resume={resume} theme={theme} />
      </Suspense>
    </div>
  )
}
