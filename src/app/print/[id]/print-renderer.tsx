'use client'

import { Suspense, useEffect, useLayoutEffect, useMemo, useState, type ReactElement } from 'react'
import type { ResumeData } from '@/entities/resume/resume-data'
import { getRenderableResume } from '@/entities/resume/renderable-resume'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { getResumeFontFamily, normalizeResumeFontTheme } from '@/entities/theme/font-stacks'
import { TEMPLATE_REGISTRY } from '@/templates/template-loader'
import { useAppStore } from '@/state/store'
import { PortfolioAppendix } from '@/components/portfolio/portfolio-appendix'
import { compactOnePageLayout, fitOnePagePrintFrame } from '@/lib/one-page-layout'
import type { OnePageStrategy } from '@/entities/editor/editor-meta'

interface PrintRendererProps {
  readonly resume: ResumeData
  readonly templateId: string
  readonly savedTheme?: ThemeTokens
  readonly onePage?: boolean
  readonly onePageStrategy?: OnePageStrategy
}

const DEFAULT_THEME: ThemeTokens = {
  primaryColor: '#111827',
  textColor: '#111827',
  fontFamilyId: 'sans',
  fontFamily: getResumeFontFamily('sans'),
  fontSize: 15,
  lineHeight: 1.5,
  spacingScale: 1,
  pagePaddingVertical: 19,
  pagePaddingHorizontal: 15,
}

function resolveTheme(templateId: string): ThemeTokens {
  const recommended: string | undefined = TEMPLATE_REGISTRY[templateId]?.recommendedPrimaryColor
  const fontFamilyId = TEMPLATE_REGISTRY[templateId]?.recommendedFontFamilyId ?? 'sans'
  const theme = { ...DEFAULT_THEME, fontFamilyId, fontFamily: getResumeFontFamily(fontFamilyId) }
  if (!recommended) return theme
  return { ...theme, primaryColor: recommended }
}

/**
 * Client-side renderer for the print page.
 * Sets data-print-ready="1" after fonts load so puppeteer can capture.
 */
export default function PrintRenderer({ resume, templateId, savedTheme, onePage = false, onePageStrategy = 'one-page' }: PrintRendererProps): ReactElement {
  const config = TEMPLATE_REGISTRY[templateId] || TEMPLATE_REGISTRY['simple']
  const defaultTheme: ThemeTokens = useMemo(() => resolveTheme(config?.id ?? 'simple'), [config])
  const renderableResume = useMemo(() => getRenderableResume(resume), [resume])
  const setReadOnly = useAppStore((s) => s.setReadOnly)
  const setResume = useAppStore((s) => s.setResume)
  
  // Use the saved theme from the database if available, otherwise fallback to the default theme
  const theme: ThemeTokens = normalizeResumeFontTheme(
    savedTheme ?? defaultTheme,
    config.recommendedFontFamilyId ?? 'sans',
  )

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
        requestAnimationFrame(() => {
          if (onePage) {
            const root = document.querySelector<HTMLElement>('[data-print-template] .resume-document-main')
            const frame = document.querySelector<HTMLElement>('[data-one-page-print-frame]')
            if (root) {
              compactOnePageLayout(root, onePageStrategy)
              if (frame) fitOnePagePrintFrame(frame, root)
            }
          }
          markReady()
        })
      })
    })
    return () => { cancelled = true }
  }, [onePage, onePageStrategy])

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
        <div data-one-page-print-frame={onePage ? 'true' : undefined}>
          <div className="resume-document-main" data-one-page={onePage ? 'true' : 'false'} data-one-page-mode={onePage ? 'true' : 'false'} data-one-page-strategy={onePageStrategy} data-one-page-status={onePage ? 'fit' : 'idle'}>
            <TemplateComponent resume={renderableResume} theme={theme} />
          </div>
        </div>
        <PortfolioAppendix portfolio={renderableResume.portfolio} />
      </Suspense>
    </div>
  )
}
