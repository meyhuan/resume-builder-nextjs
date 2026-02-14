"use client"

/**
 * ResumeEditor - Main Editor Component
 * App with Dynamic Template Loading
 * 使用 Suspense + lazy 实现模板按需加载
 */
import { useEffect, useRef, useState, Suspense, useCallback, useMemo } from 'react'
import type { ReactElement } from 'react'
import { useAppStore } from '@/state/store'
import { getTemplate, getAllTemplates } from '@/templates/template-loader'
import { useExportPdf } from '@/io/export-pdf'
import { exportImage } from '@/io/export-image'
import { createResumeHtmlBlob, buildResumeHtml } from '@/io/html-export'
import RightSidebar from '@/ui/right-sidebar'
import EditorToolbar from '@/ui/editor-toolbar'
import type { PanelId } from '@/ui/editor-toolbar'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Loader2, ArrowLeft, Save, FileDown, FileText, Image as ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { revalidateDashboard } from '@/app/actions'

interface ResumeData {
  id: string
  title: string
  content: unknown
  template: string
  [key: string]: unknown
}

interface ResumeEditorProps {
  resumeId?: string
  initialData?: ResumeData | null
}

export default function ResumeEditor({ resumeId, initialData }: ResumeEditorProps): ReactElement {
  const router = useRouter()
  const resume = useAppStore((s) => s.resume)
  const setResume = useAppStore((s) => s.setResume)
  const setThemeForTemplate = useAppStore((s) => s.setThemeForTemplate)
  const getThemeForTemplate = useAppStore((s) => s.getThemeForTemplate)
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useExportPdf<HTMLDivElement>(printRef, { documentTitle: 'resume' })
  const [tpl, setTpl] = useState<string>('simple')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState<string>('')
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const AUTO_SAVE_DELAY = 30000 // 30 seconds
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [activePanel, setActivePanel] = useState<PanelId | null>(null)

  // Initialize from DB data if provided
  useEffect(() => {
    if (initialData) {
      if (initialData.content && Object.keys(initialData.content).length > 0) {
        setResume(() => initialData.content)
        // Store initial snapshot for dirty checking
        setSavedSnapshot(JSON.stringify(initialData.content))
      }
      if (initialData.template) {
        setTpl(initialData.template)
      }
    }
  }, [initialData, setResume])

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!savedSnapshot) return false
    return JSON.stringify(resume) !== savedSnapshot
  }, [resume, savedSnapshot])

  const handleSave = useCallback(async () => {
    if (!resumeId) return
    setIsSaving(true)
    try {
      // 1. Generate thumbnail (Base64)
      const thumbnail = await exportImage(printRef, {
        pixelRatio: 1, // Lower resolution for thumbnail
        returnBase64: true,
        backgroundColor: '#ffffff'
      }) as string

      // 2. Save to DB
      const res = await fetch(`/api/resumes/${resumeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: resume.name || 'Untitled Resume',
          content: resume,
          template: tpl,
          thumbnail,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setLastSaved(new Date())
      // Update saved snapshot after successful save
      setSavedSnapshot(JSON.stringify(resume))
      // Invalidate dashboard cache to show new thumbnail
      await revalidateDashboard()
    } catch (e) {
      console.error(e)
      alert('Save failed')
      await revalidateDashboard()
    } finally {
      setIsSaving(false)
    }
  }, [resumeId, resume, tpl])

  // Auto-save: debounced save after changes
  useEffect(() => {
    if (!resumeId || !hasUnsavedChanges || isSaving) return
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    // Set new timer for auto-save
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave()
    }, AUTO_SAVE_DELAY)
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [resume, resumeId, hasUnsavedChanges, isSaving, handleSave])

  // Warn user when closing browser tab with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Handle back navigation with unsaved changes warning
  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowLeaveDialog(true)
      return
    }
    router.push('/dashboard')
  }, [hasUnsavedChanges, router])

  // Confirm leave action
  const confirmLeave = useCallback(() => {
    setShowLeaveDialog(false)
    router.push('/dashboard')
  }, [router])
  
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

  async function handleExportPdf() {
    if (!printRef.current) return
    
    setIsSaving(true); // Re-using isSaving for export state or we could add isExporting
    try {
      // 1. Get HTML content
      const html = buildResumeHtml(printRef.current, { title: resume.name || 'Resume' })
      
      // 2. Call API
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      })
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'PDF generation failed');
      }
      
      // 3. Download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `resume-${resume.name || 'export'}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed:', e)
      alert(e instanceof Error ? `Export failed: ${e.message}` : 'Export failed. Falling back to browser print.')
      // Fallback to client-side print if API fails
      handlePrint()
    } finally {
      setIsSaving(false);
    }
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
    <div className="h-screen bg-slate-50/50 text-slate-900 flex flex-col overflow-hidden relative">
      {/* Background Decorative Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-fuchsia-500/5 rounded-full blur-[100px]" />
      </div>

      <header className="z-50 bg-white border-b border-slate-200 shrink-0 print:hidden">
        <div className="px-3 h-10 flex items-center relative">
          {/* Left: nav + title */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              文件
            </Button>
            <span className="text-sm font-medium text-slate-700 truncate max-w-[180px]">
              {resume.name || '未命名简历'}
            </span>
            {hasUnsavedChanges && (
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shrink-0" title="未保存" />
            )}
          </div>

          {/* Center: toolbar actions (absolutely centered) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <EditorToolbar activePanel={activePanel} onPanelChange={setActivePanel} />
          </div>

          {/* Right: save + export */}
          <div className="ml-auto flex items-center gap-1 shrink-0">
            {lastSaved && !hasUnsavedChanges && (
              <span className="text-[10px] text-emerald-600 mr-1 hidden lg:inline">
                已保存 {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {resumeId && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1" />
                )}
                {isSaving ? '保存中' : '保存'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportPdf}
              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
            >
              <FileDown className="h-3.5 w-3.5 mr-1" />
              PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportPng}
              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
            >
              <ImageIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportHtml}
              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
            >
              <FileText className="h-3.5 w-3.5" />
            </Button>

            <div className="h-4 w-px bg-slate-200 mx-1" />

            <Button
              onClick={handleExportPdf}
              size="sm"
              className="h-7 px-3 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded"
            >
              下载简历
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative z-10">
        <div className="flex-1 overflow-auto p-6 md:p-12 custom-scrollbar bg-slate-50/30">
          <div className="mx-auto max-w-[210mm] transition-all duration-500">
            <div
              ref={printRef}
              className="page w-full bg-white shadow-[0_0_50px_rgba(0,0,0,0.05)] rounded-xl print:shadow-none overflow-hidden"
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
        </div>
        {activePanel && (
          <aside className="print:hidden w-[340px] border-l border-slate-100 bg-white/80 backdrop-blur-xl shrink-0 h-full overflow-y-auto custom-scrollbar shadow-[-4px_0_30px_rgba(0,0,0,0.02)]">
            <RightSidebar
              activePanel={activePanel}
              onClose={() => setActivePanel(null)}
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
        )}
      </main>
      {/* 离开确认弹窗 */}
      <ConfirmDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        title="确认离开"
        description="您有未保存的更改，确定要离开吗？离开后未保存的内容将会丢失。"
        confirmText="不保存并离开"
        cancelText="继续编辑"
        variant="destructive"
        onConfirm={confirmLeave}
      />
    </div>
  )
}
