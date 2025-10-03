import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { useAppStore } from '@/state/store'
import SimpleTemplate from '@/templates/simple/index'
import ModernTemplate from '@/templates/modern/index'
import ProfessionalTemplate from '@/templates/professional/index'
import CreativeTemplate from '@/templates/creative/index'
import { useExportPdf } from '@/export/export-pdf'
import { exportImage } from '@/export/export-image'
import RightSidebar from '@/ui/right-sidebar'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'

export default function App(): ReactElement {
  const resume = useAppStore((s) => s.resume)
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useExportPdf<HTMLDivElement>(printRef, { documentTitle: 'resume' })
  const [tpl, setTpl] = useState<'simple' | 'modern' | 'professional' | 'creative'>('simple')

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
      const t = localStorage.getItem('rb.template') as 'simple' | 'modern' | 'professional' | 'creative' | null
      if (t === 'simple' || t === 'modern' || t === 'professional' || t === 'creative') setTpl(t)
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-semibold">Resume Builder (MVP)</h1>
          <div className="ml-4 flex items-center gap-2"></div>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={handlePrint} className="px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-50">
              Export PDF
            </button>
            <button type="button" onClick={handleExportPng} className="px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-50">
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
              {tpl === 'simple' ? (
                <SimpleTemplate resume={resume} theme={theme} />
              ) : tpl === 'modern' ? (
                <ModernTemplate resume={resume} theme={theme} />
              ) : tpl === 'professional' ? (
                <ProfessionalTemplate resume={resume} theme={theme} />
              ) : (
                <CreativeTemplate resume={resume} theme={theme} />
              )}
            </div>
          </div>
          <aside className="print:hidden sticky top-20 w-[320px] shrink-0">
            <RightSidebar
              theme={theme}
              tpl={tpl}
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
