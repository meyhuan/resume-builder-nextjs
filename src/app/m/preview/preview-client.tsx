'use client'

import { useEffect, useMemo, useRef, useState, useCallback, Suspense, type ReactElement } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/state/store'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import type { ResumeData } from '@/entities/resume/resume-data'
import { getRenderableResume } from '@/entities/resume/renderable-resume'
import { TEMPLATE_REGISTRY, getTemplate } from '@/templates/template-loader'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import AiSectionProvider from '@/components/ai-section/ai-section-provider'
import { cn } from '@/lib/utils'
import { ResumeSvgPlaceholder } from '@/features/m/resume-list/shared'
import { exportImage } from '@/io/export-image'
import { useVipCheck } from '@/hooks/use-vip-check'
import VipUpgradeDialog from '@/components/vip/vip-upgrade-dialog'
import { useOnePageMode, type OnePageStatus } from '@/hooks/use-one-page-mode'
import { embedEditorMeta, extractEditorMeta, type AdjustableTokens } from '@/entities/editor/editor-meta'
import { createLogger } from '@/lib/logger'
import { track } from '@/lib/analytics'
import { joinExportFileNameParts } from '@/lib/export-file-name'
import { useInMiniProgram } from '../_components/use-mini-program'
import { BottomActionBar } from './_components/bottom-action-bar'
import {
  ONE_PAGE_BADGE_STYLES,
  PreviewSettingsSheet,
  type SettingsTab,
} from './_components/preview-settings-sheet'

const MOBILE_PAGE_MAX_WIDTH_PX = 390
const A4_RATIO = 297 / 210

type ExportType = 'pdf' | 'image'

interface ExportJobResponse {
  readonly id: string
  readonly type: ExportType
  readonly fileName: string
  readonly downloadUrl: string
  readonly expiresAt: string
  readonly confirmed?: boolean
  readonly previewImages?: readonly string[]
}

const log = createLogger('m/preview')

function buildDefaultExportFileName(resume: ResumeData): string {
  const baseInfo = resume.baseInfo as (ResumeData['baseInfo'] & { readonly name?: string; readonly fullName?: string; readonly position?: string }) | undefined
  return joinExportFileNameParts(
    [
      baseInfo?.fullName || baseInfo?.name || resume.name,
      resume.jobIntention?.position || baseInfo?.position || baseInfo?.title || '',
      baseInfo?.phone || '',
    ],
    { fallback: 'resume' },
  )
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

/**
 * Main client for /m/preview. Owns the current template id, mounts read-only mode,
 * and renders the active template alongside a bottom-sheet settings panel.
 */
export default function MobilePreviewClient(): ReactElement {
  log.info('mount')
  const router = useRouter()
  const searchParams = useSearchParams()
  const resume = useAppStore((s) => s.resume)
  const setReadOnly = useAppStore((s) => s.setReadOnly)
  const setResume = useAppStore((s) => s.setResume)
  const getThemeForTemplate = useAppStore((s) => s.getThemeForTemplate)
  const getDefaultThemeForTemplate = useAppStore((s) => s.getDefaultThemeForTemplate)
  const setThemeForTemplate = useAppStore((s) => s.setThemeForTemplate)
  const resetThemeForTemplate = useAppStore((s) => s.resetThemeForTemplate)
  const loadThemes = useAppStore((s) => s.loadThemes)
  // Subscribe to themes map so live updates re-render the preview and are
  // available for syncPreviewState to persist all templates' themes to the DB.
  const themesMap = useAppStore((s) => s.themes)

  // Draft store holds the user's actual edits
  const draft = useDraftStore((s) => s.draft)
  const draftResumeId = useDraftStore((s) => s.resumeId)
  const draftTemplateId = useDraftStore((s) => s.templateId)
  const setFromServer = useDraftStore((s) => s.setFromServer)
  const setDraftTemplateId = useDraftStore((s) => s.setTemplateId)
  const saveThumbnail = useDraftStore((s) => s.saveThumbnail)

  const initialTemplateId: string = (() => {
    const fromUrl: string | null = searchParams.get('tpl')
    if (fromUrl && TEMPLATE_REGISTRY[fromUrl]) return fromUrl
    return draftTemplateId && TEMPLATE_REGISTRY[draftTemplateId] ? draftTemplateId : 'simple'
  })()
  const [templateId, setTemplateId] = useState<string>(initialTemplateId)
  const [sheetOpen, setSheetOpen] = useState<boolean>(false)
  const [settingsSaving, setSettingsSaving] = useState<boolean>(false)
  const [tab, setTab] = useState<SettingsTab>('template')
  const [containerWidth, setContainerWidth] = useState<number>(MOBILE_PAGE_MAX_WIDTH_PX)
  const [contentHeight, setContentHeight] = useState<number>(0)
  // User pinch-zoom factor. Independent of theme/layout so typography changes
  // do not reset the user's chosen zoom level.
  const [userZoom, setUserZoom] = useState<number>(1)
  const stageRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const pinchStateRef = useRef<{ startDist: number; startZoom: number } | null>(null)
  const lastTapRef = useRef<number>(0)

  useEffect(() => {
    track('resume_preview', {
      resumeId: draftResumeId || searchParams.get('id'),
      templateId,
    })
  }, [draftResumeId, searchParams, templateId])

  // Sync draft data into the app store so templates can render it.
  // Falls back to loading from server if draft is empty.
  useEffect(() => {
    setReadOnly(true)
    if (draft) {
      setResume((d: ResumeData): void => {
        Object.assign(d, draft)
      })
    } else {
      const paramId: string | null = searchParams.get('id')
      const targetId: string | null = paramId || draftResumeId
      if (targetId) {
        log.info('fetch resume for preview', { id: targetId })
        void (async (): Promise<void> => {
          try {
            const res = await fetch(`/next-api/resumes/${targetId}`, { credentials: 'include' })
            log.info('fetch resume HTTP', { status: res.status })
            if (!res.ok) return
            const full: { id: string; content: ResumeData; template?: string } = await res.json()
            log.info('fetch resume parsed', { id: full.id })
            // Extract __editorMeta from the raw content and load saved themes
            // into the app store so the preview reflects the user's last saved
            // color/font settings without requiring them to re-apply changes.
            const { content: cleanContent, meta } = extractEditorMeta(
              full.content as unknown as Record<string, unknown>
            )
            if (Object.keys(meta.themes).length > 0) {
              log.info('loading saved themes from DB', { templates: Object.keys(meta.themes) })
              loadThemes(meta.themes)
            }
            if (!searchParams.get('tpl') && full.template && TEMPLATE_REGISTRY[full.template]) {
              setTemplateId(full.template)
            }
            setFromServer(full.id, cleanContent as unknown as ResumeData, full.template ?? 'simple')
            setResume((d: ResumeData): void => {
              Object.assign(d, cleanContent)
            })
          } catch (e: unknown) {
            log.error('fetch resume failed', { error: e instanceof Error ? e.message : String(e) })
          }
        })()
      }
    }
    return (): void => {
      setReadOnly(false)
    }
  }, [draft, searchParams, draftResumeId, setReadOnly, setResume, setFromServer, loadThemes])

  useEffect(() => {
    const update = (): void => {
      if (!stageRef.current) return
      // stageRef has px-3 (12px * 2 = 24px padding). clientWidth includes padding,
      // so we must subtract it to get the actual available width for the content.
      const availableWidth = stageRef.current.clientWidth - 24
      const w = Math.min(availableWidth, MOBILE_PAGE_MAX_WIDTH_PX)
      setContainerWidth(w)
    }
    update()
    window.addEventListener('resize', update)
    return (): void => window.removeEventListener('resize', update)
  }, [])

  // Observe the unscaled template content height so we can size the outer
  // container to the visually-scaled height (CSS transform does not shrink
  // layout dimensions, which otherwise causes an oversized scroll area).
  useEffect(() => {
    const node = innerRef.current
    if (!node) return
    const observer = new ResizeObserver((entries): void => {
      for (const entry of entries) {
        setContentHeight(entry.contentRect.height)
      }
    })
    observer.observe(node)
    return (): void => observer.disconnect()
  }, [templateId, resume])

  // Debounced cover-thumbnail capture. Runs whenever the resume, template or
  // any live theme token changes — the timer is reset on each change, so
  // rapid template swipes or slider tweaks only persist the *final* cover.
  // An AbortController drops any in-flight upload if a newer capture starts.
  useEffect(() => {
    if (!draftResumeId) return
    if (!resume || !resume.sections || resume.sections.length === 0) return

    const controller: AbortController = new AbortController()
    const timer: ReturnType<typeof setTimeout> = setTimeout((): void => {
      if (!innerRef.current) return
      void (async (): Promise<void> => {
        try {
          const dataUrl: string | void = await exportImage(innerRef, {
            pixelRatio: 1,
            backgroundColor: '#ffffff',
            returnBase64: true,
            clipFirstPage: true,
            // innerRef is scaled via CSS transform for viewport-fit; neutralize
            // it so the captured cover is full-bleed like PC's thumbnail.
            resetTransform: true,
          })
          if (controller.signal.aborted) return
          if (typeof dataUrl === 'string') {
            await saveThumbnail(dataUrl)
          }
        } catch {
          // silent — cover is best-effort
        }
      })()
    }, 1500)

    return (): void => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [draftResumeId, resume, templateId, themesMap, saveThumbnail])

  const theme: ThemeTokens = getThemeForTemplate(templateId)
  const defaultTheme: ThemeTokens = getDefaultThemeForTemplate(templateId)
  const templateConfig = getTemplate(templateId)
  const Template = templateConfig?.component
  const renderableResume = useMemo(() => getRenderableResume(resume), [resume])

  const titleScale: number = theme.titleScale ?? 1
  const paragraphIndent: number = theme.paragraphIndent ?? 0
  const onePageFit: boolean = theme.onePageFit ?? false

  // Snapshot of user's original spacing/line-height/font-size before auto-fit.
  // Kept in component state; could later be persisted to editor meta if needed.
  const [onePageSnapshot, setOnePageSnapshot] = useState<AdjustableTokens | null>(null)

  // A4 at 210mm ≈ 794px @ 96dpi. Scale to fit mobile viewport, then multiply
  // by the user-controlled pinch zoom factor.
  const A4_WIDTH_PX = 794
  const MIN_USER_ZOOM = 0.5
  const MAX_USER_ZOOM = 3
  const baseScale: number = containerWidth / A4_WIDTH_PX
  const scale: number = baseScale * userZoom
  const scaledHeight: number = A4_WIDTH_PX * A4_RATIO * scale
  const scaledWidth: number = A4_WIDTH_PX * scale
  const previewHeight: number = contentHeight > 0 ? contentHeight * scale : scaledHeight
  const previewViewportWidth: number = Math.max(containerWidth * userZoom, scaledWidth)

  const updateTheme = useCallback(
    (patch: Partial<ThemeTokens>): void => {
      setThemeForTemplate(templateId, (draft) => {
        Object.assign(draft, patch)
      })
    },
    [templateId, setThemeForTemplate],
  )

  // Drive the auto-fit algorithm against the unscaled template content (innerRef).
  const { status: onePageStatus } = useOnePageMode({
    contentRef: innerRef,
    theme,
    patchTheme: updateTheme,
    enabled: onePageFit,
    snapshot: onePageSnapshot,
    setSnapshot: setOnePageSnapshot,
  })

  // When switching templates, clear the snapshot to avoid restoring one
  // template's tokens onto another. The next template starts fresh.
  const handleSelectTemplate = useCallback(
    (nextId: string): void => {
      if (nextId === templateId) return
      setOnePageSnapshot(null)
      setTemplateId(nextId)
      track('template_select', {
        resumeId: draftResumeId || searchParams.get('id'),
        templateId: nextId,
        previousTemplateId: templateId,
      })
    },
    [draftResumeId, searchParams, templateId],
  )

  const handleResetStyle = useCallback((): void => {
    setOnePageSnapshot(null)
    resetThemeForTemplate(templateId)
    toast.success('已恢复默认样式')
  }, [resetThemeForTemplate, templateId])

  const clampZoom = (z: number): number => Math.min(MAX_USER_ZOOM, Math.max(MIN_USER_ZOOM, z))

  const getTouchDistance = (touches: React.TouchList): number => {
    const dx: number = touches[0].clientX - touches[1].clientX
    const dy: number = touches[0].clientY - touches[1].clientY
    return Math.hypot(dx, dy)
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>): void => {
    if (e.touches.length === 2) {
      pinchStateRef.current = {
        startDist: getTouchDistance(e.touches),
        startZoom: userZoom,
      }
    } else if (e.touches.length === 1) {
      // Double-tap to reset zoom.
      const now: number = Date.now()
      if (now - lastTapRef.current < 300) {
        setUserZoom(1)
        lastTapRef.current = 0
      } else {
        lastTapRef.current = now
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>): void => {
    if (e.touches.length !== 2 || !pinchStateRef.current) return
    e.preventDefault()
    const dist: number = getTouchDistance(e.touches)
    const ratio: number = dist / pinchStateRef.current.startDist
    setUserZoom(clampZoom(pinchStateRef.current.startZoom * ratio))
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>): void => {
    if (e.touches.length < 2) pinchStateRef.current = null
  }

  // --- Export handlers ---
  const { showUpgrade, setShowUpgrade } = useVipCheck()
  const [isExporting, setIsExporting] = useState<boolean>(false)

  const inMiniProgram = useInMiniProgram()

  /**
   * Call /next-api/exports/mini to render and save the export asset.
   * Both mini-program and H5 use this same endpoint (dual-auth on server).
   */
  const createExportJob = useCallback(async (
    payload: { readonly resumeId: string; readonly templateId: string; readonly type: 'pdf' | 'image'; readonly fileName: string },
  ): Promise<ExportJobResponse> => {
    const response = await fetch('/next-api/exports/mini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...payload, mode: 'final' }),
    })
    log.info('create export job HTTP', { type: payload.type, resumeId: payload.resumeId, status: response.status })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      if (response.status === 402) {
        // In mini-program: navigate to native payment page for better UX
        // In H5/PC: show the upgrade dialog
        if (inMiniProgram && typeof window.wx?.miniProgram?.navigateTo === 'function') {
          log.info('quota exceeded in mini-program, navigating to native payment page')
          window.wx.miniProgram.navigateTo({
            url: '/pages/payment/payment?from=export'
          })
        } else {
          setShowUpgrade(true, 'pdf-export')
        }
        throw new Error(errorData?.error ?? '导出次数已用完')
      }
      throw new Error(errorData?.error ?? `导出失败 (${response.status})`)
    }
    const job = await response.json() as ExportJobResponse
    log.info('create export job parsed', { id: job.id, type: job.type, fileName: job.fileName, previewImages: job.previewImages?.length, expiresAt: job.expiresAt })
    track('export_success', {
      resumeId: payload.resumeId,
      templateId: payload.templateId,
      exportType: payload.type,
      exportId: job.id,
    })
    return job
  }, [setShowUpgrade, inMiniProgram])

  /**
   * Navigate to the export result page after a successful export.
   * Mini-program: native exportResult page (with share/download capabilities).
   * H5: /m/export-result page.
   */
  const openExportResult = useCallback((job: ExportJobResponse): void => {
    if (inMiniProgram) {
      // Try navigating to mini-program native page for better share/download UX
      const canNavigateTo = typeof window.wx?.miniProgram?.navigateTo === 'function'
      if (canNavigateTo) {
        const params = new URLSearchParams({
          id: job.id,
          type: job.type,
          fileName: job.fileName,
          url: job.downloadUrl,
          expiresAt: job.expiresAt,
        })
        if (job.previewImages && job.previewImages.length > 0) {
          params.set('previewImages', JSON.stringify(job.previewImages))
        }
        const page = `/pages/exportResult/exportResult?${params.toString()}`
        log.info('navigateTo mini-program exportResult', { page })
        window.wx?.miniProgram?.navigateTo({ url: page })
        return
      }
      log.warn('mini program navigateTo unavailable, falling back to H5 result page')
    }

    // H5 export result page
    log.info('open export result (H5)', { id: job.id, type: job.type })
    const params = new URLSearchParams({
      id: job.id,
      type: job.type,
      fileName: job.fileName,
      url: job.downloadUrl,
      expiresAt: job.expiresAt,
    })
    if (job.previewImages && job.previewImages.length > 0) {
      params.set('previewImages', JSON.stringify(job.previewImages))
    }
    router.push(`/m/export-result?${params.toString()}`)
  }, [router, inMiniProgram])

  /**
   * Sync the local theme overrides and template choice back to the DB before
   * server-side rendering. This ensures the SSR print page will render the
   * correct visual layout (including one-page mode and font settings).
   * Used by both the mini-program and H5 export flows.
   */
  const syncPreviewState = useCallback(async (targetId: string): Promise<void> => {
    const sourceResume: ResumeData = draft ?? resume
    const latestStore = useAppStore.getState()
    const latestTheme: ThemeTokens = latestStore.getThemeForTemplate(templateId)
    const latestThemesMap: Record<string, ThemeTokens> = latestStore.themes
    // Merge the current theme into the full themes map so other templates'
    // saved themes are preserved in the DB (not overwritten with an empty map).
    const mergedThemes = { ...latestThemesMap, [templateId]: latestTheme }
    log.info('syncPreviewState', {
      templateId,
      primaryColor: latestTheme.primaryColor,
      themesMapKeys: Object.keys(latestThemesMap),
    })

    const editorMeta = {
      themes: mergedThemes,
      onePageMode: onePageFit,
      onePageSnapshot,
    }

    // Strip any stale __editorMeta that may be embedded in the resume object
    // (e.g. when resume was loaded from the server GET response which includes
    // the raw content blob). embedEditorMeta will write the fresh meta.
    const { content: cleanContent } = extractEditorMeta(
      sourceResume as unknown as Record<string, unknown>
    )
    const contentWithMeta = embedEditorMeta(cleanContent, editorMeta)

    const response = await fetchWithNetworkRetry(`/next-api/resumes/${targetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: sourceResume.name || resume.name || 'Untitled Resume',
        content: contentWithMeta,
        template: templateId,
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      const message = text || `HTTP ${response.status}`
      log.warn('failed to sync preview state before export', { status: response.status, message })
      throw new Error('保存最新简历内容失败，请重试后再导出')
    }
  }, [draft, resume, templateId, onePageFit, onePageSnapshot])

  const handleConfirmSettings = useCallback(async (): Promise<void> => {
    const targetId: string | null = draftResumeId || searchParams.get('id')
    if (!targetId) {
      toast.error('无法获取简历 ID，请返回重试')
      return
    }
    setSettingsSaving(true)
    try {
      await syncPreviewState(targetId)
      setDraftTemplateId(templateId)
      setSheetOpen(false)
      toast.success('样式已保存')
    } catch (err: unknown) {
      log.warn('failed to save preview settings', {
        templateId,
        error: err instanceof Error ? err.message : String(err),
      })
      toast.error(err instanceof Error ? err.message : '样式保存失败，请稍后重试')
    } finally {
      setSettingsSaving(false)
    }
  }, [draftResumeId, searchParams, syncPreviewState, setDraftTemplateId, templateId])

  /**
   * Unified export handler for both PDF and image.
   * Both mini-program and H5 use the same flow:
   *   1. syncPreviewState (save theme/one-page to DB)
   *   2. call /next-api/exports/mini with mode='final'
   *   3. navigate to result page (native or H5)
   */
  const handleExport = useCallback(async (type: ExportType): Promise<void> => {
    if (!innerRef.current) return
    setIsExporting(true)
    const fileName: string = buildDefaultExportFileName(resume)
    const targetResumeIdForTrack: string | null = draftResumeId || searchParams.get('id')
    track('export_click', {
      resumeId: targetResumeIdForTrack,
      templateId,
      exportType: type,
      entry: 'mobile_preview_bottom_bar',
    })
    try {
      const targetResumeId: string | null = draftResumeId || searchParams.get('id')
      if (!targetResumeId) {
        toast.error('无法获取简历 ID，请返回重试')
        return
      }

      await syncPreviewState(targetResumeId)
      if (inMiniProgram && typeof window.wx?.miniProgram?.navigateTo === 'function') {
        const params = new URLSearchParams({
          resumeId: targetResumeId,
          templateId,
          type,
          fileName,
        })
        const page = `/pages/exportResult/exportResult?${params.toString()}`
        log.info('navigateTo native mini-program exportResult before confirm', { page })
        window.wx.miniProgram.navigateTo({ url: page })
        return
      }
      const job = await createExportJob({ resumeId: targetResumeId, templateId, type, fileName })
      openExportResult(job)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (type === 'pdf' ? 'PDF 导出失败' : '图片导出失败')
      track('export_failed', {
        resumeId: targetResumeIdForTrack,
        templateId,
        exportType: type,
        stage: 'create_export_job',
        failureReason: msg,
      })
      toast.error(msg)
    } finally {
      setIsExporting(false)
    }
  }, [resume, createExportJob, openExportResult, draftResumeId, searchParams, templateId, syncPreviewState, inMiniProgram])

  const handleExportPdf = useCallback(async (): Promise<void> => {
    await handleExport('pdf')
  }, [handleExport])

  const handleExportImage = useCallback(async (): Promise<void> => {
    await handleExport('image')
  }, [handleExport])

  const scopedStyleId = `m-preview-scope-${templateId}`

  return (
    <AiSectionProvider>
      <div className="h-[100dvh] overflow-hidden bg-slate-100 flex flex-col">
        <TopBar />

        <div
          ref={stageRef}
          className="min-h-0 flex-1 overflow-auto overscroll-contain px-3 pt-4"
          style={{
            touchAction: 'pan-x pan-y',
            // Bottom padding accounts for the fixed action bar (72px) + safe area.
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="mx-auto"
            style={{
              width: `${previewViewportWidth}px`,
              height: `${previewHeight}px`,
            }}
          >
            <div
              id={scopedStyleId}
              className="relative bg-white shadow-xl rounded overflow-hidden"
              style={{
                width: `${scaledWidth}px`,
                height: `${previewHeight}px`,
              }}
            >
              {/* Scoped CSS so titleScale / paragraphIndent can influence existing templates
                  without modifying every template's internals. Uses !important to win over
                  the templates' inline font-size on section headings. */}
              <style>{`
                #${scopedStyleId} .resume-container h2 {
                  font-size: calc(1.285em * ${titleScale}) !important;
                }
                #${scopedStyleId} .resume-container p {
                  text-indent: ${paragraphIndent}em;
                }
              `}</style>

              <div
                ref={innerRef}
                style={{
                  width: `${A4_WIDTH_PX}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  // Mobile preview is read-only. Disable template-level pointer
                  // events so editable headers, metric buttons, and section
                  // controls cannot be tapped while the outer stage still
                  // handles scroll, pinch zoom, and double-tap reset.
                  pointerEvents: 'none',
                }}
              >
                <Suspense fallback={<TemplateFallback />}>
                  {Template ? <Template resume={renderableResume} theme={theme} /> : null}
                </Suspense>
              </div>

              {onePageFit ? <OnePageBadge status={onePageStatus} /> : null}
            </div>
          </div>
        </div>

        {/* Zoom indicator — shows when user zoomed in/out, tap to reset.
            Positioned above the bottom action bar with safe-area awareness. */}
        {userZoom !== 1 && (
          <button
            type="button"
            onClick={(): void => setUserZoom(1)}
            className="fixed left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full bg-slate-900/80 text-white text-xs font-medium shadow-lg backdrop-blur active:scale-95 transition-transform"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}
            aria-label="重置缩放"
          >
            {Math.round(userZoom * 100)}% · 点击复位
          </button>
        )}

        <BottomActionBar
          onOpenSettings={(): void => setSheetOpen(true)}
          onExportPdf={handleExportPdf}
          onExportImage={handleExportImage}
          isExporting={isExporting}
        />

        <PreviewSettingsSheet
          open={sheetOpen}
          tab={tab}
          templateId={templateId}
          theme={theme}
          defaultPrimaryColor={defaultTheme.primaryColor}
          locksPrimaryColor={Boolean(templateConfig?.locksPrimaryColor)}
          onePageStatus={onePageStatus}
          onClose={(): void => setSheetOpen(false)}
          onConfirm={handleConfirmSettings}
          confirming={settingsSaving}
          onReset={handleResetStyle}
          onTabChange={setTab}
          onSelectTemplate={handleSelectTemplate}
          onUpdateTheme={updateTheme}
        />

        <VipUpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />
      </div>
    </AiSectionProvider>
  )
}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------

/** Minimal top bar: back + title. Primary actions live in the bottom bar. */
function TopBar(): ReactElement {
  const inMiniProgram = useInMiniProgram()

  if (inMiniProgram) return <></>

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between px-3 h-12 bg-white/90 backdrop-blur border-b border-slate-200">
      <button
        type="button"
        className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100"
        onClick={(): void => history.back()}
        aria-label="返回"
      >
        <ArrowLeft size={18} />
      </button>
      <div className="text-sm font-semibold text-slate-800">简历预览</div>
      <div className="w-9" />
    </div>
  )
}

function TemplateFallback(): ReactElement {
  return (
    <div className="w-full shadow-sm overflow-hidden">
      <ResumeSvgPlaceholder pulse />
    </div>
  )
}

function OnePageBadge({ status }: { readonly status: OnePageStatus }): ReactElement {
  const { bg, label } = ONE_PAGE_BADGE_STYLES[status]
  return (
    <div className={cn('absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded text-white', bg)}>
      {label}
    </div>
  )
}
