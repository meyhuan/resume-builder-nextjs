'use client'

import { Suspense, useEffect, useMemo, useState, type ReactElement } from 'react'
import { useSearchParams } from 'next/navigation'
import AiSectionProvider from '@/components/ai-section/ai-section-provider'
import { useAppStore } from '@/state/store'
import { TEMPLATE_REGISTRY } from '@/templates/template-loader'
import {
  getTemplateFixture,
  getTemplateLabTheme,
  normalizeFixtureId,
  normalizeThemeId,
} from '@/lib/template-fixtures'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'

const A4_WIDTH_PX = 794

export default function TemplateLabClient(): ReactElement {
  const searchParams = useSearchParams()
  const requestedTemplateId = searchParams.get('tpl') || 'simple'
  const templateId = TEMPLATE_REGISTRY[requestedTemplateId] ? requestedTemplateId : 'simple'
  const fixtureId = normalizeFixtureId(searchParams.get('fixture'))
  const themeId = normalizeThemeId(searchParams.get('theme'))
  const viewport = searchParams.get('viewport') === 'mobile' ? 'mobile' : 'pc'
  const resume: ResumeData = useMemo(() => getTemplateFixture(fixtureId), [fixtureId])
  const theme: ThemeTokens = useMemo(() => getTemplateLabTheme(themeId), [themeId])
  const Template = TEMPLATE_REGISTRY[templateId]?.component
  const setReadOnly = useAppStore((s) => s.setReadOnly)
  const setResume = useAppStore((s) => s.setResume)
  const titleScale: number = theme.titleScale ?? 1
  const paragraphIndent: number = theme.paragraphIndent ?? 0
  const labKey = `${templateId}:${fixtureId}:${themeId}:${viewport}`
  const [readyKey, setReadyKey] = useState<string | null>(null)
  const ready = readyKey === labKey
  const mobileScale = 0.46

  useEffect(() => {
    let cancelled = false
    setReadOnly(true)
    setResume((draft: ResumeData): void => {
      Object.assign(draft, resume)
    })
    queueMicrotask(() => {
      if (!cancelled) setReadyKey(labKey)
    })
    return (): void => {
      cancelled = true
      setReadOnly(false)
    }
  }, [labKey, resume, setReadOnly, setResume])

  return (
    <AiSectionProvider>
      <main
        data-template-lab={ready ? 'ready' : 'loading'}
        data-template-id={templateId}
        data-fixture-id={fixtureId}
        data-theme-id={themeId}
        data-viewport={viewport}
        className={viewport === 'mobile' ? 'min-h-screen bg-slate-100 p-3' : 'min-h-screen bg-slate-100 p-8'}
      >
        <div className="mx-auto mb-4 flex max-w-5xl items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          <span>Template Lab</span>
          <span>{templateId} / {fixtureId} / {themeId} / {viewport}</span>
        </div>

        <div
          className="mx-auto"
          style={{
            width: viewport === 'mobile' ? `${A4_WIDTH_PX * mobileScale}px` : `${A4_WIDTH_PX}px`,
          }}
        >
          <div
            id={`template-lab-scope-${templateId}`}
            data-template-root="true"
            className="overflow-visible bg-white shadow-sm"
            style={{
              width: `${A4_WIDTH_PX}px`,
              transform: viewport === 'mobile' ? `scale(${mobileScale})` : undefined,
              transformOrigin: 'top left',
            }}
          >
            <style>{`
              #template-lab-scope-${templateId} .resume-container h2 {
                font-size: calc(1.285em * ${titleScale}) !important;
              }
              #template-lab-scope-${templateId} .resume-container p {
                text-indent: ${paragraphIndent}em;
              }
            `}</style>
            <Suspense fallback={<div data-template-loading="true">Loading template...</div>}>
              {Template ? <Template resume={resume} theme={theme} /> : <div>Template not found</div>}
            </Suspense>
          </div>
        </div>
      </main>
    </AiSectionProvider>
  )
}
