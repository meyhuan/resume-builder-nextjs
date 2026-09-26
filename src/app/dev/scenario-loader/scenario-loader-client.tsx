'use client'

import { Suspense, useEffect, useState, useRef, type ReactElement } from 'react'
import { useSearchParams } from 'next/navigation'
import AiSectionProvider from '@/components/ai-section/ai-section-provider'
import RightSidebar from '@/ui/right-sidebar'
import { getAllTemplates, getTemplate } from '@/templates/template-loader'
import { useAppStore } from '@/state/store'
import { RESUME_SCENARIOS } from '@/dev/resume-scenarios'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { PortfolioAppendix } from '@/components/portfolio/portfolio-appendix'
import { getRenderableResume } from '@/entities/resume/renderable-resume'
import { useEditorUiStore } from '@/state/editor-ui-store'
import { buildResumeHtml } from '@/io/html-export'
import { exportImage } from '@/io/export-image'

const DEFAULT_TEMPLATE = 'lanxin'

export default function ScenarioLoaderClient(): ReactElement {
  const searchParams = useSearchParams()
  const initialTemplate = searchParams.get('tpl') || DEFAULT_TEMPLATE
  const avatarUrl = searchParams.get('avatar')
  const scenarioId = searchParams.get('scenario') || ''
  const readOnly = searchParams.get('readonly') === '1'
  const activePanel = searchParams.get('panel') === 'sections' ? 'sections' : 'layout'
  const [tpl, setTpl] = useState(initialTemplate)
  const resume = useAppStore((s) => s.resume)
  const loadScenarioData = useAppStore((s) => s.loadScenarioData)
  const setReadOnly = useAppStore((s) => s.setReadOnly)
  const themes = useAppStore((s) => s.themes)
  const getThemeForTemplate = useAppStore((s) => s.getThemeForTemplate)
  const setThemeForTemplate = useAppStore((s) => s.setThemeForTemplate)
  const theme = themes[tpl] || getThemeForTemplate(tpl)
  const Template = getTemplate(tpl)?.component
  const editingBlockIds = useEditorUiStore((s) => s.editingBlockIds)
  const renderableResume = getRenderableResume(resume, readOnly ? undefined : editingBlockIds)
  const previewRef = useRef<HTMLDivElement>(null)
  const [exportStatus, setExportStatus] = useState('')

  async function exportFixture(format: 'pdf' | 'png'): Promise<void> {
    if (!previewRef.current) return
    setExportStatus('导出中')
    try {
      if (format === 'png') {
        await exportImage(previewRef, { fileName: 'empty-project-feedback' })
      } else {
        const response = await fetch('/next-api/generate-pdf', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: buildResumeHtml(previewRef.current), preview: true }),
        })
        if (!response.ok) throw new Error(`PDF ${response.status}`)
        const url = URL.createObjectURL(await response.blob())
        const link = document.createElement('a')
        link.href = url
        link.download = 'empty-project-feedback.pdf'
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 30000)
      }
      setExportStatus(`${format.toUpperCase()} 导出成功`)
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : '导出失败')
    }
  }

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

  useEffect(() => {
    setReadOnly(readOnly)
    return () => setReadOnly(false)
  }, [readOnly, setReadOnly])

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
          {scenarioId === 'empty-project-feedback' && readOnly ? <div className="flex gap-3">
            <button onClick={() => void exportFixture('pdf')}>导出测试 PDF</button>
            <button onClick={() => void exportFixture('png')}>导出测试 PNG</button>
            <span role="status">{exportStatus}</span>
          </div> : null}
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_360px] gap-5">
          <section className="overflow-auto rounded-lg border border-slate-200 bg-slate-200 p-6">
            <div ref={previewRef} className="mx-auto w-[794px] bg-white shadow-sm" data-scenario-preview="true">
              <Suspense fallback={<div className="p-6">Loading template...</div>}>
                {Template ? <Template resume={renderableResume} theme={theme} /> : null}
                <PortfolioAppendix portfolio={resume.portfolio} />
              </Suspense>
            </div>
          </section>

          <aside className="h-[calc(100vh-96px)] overflow-hidden rounded-lg border border-slate-200 bg-white">
            <RightSidebar
              activePanel={activePanel}
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
