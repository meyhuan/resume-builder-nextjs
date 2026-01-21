/**
 * App with Dynamic Template Loading
 * 使用 Suspense + lazy 实现模板按需加载
 */
import { useEffect, useRef, useState, Suspense } from 'react'
import type { ReactElement } from 'react'
import { useAppStore } from '@/state/store'
import { getTemplate, getAllTemplates } from '@/templates/template-loader'
import { useExportPdf } from '@/io/export-pdf'
import { exportImage } from '@/io/export-image'
import { createResumeHtmlBlob } from '@/io/html-export'
import RightSidebar from '@/ui/right-sidebar'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { Button } from '@/components/ui/button'
import { FileDown, FileText, Image } from 'lucide-react'

export default function App(): ReactElement {
  const resume = useAppStore((s) => s.resume)
  const setThemeForTemplate = useAppStore((s) => s.setThemeForTemplate)
  const getThemeForTemplate = useAppStore((s) => s.getThemeForTemplate)
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useExportPdf<HTMLDivElement>(printRef, { documentTitle: 'resume' })
  const [tpl, setTpl] = useState<string>('simple')
  
  // Subscribe to theme changes for current template
  const themes = useAppStore((s) => s.themes)
  const theme = themes[tpl] || getThemeForTemplate(tpl)

  function handleExportHtml(): void {
    if (!printRef.current) return
    const blob: Blob = createResumeHtmlBlob(printRef.current, { title: 'Resume' })
    const url: string = URL.createObjectURL(blob)
    const anchor: HTMLAnchorElement = document.createElement('a')
    anchor.href = url
    anchor.download = 'resume.html'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  async function handleExportPng(): Promise<void> {
    await exportImage<HTMLDivElement>(printRef, { fileName: 'resume', pixelRatio: 2 })
  }

  // Restore themes from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('rb.themes')
      if (raw) {
        const saved: Record<string, ThemeTokens> = JSON.parse(raw)
        Object.entries(saved).forEach(([templateId, themeData]) => {
          setThemeForTemplate(templateId, (draft) => {
            Object.assign(draft, themeData)
          })
        })
      }
    } catch {
      /* ignore storage errors */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Restore template selection on mount
  useEffect(() => {
    try {
      const t = localStorage.getItem('rb.template')
      if (t && getTemplate(t)) setTpl(t)
    } catch {
      /* ignore storage errors */
    }
  }, [])

  // Persist all themes to localStorage when they change
  useEffect(() => {
    const allThemes = useAppStore.getState().themes
    localStorage.setItem('rb.themes', JSON.stringify(allThemes))
  }, [theme])

  // Persist template when it changes
  useEffect(() => {
    try {
      localStorage.setItem('rb.template', tpl)
    } catch {
      /* ignore */
    }
  }, [tpl])

  // 获取当前模板组件
  const templateConfig = getTemplate(tpl)
  const TemplateComponent = templateConfig?.component

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-semibold">Resume Builder</h1>
          <div className="ml-4 flex items-center gap-2">
            <span className="text-xs text-gray-500">
              当前模板: <span className="font-medium text-gray-700">{templateConfig?.name || tpl}</span>
            </span>
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportHtml}
            >
              <FileText className="h-4 w-4" />
              Export HTML
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
            >
              <FileDown className="h-4 w-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPng}
            >
              <Image className="h-4 w-4" />
              Export PNG
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 md:p-8">
        <div className="mx-auto max-w-7xl flex items-start gap-6">
          <div className="flex-1">
            <div
              ref={printRef}
              className="page w-full max-w-[210mm] mx-auto bg-white shadow-md rounded-md print:shadow-none"
            >
              {/* Suspense 包裹动态加载的模板 */}
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-[297mm] bg-white">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
                      <p className="text-gray-600">正在加载模板...</p>
                      <p className="text-xs text-gray-400 mt-2">{templateConfig?.name}</p>
                    </div>
                  </div>
                }
              >
                {TemplateComponent ? (
                  <TemplateComponent resume={resume} theme={theme} />
                ) : (
                  <div className="flex items-center justify-center h-[297mm] bg-white">
                    <div className="text-center text-gray-500">
                      <p className="text-lg mb-2">❌ 模板未找到</p>
                      <p className="text-sm">模板 ID: {tpl}</p>
                    </div>
                  </div>
                )}
              </Suspense>
            </div>
          </div>
          <aside className="print:hidden sticky top-20 w-[320px] shrink-0">
            <RightSidebar
              theme={theme}
              tpl={tpl}
              templates={getAllTemplates()}
              onTplChange={(next): void => setTpl(next)}
              onThemePatch={(patch): void => {
                setThemeForTemplate(tpl, (draft) => {
                  Object.assign(draft, patch)
                })
              }}
              onImportJson={(json): void => {
                try {
                  const parsed = JSON.parse(json)
                  useAppStore.getState().importExternalResume(parsed)
                } catch (e) {
                  alert(`解析失败: ${e}`)
                }
              }}
            />
          </aside>
        </div>
      </main>
    </div>
  )
}
