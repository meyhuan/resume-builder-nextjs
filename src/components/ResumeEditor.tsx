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
import { exportImage } from '@/io/export-image'
import { buildResumeHtml } from '@/io/html-export'
import { exportResumeToMarkdown } from '@/io/export-markdown'
import RightSidebar from '@/ui/right-sidebar'
import EditorToolbar from '@/ui/editor-toolbar'
import type { PanelId } from '@/ui/editor-toolbar'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Loader2, ArrowLeft, Save, FileText, Image as ImageIcon, Undo2, Redo2 } from 'lucide-react'
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
import { useAuthStore } from '@/store/use-auth-store'
import { useVipCheck } from '@/hooks/use-vip-check'
import VipUpgradeDialog from '@/components/vip/vip-upgrade-dialog'
import type { ResumeData } from '@/entities/resume/resume-data'
import { getRenderableResume } from '@/entities/resume/renderable-resume'
import { normalizeResumeContent } from '@/entities/resume/normalize-resume-content'
import { joinExportFileNameParts, sanitizeExportFileName } from '@/lib/export-file-name'
import { track } from '@/lib/analytics'

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
  readonly title?: string
  readonly content: Record<string, unknown>
  readonly template: string
  readonly thumbnail?: string
}

interface ResumeEditorProps {
  resumeId?: string
  initialData?: DbResumeRecord | null
}

interface InitialBaselineTarget {
  readonly resumeId: string
  readonly tpl: string
  readonly theme: ThemeTokens
  readonly onePageMode: boolean
  readonly onePageSnapshot: AdjustableTokens | null
  readonly sidebarSectionIds?: readonly string[]
}

function areStringArraysEqual(
  left: readonly string[] | undefined,
  right: readonly string[] | undefined,
): boolean {
  if (left === right) return true
  if (!left || !right) return false
  if (left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

function isJsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function fetchWithNetworkRetry(input: RequestInfo | URL, init?: RequestInit, attempts = 2): Promise<Response> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(input, init)
    } catch (error) {
      if (attempt === attempts) throw error
      await wait(350)
    }
  }
  return fetch(input, init)
}

export default function ResumeEditor({ resumeId: initialResumeId, initialData }: ResumeEditorProps): ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resume = useAppStore((s) => s.resume)
  // Mutable resumeId — starts undefined in guest mode, set after first save
  const [resumeId, setResumeId] = useState<string | undefined>(initialResumeId)
  const { isLoginOpen, requireAuth, handleLoginSuccess, handleLoginClose } = useRequireAuth()
  const { token, logout } = useAuthStore()
  const { isVip, quota, refreshQuota, requirePdf, requireAi, showUpgrade, setShowUpgrade } = useVipCheck()
  
  // Hydration check to prevent SSR mismatch for auth state
  const [isHydrated, setIsHydrated] = useState(false)
  useEffect(() => {
    setIsHydrated(true)
  }, [])
  const needsForceLogin = isHydrated && !token

  const setResume = useAppStore((s) => s.setResume)
  const resetResume = useAppStore((s) => s.resetResume)
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
  const [isConfirmingExport, setIsConfirmingExport] = useState(false)

  // Initialize from DB data if provided
  const initApplied = useRef(false)
  const pendingInitialBaselineRef = useRef<InitialBaselineTarget | null>(null)
  useEffect(() => {
    if (!initialData || initApplied.current) return
    initApplied.current = true
    setSavedSnapshot('')
    let restoredTheme: ThemeTokens | undefined
    let restoredOnePage = false
    let restoredSnapshot: AdjustableTokens | null = null
    let restoredSidebarSectionIds: readonly string[] | undefined
    const tplId = initialData.template || 'simple'
    if (initialData.content && typeof initialData.content === 'object' && Object.keys(initialData.content).length > 0) {
      const raw = initialData.content as Record<string, unknown>
      const { content: cleanContent, meta } = extractEditorMeta(raw)
      const normalizedContent = normalizeResumeContent(
        cleanContent as Partial<ResumeData> & Record<string, unknown>,
        { fallbackId: initialData.id },
      )
      setResume(() => normalizedContent)
      // Restore per-resume theme overrides
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
        restoredSidebarSectionIds = meta.sidebarSectionIds as readonly string[]
        setSidebarSectionIds(restoredSidebarSectionIds)
      }
    } else {
      setOnePageMode(false)
      setOnePageSnapshot(null)
      setSidebarSectionIds(undefined)
    }

    setTpl(tplId)
    pendingInitialBaselineRef.current = {
      resumeId: initialData.id,
      tpl: tplId,
      theme: getThemeForTemplate(tplId),
      onePageMode: restoredOnePage,
      onePageSnapshot: restoredSnapshot,
      sidebarSectionIds: restoredSidebarSectionIds,
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
      toast.error('未找到缓存的简历数据')
      return
    }
    cachedDataApplied.current = true
    try {
      const resumeData = JSON.parse(cached) as ResumeData
      setResume(() => normalizeResumeContent(resumeData, { fallbackId: 'resume-cached' }))
      localStorage.removeItem(cacheKey)
      toast.success(source === 'ai' ? '✨ AI 简历生成完毕，快来完善细节吧' : '✨ 简历解析成功，快来完善细节吧')
    } catch {
      toast.error('简历数据解析失败')
      localStorage.removeItem(cacheKey)
    }
  }, [initialData, searchParams, setResume])

  const blankResumeInitialized = useRef(false)
  useEffect(() => {
    if (blankResumeInitialized.current || initialData) return
    if (searchParams.has('source')) return
    blankResumeInitialized.current = true
    resetResume()
  }, [initialData, resetResume, searchParams])

  // Set initial snapshot for new resumes (no initialData) so changes are detected
  const initialSnapshotSet = useRef(false)
  useEffect(() => {
    if (initialData) return
    if (initialSnapshotSet.current || savedSnapshot) return
    initialSnapshotSet.current = true
    
    // If a template was specified in URL and we have no initialData, load test data to showcase the template
    if (searchParams.has('template') && !searchParams.has('source')) {
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

  useEffect(() => {
    const pending = pendingInitialBaselineRef.current
    if (!pending) return
    if (initialData?.id !== pending.resumeId) return
    if (tpl !== pending.tpl) return
    if (onePageMode !== pending.onePageMode) return
    if (!isJsonEqual(theme, pending.theme)) return
    if (!isJsonEqual(onePageSnapshot, pending.onePageSnapshot)) return
    if (!areStringArraysEqual(sidebarSectionIds, pending.sidebarSectionIds)) return

    setSavedSnapshot(currentFingerprint)
    pendingInitialBaselineRef.current = null
  }, [currentFingerprint, initialData?.id, onePageMode, onePageSnapshot, sidebarSectionIds, theme, tpl])

  // Keep ref in sync for beforeunload handler
  useEffect(() => {
    hasUnsavedRef.current = hasUnsavedChanges
  }, [hasUnsavedChanges])

  /**
   * Persist resume to DB. In guest mode (no resumeId), creates a new
   * resume first, then saves. Auth is checked before any API call.
   */
  const doSave = useCallback(async (): Promise<string | undefined> => {
    setIsSaving(true)
    let createStarted = false
    let createCompleted = false
    let createFailureTracked = false
    try {
      let currentId = resumeId
      // 1. If no resumeId yet, create the resume first
      if (!currentId) {
        createStarted = true
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
          title: resume.name || '未命名简历',
          content: contentWithMeta,
          template: tpl,
        }
        track('resume_create_start', {
          createMethod: 'manual',
          templateId: tpl,
          entry: 'pc_editor_save',
        })
        const createRes = await fetchWithNetworkRetry('/next-api/resumes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createPayload),
        })
        if (!createRes.ok) {
          createFailureTracked = true
          track('resume_create_failed', {
            createMethod: 'manual',
            templateId: tpl,
            entry: 'pc_editor_save',
            statusCode: createRes.status,
            failureReason: 'create_resume_http_error',
          })
          throw new Error('Failed to create resume')
        }
        const created: { id: string } = await createRes.json()
        createCompleted = true
        currentId = created.id
        setResumeId(currentId)
        track('resume_create_success', {
          resumeId: currentId,
          createMethod: 'manual',
          templateId: tpl,
          entry: 'pc_editor_save',
        })
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
        content: contentWithMeta,
        template: tpl,
        thumbnail,
      }
      // 4. Save to DB
      const res = await fetchWithNetworkRetry(`/next-api/resumes/${currentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savePayload),
      })
      if (!res.ok) throw new Error('Failed to save')
      setLastSaved(new Date())
      setSavedSnapshot(JSON.stringify({ resume, theme, tpl, onePageMode, onePageSnapshot, sidebarSectionIds }))
      await revalidateDashboard()
      toast.success('保存成功')
      return currentId
    } catch (e) {
      console.error(e)
      if (createStarted && !createCompleted && !createFailureTracked) {
        track('resume_create_failed', {
          createMethod: 'manual',
          templateId: tpl,
          entry: 'pc_editor_save',
          failureReason: e instanceof Error ? e.message : String(e),
        })
      }
      toast.error('保存失败，请重试')
      return undefined
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
  const backPath = token ? '/dashboard' : '/'
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
    if (!token) {
      // Guest users who abandon unsaved changes just get router back
      router.back()
    } else {
      router.push('/dashboard')
    }
  }, [router, token])

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
    if (!requirePdf()) return
    requireAuth(() => {
      try {
        const markdownContent = exportResumeToMarkdown(resume)
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${sanitizeExportFileName(resume.name)}.md`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Markdown导出成功')
      } catch (error) {
        console.error('Export markdown failed:', error)
        toast.error('Markdown导出失败，请重试')
      }
    })
  }, [resume, requireAuth, requirePdf])

  async function handleExportPng(): Promise<void> {
    if (!requirePdf()) return
    track('export_click', {
      resumeId,
      templateId: tpl,
      exportType: 'image',
      entry: 'pc_editor_toolbar',
    })
    try {
      await exportImage<HTMLDivElement>(printRef, { fileName: 'resume', pixelRatio: 2 })
      track('export_success', {
        resumeId,
        templateId: tpl,
        exportType: 'image',
        entry: 'pc_editor_toolbar',
      })
    } catch (err) {
      track('export_failed', {
        resumeId,
        templateId: tpl,
        exportType: 'image',
        entry: 'pc_editor_toolbar',
        stage: 'browser_export_image',
        failureReason: err instanceof Error ? err.message : String(err),
      })
      toast.error('图片导出失败，请重试')
    }
  }

  /** Generate PDF preview WITHOUT consuming quota. */
  async function handlePreviewPdf(): Promise<void> {
    if (!printRef.current || isGenerating) return
    // Preview is unlimited - no quota check
    setIsGenerating(true)
    try {
      const html: string = buildResumeHtml(printRef.current, { title: resume.name || 'Resume' })
      const response = await fetch('/next-api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, preview: true }),
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
      toast.error(e instanceof Error ? `PDF 生成失败: ${e.message}` : 'PDF 生成失败，请重试')
    } finally {
      setIsGenerating(false)
    }
  }

  /** Confirm export: consume quota and download PDF. */
  async function handleConfirmExport(): Promise<void> {
    if (!pdfBlob || isConfirmingExport) return
    requireAuth(() => { void confirmExportWithAuth() })
  }

  async function confirmExportWithAuth(): Promise<void> {
    if (!pdfBlob || isConfirmingExport) return
    setIsConfirmingExport(true)
    track('export_click', {
      resumeId,
      templateId: tpl,
      exportType: 'pdf',
      entry: 'pc_export_preview',
    })
    try {

    // Auto-generate professional filename: Name-Position-Phone
    const baseInfo = resume.baseInfo as Record<string, string> | undefined
    const name = baseInfo?.fullName?.trim() || baseInfo?.name?.trim() || '简历'
    const position = baseInfo?.title?.trim() || baseInfo?.position?.trim() || ''
    const phone = baseInfo?.phone?.trim() || ''
    const fileName = joinExportFileNameParts([name, position, phone], { separator: '-', fallback: resume.name || 'export' })

    let exportResumeId = resumeId
    if (!exportResumeId || hasUnsavedChanges) {
      const savedId = await doSave()
      if (!savedId) {
        track('export_failed', {
          resumeId: exportResumeId,
          templateId: tpl,
          exportType: 'pdf',
          entry: 'pc_export_preview',
          stage: 'save_before_export',
          failureReason: exportResumeId ? 'save_latest_resume_failed' : 'create_resume_before_export_failed',
        })
        toast.error(exportResumeId ? '保存最新简历失败，请重试后再导出' : '请先保存简历，再导出 PDF')
        return
      }
      exportResumeId = savedId
    }

    if (!exportResumeId) {
      track('export_failed', {
        resumeId: exportResumeId,
        templateId: tpl,
        exportType: 'pdf',
        entry: 'pc_export_preview',
        stage: 'preflight',
        failureReason: 'missing_resume_id',
      })
      toast.error('请先保存简历，再导出 PDF')
      return
    }

    let downloadUrl = ''
    let exportId = ''
    try {
      const form = new FormData()
      form.append('file', pdfBlob, `${fileName}.pdf`)
      form.append('resumeId', exportResumeId)
      form.append('templateId', tpl)
      form.append('fileName', fileName)
      const exportRes = await fetch('/next-api/exports/pc', {
        method: 'POST',
        body: form,
      })
      if (!exportRes.ok) {
        const errorData = await exportRes.json()
        if (exportRes.status === 401) {
          logout()
          toast.error('登录已失效，请重新登录后导出')
          requireAuth(() => { void confirmExportWithAuth() })
          return
        }
        track('export_failed', {
          resumeId: exportResumeId,
          templateId: tpl,
          exportType: 'pdf',
          entry: 'pc_export_preview',
          stage: 'create_export_record',
          statusCode: exportRes.status,
          failureReason: errorData.error || (errorData.quotaExceeded ? 'quota_exceeded' : 'export_http_error'),
        })
        if (errorData.quotaExceeded) {
          setShowUpgrade(true, 'pdf-export')
        } else {
          toast.error(errorData.error || '导出次数已用完，开通会员可继续导出 PDF')
        }
        return
      }
      const exported = await exportRes.json() as { id?: string; downloadUrl?: string }
      exportId = exported.id || ''
      downloadUrl = exported.downloadUrl || ''
    } catch (err) {
      track('export_failed', {
        resumeId: exportResumeId,
        templateId: tpl,
        exportType: 'pdf',
        entry: 'pc_export_preview',
        stage: 'create_export_record',
        failureReason: err instanceof Error ? err.message : String(err),
      })
      toast.error('导出保存失败，请重试')
      return
    }

    if (!downloadUrl) {
      track('export_failed', {
        resumeId: exportResumeId,
        templateId: tpl,
        exportType: 'pdf',
        exportId,
        entry: 'pc_export_preview',
        stage: 'download_url',
        failureReason: 'missing_download_url',
      })
      toast.error('导出链接生成失败，请重试')
      return
    }

    const a: HTMLAnchorElement = document.createElement('a')
    a.href = downloadUrl
    a.download = `${sanitizeExportFileName(fileName)}.pdf`
    a.click()
    handleClosePreview()
    toast.success('PDF 导出成功')
    track('export_success', {
      resumeId: exportResumeId,
      templateId: tpl,
      exportType: 'pdf',
      exportId,
      entry: 'pc_export_preview',
    })
    // 刷新额度显示
    await refreshQuota()
    } finally {
      setIsConfirmingExport(false)
    }
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
      toast.info('已切换模板，一页模式已关闭')
    }
    setTpl(next)
  }, [onePageMode, resetOnePage])

  // 获取当前模板组件
  const templateConfig = getTemplate(tpl)
  const TemplateComponent = templateConfig?.component
  const renderableResume = useMemo(() => getRenderableResume(resume), [resume])

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
              返回
            </Button>
            <div className="h-4 w-px bg-slate-200 mx-0.5" />
            <Button
              variant="ghost"
              size="icon"
              onClick={undo}
              disabled={!canUndo}
              className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              title="撤销 (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={redo}
              disabled={!canRedo}
              className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              title="重做 (Ctrl+Shift+Z)"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
            <div className="h-4 w-px bg-slate-200 mx-0.5" />
            <span className="text-sm font-medium text-slate-700 truncate max-w-[180px]">
              {resume.name || '未命名简历'}
            </span>
            {hasUnsavedChanges && (
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shrink-0" title="未保存" />
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
                已保存 {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
              {isSaving ? '保存中' : '保存'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportPng}
              title="导出 PNG"
              aria-label="导出 PNG"
              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
            >
              <ImageIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportMarkdown}
              title="导出 Markdown"
              aria-label="导出 Markdown"
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
                  生成中...
                </>
              ) : (
                <>
                  预览/导出
                  {!isVip && quota.pdfExport.remaining !== 'unlimited' && (
                    <span className="ml-1 text-[9px] text-white/80">
                      ({quota.pdfExport.remaining}次)
                    </span>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative z-10">
        <div className="flex-1 overflow-auto p-6 md:p-12 custom-scrollbar bg-slate-50/30">
          <div className="mx-auto max-w-[210mm] transition-all duration-500">
            <AiSectionProvider requireVip={requireAi}>
            <div
              ref={printRef}
              className="page w-full bg-white shadow-[0_0_50px_rgba(0,0,0,0.05)] rounded-xl print:shadow-none print:rounded-none overflow-hidden"
              {...(onePageMode ? { 'data-one-page': 'true' } : {})}
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
                  <TemplateComponent
                    resume={renderableResume}
                    theme={theme}
                    sidebarSectionIds={sidebarSectionIds}
                    onSidebarSectionIdsChange={setSidebarSectionIds}
                  />
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
        description="您有未保存的更改，保存后再离开吗？"
        confirmText="保存并离开"
        discardText="不保存直接离开"
        cancelText="取消"
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
        onUpgradeClick={() => setShowUpgrade(true, 'pdf-export')}
        remainingQuota={quota.pdfExport.remaining}
        isVip={isVip}
        isConfirming={isConfirmingExport}
      />
      {/* Forced login dialog for unauthenticated users */}
      <WxLoginDialog
        isOpen={needsForceLogin || isLoginOpen}
        onClose={handleLoginClose}
        onSuccess={() => {
          handleLoginSuccess()
          toast.success('登录成功，已自动为你保存简历进度')
        }}
        closeable={!needsForceLogin}
        subtitle={needsForceLogin ? '登录后即可保存、导出，你的简历不会丢失' : undefined}
      />
      {/* VIP upgrade dialog */}
      <VipUpgradeDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        overlayClassName={showPreview ? 'bg-transparent' : 'bg-black/35'}
      />
    </div>
  )
}
