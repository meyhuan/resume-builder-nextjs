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
import { useResumePagination } from '@/hooks/use-resume-pagination'
import { usePdfPreviewPageCount } from '@/hooks/use-pdf-preview-page-count'
import { ResumePageFeedback, ResumePageGuides } from '@/components/editor/resume-page-feedback'
import { useOnePageMode } from '@/hooks/use-one-page-mode'
import type { AdjustableTokens } from '@/entities/editor/editor-meta'
import { buildResumeHtml } from '@/io/html-export'
import { getRenderableResume } from '@/entities/resume/renderable-resume'
import { useEditorUiStore } from '@/state/editor-ui-store'
import { exportImage } from '@/io/export-image'
import { ResumeActionWorkspace } from '@/components/blocks/resume-action-dock'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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
  const editingBlockIds = useEditorUiStore((s) => s.editingBlockIds)
  const renderableResume = getRenderableResume(resume, readOnly ? undefined : editingBlockIds)
  const previewRef = useRef<HTMLDivElement>(null)
  const [exportStatus, setExportStatus] = useState('')
  const [pageGuides, setPageGuides] = useState(true)
  const pages = useResumePagination(previewRef, tpl)
  const [previewPdfUrl, setPreviewPdfUrl] = useState('')

  async function exportFixture(format: 'pdf' | 'png' | 'preview'): Promise<void> {
    if (!previewRef.current) return
    const generatedRevision = previewRevision
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
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        if (format === 'preview') {
          setPreviewPdfUrl(url)
          void recordPreview(blob, generatedRevision)
        } else {
          const link = document.createElement('a')
          link.href = url
          link.download = 'empty-project-feedback.pdf'
          link.click()
          setTimeout(() => URL.revokeObjectURL(url), 30000)
        }
      }
      setExportStatus(format === 'preview' ? 'PDF 预览已生成' : `${format.toUpperCase()} 导出成功`)
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : '导出失败')
    }
  }

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
  const previewRevision = JSON.stringify({ resume, theme, tpl, onePage, onePageStatus })
  const { pdfPageCount, recordPreview } = usePdfPreviewPageCount(previewRevision)
  useEffect(() => () => {
    if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl)
  }, [previewPdfUrl])

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
          <button data-qa-preview-pdf disabled={exportStatus === '导出中'} onClick={() => void exportFixture('preview')}>
            {exportStatus === '导出中' ? '正在生成 PDF…' : '预览 PDF（QA）'}
          </button>
          <button data-qa-export="true" onClick={() => {
            if (resumeBodyRef.current) setExportHtml(buildResumeHtml(resumeBodyRef.current))
          }}>生成导出 HTML（QA）</button>
          {scenarioId === 'empty-project-feedback' && readOnly ? <div className="flex gap-3">
            <button onClick={() => void exportFixture('pdf')}>导出测试 PDF</button>
            <button onClick={() => void exportFixture('png')}>导出测试 PNG</button>
            <span role="status">{exportStatus}</span>
          </div> : null}
        </div>

        <div className="mx-auto grid h-[calc(100dvh-112px)] max-w-7xl grid-cols-[minmax(0,1fr)_360px] gap-5">
          <ResumeActionWorkspace className="rounded-lg border border-slate-200">
          <ResumePageFeedback pages={pages} contentRef={previewRef} guides={pageGuides} onGuidesChange={setPageGuides} onePage={onePage} pdfPageCount={pdfPageCount} />
          <section className="min-h-0 flex-1 overflow-auto bg-slate-200 p-6" data-editor-canvas="true">
            <div ref={previewRef} className="relative mx-auto w-[794px] bg-white shadow-sm" data-scenario-preview="true">
              <div ref={resumeBodyRef} className="resume-document-main" data-one-page={onePage && onePageStatus === 'fit' ? 'true' : 'false'} data-one-page-status={onePageStatus} data-qa-theme={JSON.stringify(theme)}>
              <Suspense fallback={<div className="p-6">Loading template...</div>}>
                {Template ? <Template resume={renderableResume} theme={theme} /> : null}
                <PortfolioAppendix portfolio={resume.portfolio} />
              </Suspense>
              </div>
              <ResumePageGuides pages={pages} visible={pageGuides} />
            </div>
          </section>
          </ResumeActionWorkspace>

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
              onePageSnapshot={snapshot}
              onOnePageChange={setOnePage}
            />
          </aside>
        </div>
        <textarea hidden readOnly data-qa-export-html="true" value={exportHtml} />
        <Dialog open={Boolean(previewPdfUrl)} onOpenChange={open => { if (!open) setPreviewPdfUrl('') }}>
          <DialogContent className="flex h-[85vh] w-[900px] max-w-[90vw] flex-col">
            <DialogHeader>
              <DialogTitle>PDF 预览（QA）</DialogTitle>
              <DialogDescription>{pdfPageCount != null ? `实际 PDF 共 ${pdfPageCount} 页` : '以下为实际生成的 PDF'}</DialogDescription>
            </DialogHeader>
            {previewPdfUrl && <iframe title="PDF 预览" src={`${previewPdfUrl}#toolbar=0`} className="min-h-0 flex-1 border-0" />}
          </DialogContent>
        </Dialog>
      </main>
    </AiSectionProvider>
  )
}
