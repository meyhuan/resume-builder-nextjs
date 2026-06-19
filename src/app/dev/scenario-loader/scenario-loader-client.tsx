'use client'

import { Suspense, useEffect, useState, type ReactElement } from 'react'
import { useSearchParams } from 'next/navigation'
import AiSectionProvider from '@/components/ai-section/ai-section-provider'
import RightSidebar from '@/ui/right-sidebar'
import { getAllTemplates, getTemplate } from '@/templates/template-loader'
import { useAppStore } from '@/state/store'
import { RESUME_SCENARIOS } from '@/dev/resume-scenarios'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'

const DEFAULT_TEMPLATE = 'lanxin'

export default function ScenarioLoaderClient(): ReactElement {
  const searchParams = useSearchParams()
  const initialTemplate = searchParams.get('tpl') || DEFAULT_TEMPLATE
  const avatarUrl = searchParams.get('avatar')
  const scenarioId = searchParams.get('scenario') || ''
  const [tpl, setTpl] = useState(initialTemplate)
  const resume = useAppStore((s) => s.resume)
  const loadScenarioData = useAppStore((s) => s.loadScenarioData)
  const themes = useAppStore((s) => s.themes)
  const getThemeForTemplate = useAppStore((s) => s.getThemeForTemplate)
  const setThemeForTemplate = useAppStore((s) => s.setThemeForTemplate)
  const theme = themes[tpl] || getThemeForTemplate(tpl)
  const Template = getTemplate(tpl)?.component

  useEffect(() => {
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
  }, [avatarUrl, loadScenarioData, scenarioId])

  function patchTheme(patch: Partial<ThemeTokens>): void {
    setThemeForTemplate(tpl, (draft) => {
      Object.assign(draft, patch)
    })
  }

  return (
    <AiSectionProvider>
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto mb-4 flex max-w-7xl items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
          <span>Scenario Loader QA</span>
          <span data-scenario-active-template={tpl}>{tpl} / {resume.name}</span>
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_360px] gap-5">
          <section className="overflow-auto rounded-lg border border-slate-200 bg-slate-200 p-6">
            <div className="mx-auto w-[794px] bg-white shadow-sm" data-scenario-preview="true">
              <Suspense fallback={<div className="p-6">Loading template...</div>}>
                {Template ? <Template resume={resume} theme={theme} /> : null}
              </Suspense>
            </div>
          </section>

          <aside className="h-[calc(100vh-96px)] overflow-hidden rounded-lg border border-slate-200 bg-white">
            <RightSidebar
              activePanel="layout"
              onClose={() => {}}
              theme={theme}
              tpl={tpl}
              templates={getAllTemplates()}
              onTplChange={setTpl}
              onThemePatch={patchTheme}
            />
          </aside>
        </div>
      </main>
    </AiSectionProvider>
  )
}
