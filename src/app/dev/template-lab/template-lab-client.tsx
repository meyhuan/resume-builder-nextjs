'use client'

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement } from 'react'
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
  const spacingOverride = searchParams.get('spacing')
  const hideJobIntention = searchParams.get('job') === 'hidden'
  const viewport = searchParams.get('viewport') === 'mobile' ? 'mobile' : 'pc'
  const resume: ResumeData = useMemo(() => {
    const fixture = getTemplateFixture(fixtureId)
    return hideJobIntention ? { ...fixture, jobIntentionVisible: false } : fixture
  }, [fixtureId, hideJobIntention])
  const theme: ThemeTokens = useMemo(() => {
    const fixtureTheme = getTemplateLabTheme(themeId)
    const base = themeId === 'color' ? fixtureTheme : { ...fixtureTheme, primaryColor: TEMPLATE_REGISTRY[templateId]?.recommendedPrimaryColor ?? fixtureTheme.primaryColor }
    const scale = spacingOverride === null ? NaN : Number(spacingOverride)
    return Number.isFinite(scale) && scale >= 0 && scale <= 3 ? { ...base, spacingScale: scale } : base
  }, [themeId, spacingOverride, templateId])
  const Template = TEMPLATE_REGISTRY[templateId]?.component
  const setReadOnly = useAppStore((s) => s.setReadOnly)
  const setResume = useAppStore((s) => s.setResume)
  const titleScale: number = theme.titleScale ?? 1
  const paragraphIndent: number = theme.paragraphIndent ?? 0
  const labKey = `${templateId}:${fixtureId}:${themeId}:${viewport}:${spacingOverride}:${hideJobIntention}`
  const [readyKey, setReadyKey] = useState<string | null>(null)
  const ready = readyKey === labKey
  const stageRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [mobileWidth, setMobileWidth] = useState(0)
  const [contentHeight, setContentHeight] = useState(0)
  const mobileScale = mobileWidth / A4_WIDTH_PX

  useLayoutEffect(() => {
    if (viewport !== 'mobile' || !stageRef.current || !contentRef.current) return
    const stage = stageRef.current
    const content = contentRef.current
    const update = (): void => {
      setMobileWidth(Math.min(stage.clientWidth, A4_WIDTH_PX * 0.46))
      setContentHeight(content.offsetHeight)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(stage)
    observer.observe(content)
    return (): void => observer.disconnect()
  }, [viewport, templateId])

  useLayoutEffect(() => {
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
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setReadyKey(labKey)
      })
    })
    return (): void => {
      cancelled = true
    }
  }, [labKey, resume, theme])

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
        <div className="mx-auto mb-4 flex max-w-5xl flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          <span>Template Lab</span>
          <span>{templateId} / {fixtureId} / {themeId} / {viewport}</span>
        </div>

        <div ref={stageRef} className={viewport === 'mobile' ? 'w-full overflow-hidden' : undefined}>
        <div
          className="mx-auto"
          style={{
            width: viewport === 'mobile' ? `${A4_WIDTH_PX * mobileScale}px` : `${A4_WIDTH_PX}px`,
            height: viewport === 'mobile' ? `${contentHeight * mobileScale}px` : undefined,
          }}
        >
          <div
            ref={contentRef}
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
        </div>
      </main>
    </AiSectionProvider>
  )
}
