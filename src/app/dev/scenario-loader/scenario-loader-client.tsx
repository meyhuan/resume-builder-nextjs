'use client'

import { Suspense, useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import { useSearchParams } from 'next/navigation'
import AiSectionProvider from '@/components/ai-section/ai-section-provider'
import RightSidebar from '@/ui/right-sidebar'
import { getAllTemplates, getPublicTemplates, getTemplate } from '@/templates/template-loader'
import { useAppStore } from '@/state/store'
import { RESUME_SCENARIOS } from '@/dev/resume-scenarios'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { PortfolioAppendix } from '@/components/portfolio/portfolio-appendix'
import { getTemplateFixture, getTemplateLabTheme } from '@/lib/template-fixtures'
import { useOnePageMode } from '@/hooks/use-one-page-mode'
import type { AdjustableTokens } from '@/entities/editor/editor-meta'
import { buildResumeHtml } from '@/io/html-export'

const DEFAULT_TEMPLATE = 'lanxin'

export default function ScenarioLoaderClient(): ReactElement {
  const searchParams = useSearchParams()
  const initialTemplate = searchParams.get('tpl') || DEFAULT_TEMPLATE
  const avatarUrl = searchParams.get('avatar')
  const scenarioId = searchParams.get('scenario') || ''
  const fixtureId = searchParams.get('fixture')
  const readOnly = searchParams.get('readonly') === '1'
  const templates = searchParams.get('includeHidden') === '1' ? getAllTemplates() : getPublicTemplates()
  const activePanel = searchParams.get('panel') === 'sections' ? 'sections' : 'layout'
  const [tpl, setTpl] = useState(initialTemplate)
  const [onePage, setOnePage] = useState(false)
  const [snapshot, setSnapshot] = useState<AdjustableTokens | null>(null)
  const [exportHtml, setExportHtml] = useState('')
  const resumeBodyRef = useRef<HTMLDivElement>(null)
  const resume = useAppStore((s) => s.resume)
  const loadScenarioData = useAppStore((s) => s.loadScenarioData)
  const setReadOnly = useAppStore((s) => s.setReadOnly)
  const themes = useAppStore((s) => s.themes)
  const getThemeForTemplate = useAppStore((s) => s.getThemeForTemplate)
  const setThemeForTemplate = useAppStore((s) => s.setThemeForTemplate)
  const theme = themes[tpl] || getThemeForTemplate(tpl)
  const Template = getTemplate(tpl)?.component

  useEffect(() => {
    if (fixtureId) {
      loadScenarioData(structuredClone(getTemplateFixture(fixtureId)))
      setThemeForTemplate(initialTemplate, (draft) => Object.assign(draft, getTemplateLabTheme('base')))
      return
    }
    const firstScenario = RESUME_SCENARIOS.find((scenario) => scenario.id === scenarioId) ?? RESUME_SCENARIOS[0]
    if (firstScenario) {
      loadScenarioData({
        ...firstScenario.resume,
        baseInfo: {
          ...(firstScenario.resume.baseInfo ?? {}),
          ...(avatarUrl ? { avatarUrl, showAvatar: true } : {}),
        },
      })
    }
  }, [avatarUrl, fixtureId, initialTemplate, loadScenarioData, scenarioId, setThemeForTemplate])

  useEffect(() => {
    setReadOnly(readOnly)
    return () => setReadOnly(false)
  }, [readOnly, setReadOnly])

  const patchTheme = useCallback((patch: Partial<ThemeTokens>): void => {
    setThemeForTemplate(tpl, (draft) => {
      Object.assign(draft, patch)
    })
  }, [setThemeForTemplate, tpl])

  const { status: onePageStatus, reset: resetOnePage } = useOnePageMode({
    contentRef: resumeBodyRef, theme, patchTheme, enabled: onePage, snapshot, setSnapshot,
  })

  function changeTemplate(nextTemplate: string): void {
    resetOnePage()
    setOnePage(false)
    setTpl(nextTemplate)
  }

  return (
    <AiSectionProvider>
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto mb-4 flex max-w-7xl items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
          <span>Scenario Loader QA</span>
          <span data-scenario-active-template={tpl}>{tpl} / {resume.name}</span>
          <button data-qa-export="true" onClick={() => {
            if (resumeBodyRef.current) setExportHtml(buildResumeHtml(resumeBodyRef.current))
          }}>生成导出 HTML（QA）</button>
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_360px] gap-5">
          <section className="overflow-auto rounded-lg border border-slate-200 bg-slate-200 p-6">
            <div className="mx-auto w-[794px] bg-white shadow-sm" data-scenario-preview="true">
              <div ref={resumeBodyRef} className="resume-document-main" data-one-page={onePage && onePageStatus === 'fit' ? 'true' : 'false'} data-one-page-status={onePageStatus} data-qa-theme={JSON.stringify(theme)}>
              <Suspense fallback={<div className="p-6">Loading template...</div>}>
                {Template ? <Template resume={resume} theme={theme} /> : null}
                <PortfolioAppendix portfolio={resume.portfolio} />
              </Suspense>
              </div>
            </div>
          </section>

          <aside className="h-[calc(100vh-96px)] overflow-hidden rounded-lg border border-slate-200 bg-white">
            <RightSidebar
              enableScenarioData
              activePanel={activePanel}
              onClose={() => {}}
              theme={theme}
              tpl={tpl}
              templates={templates}
              onTplChange={changeTemplate}
              onThemePatch={patchTheme}
              onePage={onePage}
              onePageStatus={onePageStatus}
              onOnePageChange={setOnePage}
            />
          </aside>
        </div>
        <textarea hidden readOnly data-qa-export-html="true" value={exportHtml} />
      </main>
    </AiSectionProvider>
  )
}
