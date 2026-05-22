'use client'

import { Suspense, useEffect, useLayoutEffect, useMemo, useState, type ReactElement } from 'react'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { TEMPLATE_REGISTRY } from '@/templates/template-loader'
import { useAppStore } from '@/state/store'

interface PrintRendererProps {
  readonly resume: ResumeData
  readonly templateId: string
  readonly savedTheme?: ThemeTokens
}

const DEFAULT_THEME: ThemeTokens = {
  primaryColor: '#111827',
  textColor: '#111827',
  fontFamily: 'Inter, "Noto Sans SC", system-ui, sans-serif',
  fontSize: 15,
  lineHeight: 1.5,
  spacingScale: 1,
  pagePaddingVertical: 19,
  pagePaddingHorizontal: 15,
}

function resolveTheme(templateId: string): ThemeTokens {
  const recommended: string | undefined = TEMPLATE_REGISTRY[templateId]?.recommendedPrimaryColor
  if (!recommended) return DEFAULT_THEME
  return { ...DEFAULT_THEME, primaryColor: recommended }
}

/**
 * Client-side renderer for the print page.
 * Sets data-print-ready="1" after fonts load so puppeteer can capture.
 */
export default function PrintRenderer({ resume, templateId, savedTheme }: PrintRendererProps): ReactElement {
  const config = TEMPLATE_REGISTRY[templateId] || TEMPLATE_REGISTRY['simple']
  const defaultTheme: ThemeTokens = useMemo(() => resolveTheme(config?.id ?? 'simple'), [config])
  const setReadOnly = useAppStore((s) => s.setReadOnly)
  const setResume = useAppStore((s) => s.setResume)
  
  // Use the saved theme from the database if available, otherwise fallback to the default theme
  const theme: ThemeTokens = savedTheme ?? defaultTheme

  const [ready, setReady] = useState<boolean>(false)

  useLayoutEffect((): (() => void) => {
    setReadOnly(true)
    setResume((draft: ResumeData): void => {
      Object.assign(draft, resume)
    })
    return (): void => {
      setReadOnly(false)
    }
  }, [resume, setReadOnly, setResume])

  useEffect(() => {
    let cancelled = false
    const markReady = (): void => {
      if (cancelled) return
      console.log('[print-renderer] ready')
      setReady(true)
    }
    const fontsPromise: Promise<unknown> =
      (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready ?? Promise.resolve()
    void fontsPromise.finally((): void => {
      requestAnimationFrame((): void => {
        requestAnimationFrame(markReady)
      })
    })
    return () => { cancelled = true }
  }, [])

  if (!config) {
    console.error('[print-renderer] no template config', { templateId })
    return <div data-print-error="no-template">Template not found: {templateId}</div>
  }

  const TemplateComponent = config.component
  const titleScale: number = theme.titleScale ?? 1
  const paragraphIndent: number = theme.paragraphIndent ?? 0
  const scopedStyleId = `print-scope-${templateId}`

  return (
    <div id={scopedStyleId} data-print-template={config.id} data-print-ready={ready ? '1' : '0'}>
      <style>{`
        #${scopedStyleId} .resume-container h2 {
          font-size: calc(1.285em * ${titleScale}) !important;
        }
        #${scopedStyleId} .resume-container p {
          text-indent: ${paragraphIndent}em;
        }
      `}</style>
      <Suspense fallback={<div data-print-loading="1" />}>
        <TemplateComponent resume={resume} theme={theme} />
      </Suspense>
    </div>
  )
}
