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
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { X, Loader2, RefreshCw, AlertCircle, ArrowLeft, Save, FileDown, FileText, Image as ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { revalidateDashboard } from '@/app/actions'
import { logger } from '@/utils/logger'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/use-auth-store'
import NextImage from 'next/image'

interface ResumeData {
  id: string
  title: string
  content: any
  template: string
  [key: string]: any
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
          <h1 className="text-lg font-semibold">简历编辑器</h1>
          <div className="ml-4 flex items-center gap-2">
            <span className="text-xs text-gray-500">
              当前模板: <span className="font-medium text-gray-700">{templateConfig?.name || tpl}</span>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-xs text-orange-500 mr-2 flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                未保存
              </span>
            )}
            {lastSaved && !hasUnsavedChanges && (
              <span className="text-xs text-green-600 mr-2">
                ✓ 已保存 {lastSaved.toLocaleTimeString()}
              </span>
            )}
            {resumeId && (
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? '保存中...' : '保存'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportHtml}
            >
              <FileText className="h-4 w-4" />
              导出 HTML
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
            >
              <FileDown className="h-4 w-4" />
              导出 PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPng}
            >
              <ImageIcon className="h-4 w-4" />
              导出 PNG
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
