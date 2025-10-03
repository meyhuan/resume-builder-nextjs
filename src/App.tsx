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
import RightSidebar from '@/ui/right-sidebar'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'

export default function App(): ReactElement {
  const resume = useAppStore((s) => s.resume)
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useExportPdf<HTMLDivElement>(printRef, { documentTitle: 'resume' })
  const [tpl, setTpl] = useState<string>('simple')

  async function handleExportPng(): Promise<void> {
    await exportImage<HTMLDivElement>(printRef, { fileName: 'resume', pixelRatio: 2 })
  }

  // Restore theme from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('rb.theme')
      if (raw) {
        const saved: Partial<ThemeTokens> = JSON.parse(raw)
        setTheme((draft) => {
          Object.assign(draft, saved)
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

  // Persist theme to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('rb.theme', JSON.stringify(theme))
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
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-50"
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={handleExportPng}
              className="px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-50"
            >
              Export PNG
            </button>
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
                setTheme((draft) => {
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
