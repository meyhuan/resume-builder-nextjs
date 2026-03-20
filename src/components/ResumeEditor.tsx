"use client"

/**
 * ResumeEditor - Main Editor Component
 * App with Dynamic Template Loading
 * Uses Suspense + lazy for on-demand template loading
 */
import { useEffect, useRef, useState, Suspense, useCallback, useMemo } from 'react'
import type { ReactElement } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useAppStore } from '@/state/store'
import { getTemplate, getAllTemplates } from '@/templates/template-loader'
import { exportImage } from '@/io/export-image'
import { buildResumeHtml } from '@/io/html-export'
import { exportResumeToMarkdown } from '@/io/export-markdown'
import RightSidebar from '@/ui/right-sidebar'
import EditorToolbar from '@/ui/editor-toolbar'
import type { PanelId } from '@/ui/editor-toolbar'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Loader2, ArrowLeft, Save, FileDown, FileText, Image as ImageIcon, Undo2, Redo2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { revalidateDashboard } from '@/app/actions'
import { useOnePageMode } from '@/hooks/use-one-page-mode'
import { toast } from 'sonner'
import type { AdjustableTokens } from '@/entities/editor/editor-meta'
import { extractEditorMeta, embedEditorMeta } from '@/entities/editor/editor-meta'
import AiSectionProvider from '@/components/ai-section/ai-section-provider'
import ExportPreviewDialog from '@/components/export-preview-dialog'
import { useRequireAuth } from '@/hooks/use-require-auth'
import { WxLoginDialog } from '@/components/auth/WxLoginDialog'
import type { ResumeData } from '@/entities/resume/resume-data'

const AI_CACHE_KEYS: Record<string, string> = {
  ai: 'wizard_pending_resume',
  import: 'import_pending_resume',
} as const

interface DbResumeRecord {
  id: string
  title: string
  content: unknown
  template: string
  [key: string]: unknown
}

interface ResumeSavePayload {
  readonly title: string
  readonly content: Record<string, unknown>
  readonly template: string
  readonly thumbnail?: string
}

interface ResumeEditorProps {
  resumeId?: string
  initialData?: DbResumeRecord | null
}

export default function ResumeEditor({ resumeId: initialResumeId, initialData }: ResumeEditorProps): ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isSignedIn } = useAuth()
  const resume = useAppStore((s) => s.resume)
  // Mutable resumeId — starts undefined in guest mode, set after first save
  const [resumeId, setResumeId] = useState<string | undefined>(initialResumeId)
  const { isLoginOpen, requireAuth, handleLoginSuccess, handleLoginClose } = useRequireAuth()
  
  // Hydration check to prevent SSR mismatch for auth state
  const [isHydrated, setIsHydrated] = useState(false)
  useEffect(() => {
    setIsHydrated(true)
  }, [])
  const needsForceLogin = isHydrated && !isSignedIn

  const setResume = useAppStore((s) => s.setResume)
  const setThemeForTemplate = useAppStore((s) => s.setThemeForTemplate)
  const getThemeForTemplate = useAppStore((s) => s.getThemeForTemplate)
  const loadTestData = useAppStore((s) => s.loadTestData)
  const undo = useAppStore((s) => s.undo)
  const redo = useAppStore((s) => s.redo)
  const canUndo = useAppStore((s) => s.pastStates.length > 0)
  const canRedo = useAppStore((s) => s.futureStates.length > 0)
  const printRef = useRef<HTMLDivElement>(null)

  // Initialize template state from URL query param or 'simple' default
  const defaultTemplate = searchParams.get('template') || 'simple'
  const [tpl, setTpl] = useState<string>(defaultTemplate)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState<string>('')
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const AUTO_SAVE_DELAY = 30000 // 30 seconds
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [activePanel, setActivePanel] = useState<PanelId | null>('layout')
  const [onePageMode, setOnePageMode] = useState(false)
  const [onePageSnapshot, setOnePageSnapshot] = useState<AdjustableTokens | null>(null)
  const [sidebarSectionIds, setSidebarSectionIds] = useState<readonly string[] | undefined>(undefined)
  const hasUnsavedRef = useRef(false)
  const [showPreview, setShowPreview] = useState(false)
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>('')
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Initialize from DB data if provided
  const initApplied = useRef(false)
  useEffect(() => {
    if (!initialData || initApplied.current) return
    initApplied.current = true
    let restoredTheme: ThemeTokens | undefined
    let restoredOnePage = false
    let restoredSnapshot: AdjustableTokens | null = null
    if (initialData.content && typeof initialData.content === 'object' && Object.keys(initialData.content).length > 0) {
      const raw = initialData.content as Record<string, unknown>
      const { content: cleanContent, meta } = extractEditorMeta(raw)
      setResume(() => cleanContent)
      // Restore per-resume theme overrides
      const tplId = initialData.template || 'simple'
      restoredTheme = meta.themes[tplId]
      if (restoredTheme) {
        setThemeForTemplate(tplId, (draft) => { Object.assign(draft, restoredTheme!) })
      }
      // Restore one-page mode state
      restoredOnePage = meta.onePageMode
      restoredSnapshot = meta.onePageSnapshot
      setOnePageMode(restoredOnePage)
      setOnePageSnapshot(restoredSnapshot)
      // Restore sidebar section IDs (for two-column templates)
      if (meta.sidebarSectionIds) {
        setSidebarSectionIds(meta.sidebarSectionIds as readonly string[])
      }
      // Build initial composite fingerprint after all state is restored
      const initTheme = restoredTheme ?? getThemeForTemplate(tplId)
      setSavedSnapshot(JSON.stringify({
        resume: cleanContent,
        theme: initTheme,
        tpl: tplId,
        onePageMode: restoredOnePage,
        onePageSnapshot: restoredSnapshot,
        sidebarSectionIds: meta.sidebarSectionIds,
      }))
    }
    if (initialData.template) {
      setTpl(initialData.template)
    }
  }, [initialData, setResume, setThemeForTemplate, getThemeForTemplate])

  // Load cached AI / import resume data when opened via /editor/new?source=ai|import
  const cachedDataApplied = useRef(false)
  useEffect(() => {
    if (cachedDataApplied.current || initialData) return
    const source = searchParams.get('source')
    if (!source) return
    const cacheKey = AI_CACHE_KEYS[source]
    if (!cacheKey) return
    const cached = localStorage.getItem(cacheKey)
    if (!cached) {
      toast.error('No cached resume data found')
      return
    }
    cachedDataApplied.current = true
    try {
      const resumeData = JSON.parse(cached) as ResumeData
      setResume(() => resumeData)
      localStorage.removeItem(cacheKey)
      toast.success(source === 'ai' ? '✨ AI resume generated! Time to refine the details.' : '✨ Resume parsed successfully! Time to refine the details.')
    } catch {
      toast.error('Failed to parse resume data')
      localStorage.removeItem(cacheKey)
    }
  }, [initialData, searchParams, setResume])

  // Set initial snapshot for new resumes (no initialData) so changes are detected
  const initialSnapshotSet = useRef(false)
  useEffect(() => {
    if (initialSnapshotSet.current || savedSnapshot) return
    if (initApplied.current || !initialData) {
      initialSnapshotSet.current = true
      
      // If a template was specified in URL and we have no initialData, load test data to showcase the template
      if (!initialData && searchParams.has('template') && !searchParams.has('source')) {
        loadTestData()
      }

      const initTheme = getThemeForTemplate(tpl)
      setSavedSnapshot(JSON.stringify({
        resume,
        theme: initTheme,
        tpl,
        onePageMode: false,
        onePageSnapshot: null,
        sidebarSectionIds: undefined,
      }))
    }
  }, [initialData, resume, tpl, savedSnapshot, getThemeForTemplate, searchParams, loadTestData])

  // Subscribe to theme changes for current template
  const themes = useAppStore((s) => s.themes)
  const theme = themes[tpl] || getThemeForTemplate(tpl)

  // Check if there are unsaved changes (composite: resume + theme + tpl + one-page state)
  const currentFingerprint = useMemo(() => {
    return JSON.stringify({ resume, theme, tpl, onePageMode, onePageSnapshot, sidebarSectionIds })
  }, [resume, theme, tpl, onePageMode, onePageSnapshot, sidebarSectionIds])
  const hasUnsavedChanges = useMemo(() => {
    if (!savedSnapshot) return false
    return currentFingerprint !== savedSnapshot
  }, [currentFingerprint, savedSnapshot])

  // Keep ref in sync for beforeunload handler
  useEffect(() => {
    hasUnsavedRef.current = hasUnsavedChanges
  }, [hasUnsavedChanges])

  /**
   * Persist resume to DB. In guest mode (no resumeId), creates a new
   * resume first, then saves. Auth is checked before any API call.
   */
  const doSave = useCallback(async () => {
    setIsSaving(true)
    try {
      let currentId = resumeId
      // 1. If no resumeId yet, create the resume first
      if (!currentId) {
        const editorMeta = {
          themes: { [tpl]: theme },
          onePageMode,
          onePageSnapshot,
          sidebarSectionIds,
        }
        const contentWithMeta: Record<string, unknown> = embedEditorMeta(
          resume as unknown as Record<string, unknown>,
          editorMeta,
        )
        const createPayload: ResumeSavePayload = {
          title: resume.name || 'Untitled Resume',
          content: contentWithMeta,
          template: tpl,
        }
        const createRes = await fetch('/next-api/resumes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createPayload),
        })
        if (!createRes.ok) throw new Error('Failed to create resume')
        const created: { id: string } = await createRes.json()
        currentId = created.id
        setResumeId(currentId)
        // Update browser URL without full navigation
        window.history.replaceState(null, '', `/editor/${currentId}`)
      }
      // 2. Generate thumbnail (Base64)
      const thumbnail: string = await exportImage(printRef, {
        pixelRatio: 1,
        returnBase64: true,
        backgroundColor: '#ffffff',
        clipFirstPage: true,
      }) as string
      // 3. Build content with editor metadata
      const editorMeta = {
        themes: { [tpl]: theme },
        onePageMode,
        onePageSnapshot,
        sidebarSectionIds,
      }
      const contentWithMeta: Record<string, unknown> = embedEditorMeta(
        resume as unknown as Record<string, unknown>,
        editorMeta,
      )
      const savePayload: ResumeSavePayload = {
        title: resume.name || 'Untitled Resume',
        content: contentWithMeta,
        template: tpl,
        thumbnail,
      }
      // 4. Save to DB
      const res = await fetch(`/next-api/resumes/${currentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savePayload),
      })
      if (!res.ok) throw new Error('Failed to save')
      setLastSaved(new Date())
      setSavedSnapshot(JSON.stringify({ resume, theme, tpl, onePageMode, onePageSnapshot, sidebarSectionIds }))
      await revalidateDashboard()
      toast.success('Saved successfully')
    } catch (e) {
      console.error(e)
      toast.error('Save failed, please try again')
    } finally {
      setIsSaving(false)
    }
  }, [resumeId, resume, tpl, theme, onePageMode, onePageSnapshot, sidebarSectionIds])

  /** Auth-gated save — prompts login if user is not authenticated. */
  const handleSave = useCallback(() => {
    requireAuth(() => { doSave() })
  }, [requireAuth, doSave])

  // Auto-save: debounced save after changes (only when resumeId exists — i.e. already persisted)
  useEffect(() => {
    if (!resumeId || !hasUnsavedChanges || isSaving) return
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    autoSaveTimerRef.current = setTimeout(() => {
      doSave()
    }, AUTO_SAVE_DELAY)
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [resume, resumeId, hasUnsavedChanges, isSaving, doSave])

  // Keyboard shortcuts: Ctrl+S save, Ctrl+Z undo, Ctrl+Shift+Z / Ctrl+Y redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, undo, redo])

  // Warn user when closing browser tab with unsaved changes (use ref to avoid stale closure)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
      if (hasUnsavedRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Determine back destination based on auth state
  const backPath = isSignedIn ? '/dashboard' : '/'
  // Handle back navigation with unsaved changes warning
  const handleBack = useCallback(() => {
    if (hasUnsavedChanges && resumeId) {
      setShowLeaveDialog(true)
      return
    }
    router.push(backPath)
  }, [hasUnsavedChanges, resumeId, router, backPath])

  // Confirm leave action
  const confirmLeave = useCallback(() => {
    if (!isSignedIn) {
      // Guest users who abandon unsaved changes just get router back
      router.back()
    } else {
      router.push('/dashboard')
    }
  }, [router, isSignedIn])

  // Stable callback to patch the current template's theme
  const patchTheme = useCallback((patch: Partial<ThemeTokens>): void => {
    setThemeForTemplate(tpl, (draft) => {
      Object.assign(draft, patch)
    })
  }, [tpl, setThemeForTemplate])

  // One-page mode hook
  const { status: onePageStatus, reset: resetOnePage } = useOnePageMode({
    contentRef: printRef,
    theme,
    patchTheme,
    enabled: onePageMode,
    snapshot: onePageSnapshot,
    setSnapshot: setOnePageSnapshot,
  })

  const handleExportMarkdown = useCallback(() => {
    requireAuth(() => {
      try {
        const markdownContent = exportResumeToMarkdown(resume)
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${resume.name || 'resume'}.md`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Markdown exported successfully')
      } catch (error) {
        console.error('Export markdown failed:', error)
        toast.error('Markdown export failed, please try again')
      }
    })
  }, [resume, requireAuth])

  async function handleExportPng(): Promise<void> {
    await exportImage<HTMLDivElement>(printRef, { fileName: 'resume', pixelRatio: 2 })
  }

  /** Generate the actual PDF via the API, then open preview dialog. */
  async function handlePreviewPdf(): Promise<void> {
    if (!printRef.current || isGenerating) return
    setIsGenerating(true)
    try {
      const html: string = buildResumeHtml(printRef.current, { title: resume.name || 'Resume' })
      const response = await fetch('/next-api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || 'PDF generation failed')
      }
      const blob: Blob = await response.blob()
      const url: string = window.URL.createObjectURL(blob)
      setPdfBlob(blob)
      setPdfBlobUrl(url)
      setShowPreview(true)
    } catch (e) {
      console.error('PDF generation failed:', e)
      toast.error(e instanceof Error ? `PDF generation failed: ${e.message}` : 'PDF generation failed, please try again')
    } finally {
      setIsGenerating(false)
    }
  }

  /** Download the already-generated PDF blob. */
  function handleConfirmExport(): void {
    if (!pdfBlob) return
    const url: string = window.URL.createObjectURL(pdfBlob)
    const a: HTMLAnchorElement = document.createElement('a')
    a.href = url
    
    // Auto-generate professional filename: Name-Position-Phone
    const baseInfo = resume.baseInfo as Record<string, string> | undefined
    const name = baseInfo?.fullName?.trim() || baseInfo?.name?.trim() || 'resume'
    const position = baseInfo?.title?.trim() || baseInfo?.position?.trim() || ''
    const phone = baseInfo?.phone?.trim() || ''
    
    const nameParts = [name, position, phone].filter(Boolean)
    const fileName = nameParts.length > 0 ? nameParts.join('-') : (resume.name || 'export')
    
    a.download = `${fileName}.pdf`
    a.click()
    window.URL.revokeObjectURL(url)
    handleClosePreview()
    toast.success('PDF exported successfully')
  }

  /** Clean up blob URL and close preview dialog. */
  function handleClosePreview(): void {
    if (pdfBlobUrl) window.URL.revokeObjectURL(pdfBlobUrl)
    setPdfBlobUrl('')
    setPdfBlob(null)
    setShowPreview(false)
  }

  // Template switch guard: disable one-page mode before switching
  const handleTplChange = useCallback((next: string): void => {
    if (onePageMode) {
      resetOnePage()
      setOnePageMode(false)
      toast.info('Template switched, one-page mode disabled')
    }
    setTpl(next)
  }, [onePageMode, resetOnePage])

  // Get current template component
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
        <div className="px-3 py-2 flex flex-col gap-2 lg:h-10 lg:flex-row lg:items-center lg:gap-0 relative">
          {/* Left: nav + title */}
          <div className="flex items-center gap-1 shrink-0 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back
            </Button>
            <div className="h-4 w-px bg-slate-200 mx-0.5" />
            <Button
              variant="ghost"
              size="icon"
              onClick={undo}
              disabled={!canUndo}
              className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={redo}
              disabled={!canRedo}
              className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
            <div className="h-4 w-px bg-slate-200 mx-0.5" />
            <span className="text-sm font-medium text-slate-700 truncate max-w-[180px]">
              {resume.name || 'Untitled Resume'}
            </span>
            {hasUnsavedChanges && (
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shrink-0" title="Unsaved changes" />
            )}
          </div>

          {/* Center: toolbar actions (absolutely centered) */}
          <div className="order-last w-full overflow-x-auto lg:order-none lg:w-auto lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2">
            <div className="min-w-max">
              <EditorToolbar activePanel={activePanel} onPanelChange={setActivePanel} />
            </div>
          </div>

          {/* Right: save + export */}
          <div className="flex items-center gap-1 shrink-0 justify-between lg:justify-end lg:ml-auto">
            {lastSaved && !hasUnsavedChanges && (
              <span className="text-[10px] text-emerald-600 mr-1 hidden lg:inline">
                Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
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
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreviewPdf}
              disabled={isGenerating}
              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <FileDown className="h-3.5 w-3.5 mr-1" />
              )}
              {isGenerating ? 'Generating...' : 'PDF'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportPng}
              title="Export PNG"
              aria-label="Export PNG"
              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
            >
              <ImageIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportMarkdown}
              title="Export Markdown"
              aria-label="Export Markdown"
              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
            >
              <FileText className="h-3.5 w-3.5" />
            </Button>

            <div className="h-4 w-px bg-slate-200 mx-1" />

            <Button
              onClick={handlePreviewPdf}
              disabled={isGenerating}
              size="sm"
              className="h-7 px-3 text-xs font-medium bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white hover:from-violet-700 hover:to-fuchsia-600 rounded shadow-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  Generating...
                </>
              ) : 'Preview Resume'}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative z-10">
        <div className="flex-1 overflow-auto p-6 md:p-12 custom-scrollbar bg-slate-50/30">
          <div className="mx-auto max-w-[210mm] transition-all duration-500">
            <AiSectionProvider>
            <div
              ref={printRef}
              className="page w-full bg-white shadow-[0_0_50px_rgba(0,0,0,0.05)] rounded-xl print:shadow-none overflow-hidden"
              {...(onePageMode ? { 'data-one-page': 'true' } : {})}
            >
              {/* Suspense wraps dynamically loaded template */}
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-[297mm] bg-white">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
                      <p className="text-gray-600">Loading template...</p>
                      <p className="text-xs text-gray-400 mt-2">{templateConfig?.name}</p>
                    </div>
                  </div>
                }
              >
                {TemplateComponent ? (
                  <TemplateComponent
                    resume={resume}
                    theme={theme}
                    sidebarSectionIds={sidebarSectionIds}
                    onSidebarSectionIdsChange={setSidebarSectionIds}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[297mm] bg-white">
                    <div className="text-center text-gray-500">
                      <p className="text-lg mb-2">❌ Template not found</p>
                      <p className="text-sm">Template ID: {tpl}</p>
                    </div>
                  </div>
                )}
              </Suspense>
            </div>
            </AiSectionProvider>
          </div>
        </div>
        {activePanel && (
          <aside className="print:hidden w-[400px] border-l border-slate-100 bg-white/80 backdrop-blur-xl shrink-0 h-full overflow-y-auto custom-scrollbar shadow-[-4px_0_30px_rgba(0,0,0,0.02)]">
            <RightSidebar
              activePanel={activePanel}
              onClose={() => setActivePanel(null)}
              theme={theme}
              tpl={tpl}
              templates={getAllTemplates()}
              onTplChange={handleTplChange}
              onThemePatch={patchTheme}
              onePage={onePageMode}
              onePageStatus={onePageStatus}
              onOnePageChange={setOnePageMode}
              onImportJson={(json): void => {
                try {
                  const parsed = JSON.parse(json)
                  useAppStore.getState().importExternalResume(parsed)
                } catch (e) {
                  alert(`Parse failed: ${e}`)
                }
              }}
            />
          </aside>
        )}
      </main>
      {/* Leave confirmation dialog */}
      <ConfirmDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        title="Leave Editor?"
        description="You have unsaved changes. Would you like to save before leaving?"
        confirmText="Save & Leave"
        discardText="Leave without saving"
        cancelText="Cancel"
        variant="default"
        loading={isSaving}
        onConfirm={async () => {
          await doSave()
          confirmLeave()
        }}
        onDiscard={() => {
          confirmLeave()
        }}
      />
      {/* PDF export preview dialog */}
      <ExportPreviewDialog
        open={showPreview}
        onOpenChange={(next: boolean) => { if (!next) handleClosePreview() }}
        pdfUrl={pdfBlobUrl}
        onConfirmExport={handleConfirmExport}
      />
      {/* Forced login dialog for unauthenticated users */}
      <WxLoginDialog
        isOpen={needsForceLogin || isLoginOpen}
        onClose={handleLoginClose}
        onSuccess={() => {
          handleLoginSuccess()
          toast.success('Logged in successfully. Your resume progress has been saved.')
        }}
        closeable={!needsForceLogin}
        subtitle={needsForceLogin ? 'Sign in to save and export your resume. Your progress is safe.' : undefined}
      />
    </div>
  )
}
