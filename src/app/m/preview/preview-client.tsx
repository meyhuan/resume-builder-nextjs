'use client'

import { useEffect, useRef, useState, useCallback, Suspense, type ReactElement } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Settings2, X, Loader2, FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/state/store'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import type { ResumeData } from '@/entities/resume/resume-data'
import { TEMPLATE_REGISTRY, getTemplate } from '@/templates/template-loader'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import AiSectionProvider from '@/components/ai-section/ai-section-provider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { buildResumeHtml } from '@/io/html-export'
import { ResumeSvgPlaceholder } from '@/features/m/resume-list/shared'
import { exportImage } from '@/io/export-image'
import { useVipCheck } from '@/hooks/use-vip-check'
import VipUpgradeDialog from '@/components/vip/vip-upgrade-dialog'
import { useOnePageMode, type OnePageStatus } from '@/hooks/use-one-page-mode'
import type { AdjustableTokens } from '@/entities/editor/editor-meta'
import { createLogger } from '@/lib/logger'
import { useInMiniProgram } from '../_components/use-mini-program'

const FONT_FAMILIES: ReadonlyArray<{ id: string; label: string; stack: string }> = [
  { id: 'sans', label: '无衬线', stack: 'Inter, "Noto Sans SC", system-ui, sans-serif' },
  { id: 'serif', label: '衬线', stack: '"Noto Serif SC", "Songti SC", Georgia, serif' },
  { id: 'mono', label: '等宽', stack: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
]

const PRESET_COLORS: ReadonlyArray<string> = [
  '#111827', '#2563eb', '#0891b2', '#10b981', '#b45309',
  '#b91c1c', '#7c3aed', '#db2777', '#475569',
]

const TEMPLATE_IDS: ReadonlyArray<string> = Object.keys(TEMPLATE_REGISTRY)

const MOBILE_PAGE_MAX_WIDTH_PX = 390
const A4_RATIO = 297 / 210

type SettingsTab = 'template' | 'color' | 'font' | 'layout' | 'advanced'

interface PdfQuotaCheck {
  readonly allowed?: boolean
  readonly isVip?: boolean
  readonly remaining?: number | 'unlimited'
  readonly message?: string
}

type ExportType = 'pdf' | 'image'

interface ExportJobResponse {
  readonly id: string
  readonly type: ExportType
  readonly fileName: string
  readonly downloadUrl: string
  readonly previewUrl: string
  readonly expiresAt: string
}

const log = createLogger('m/preview')

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
  const setThemeForTemplate = useAppStore((s) => s.setThemeForTemplate)
  // Subscribe to themes map so live updates re-render the preview.
  const themesMap = useAppStore((s) => s.themes)
  void themesMap

  // Draft store holds the user's actual edits
  const draft = useDraftStore((s) => s.draft)
  const draftResumeId = useDraftStore((s) => s.resumeId)
  const setFromServer = useDraftStore((s) => s.setFromServer)
  const saveThumbnail = useDraftStore((s) => s.saveThumbnail)

  const initialTemplateId: string = (() => {
    const fromUrl: string | null = searchParams.get('tpl')
    return fromUrl && TEMPLATE_REGISTRY[fromUrl] ? fromUrl : 'simple'
  })()
  const [templateId, setTemplateId] = useState<string>(initialTemplateId)
  const [sheetOpen, setSheetOpen] = useState<boolean>(false)
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
            setFromServer(full.id, full.content, full.template ?? 'simple')
            setResume((d: ResumeData): void => {
              Object.assign(d, full.content)
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
  }, [draft, searchParams, draftResumeId, setReadOnly, setResume, setFromServer])

  useEffect(() => {
    const update = (): void => {
      if (!stageRef.current) return
      const w = Math.min(stageRef.current.clientWidth, MOBILE_PAGE_MAX_WIDTH_PX)
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
  const templateConfig = getTemplate(templateId)
  const Template = templateConfig?.component

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
    },
    [templateId],
  )

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
  const { requirePdf, showUpgrade, setShowUpgrade } = useVipCheck()
  const [isExporting, setIsExporting] = useState<boolean>(false)

  const requireExportQuota = useCallback(async (): Promise<boolean> => {
    const quotaCheckRes = await fetch('/next-api/quota', { credentials: 'include', cache: 'no-store' })
    log.info('export quota precheck HTTP', { status: quotaCheckRes.status })
    if (!quotaCheckRes.ok) {
      log.warn('export quota precheck failed, fallback to local requirePdf', { status: quotaCheckRes.status })
      return requirePdf()
    }
    const quotaJson: { pdfExport?: PdfQuotaCheck } = await quotaCheckRes.json()
    const pdfQuota: PdfQuotaCheck | undefined = quotaJson.pdfExport
    log.info('export quota precheck parsed', { pdfQuota })
    if (pdfQuota?.allowed || pdfQuota?.isVip) return true
    log.warn('export quota precheck blocked export', { pdfQuota })
    toast.error(pdfQuota?.message || '导出次数已用完')
    setShowUpgrade(true)
    return false
  }, [requirePdf, setShowUpgrade])

  const inMiniProgram = useInMiniProgram()

  /**
   * Hand off to the native mini-program exportResult page using the resume id.
   * The native page calls /next-api/exports/mini directly (preview→confirm→
   * destinations) so this route does not need to render the file. Returns true
   * if the handoff was attempted, false if the caller should fall back to the
   * normal H5 export pipeline.
   */
  const openMiniProgramExportResult = useCallback((opts: {
    readonly type: ExportType
    readonly resumeId: string
    readonly templateId: string
    readonly fileName: string
  }): boolean => {
    const canNavigateTo = typeof window.wx?.miniProgram?.navigateTo === 'function'
    if (!canNavigateTo) {
      log.warn('mini program navigateTo unavailable, fallback to H5 export')
      return false
    }
    const params = new URLSearchParams({
      type: opts.type,
      resumeId: opts.resumeId,
      templateId: opts.templateId,
      fileName: opts.fileName,
    })
    const page = `/pages/exportResult/exportResult?${params.toString()}`
    log.info('mini program navigateTo (native flow)', { page, type: opts.type, resumeId: opts.resumeId })
    window.wx?.miniProgram?.navigateTo({ url: page })
    return true
  }, [])

  const openExportResult = useCallback((job: ExportJobResponse): void => {
    log.info('open export result (H5)', { id: job.id, type: job.type, fileName: job.fileName, inMiniProgram })
    const params = new URLSearchParams({
      id: job.id,
      type: job.type,
      fileName: job.fileName,
      url: job.downloadUrl,
      expiresAt: job.expiresAt,
    })
    router.push(`/m/export-result?${params.toString()}`)
  }, [router, inMiniProgram])

  const createExportJob = useCallback(async (
    payload: { readonly type: 'pdf'; readonly html: string; readonly fileName: string } | { readonly type: 'image'; readonly dataUrl: string; readonly fileName: string },
  ): Promise<ExportJobResponse> => {
    const response = await fetch('/next-api/exports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    log.info('create export job HTTP', { type: payload.type, status: response.status })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.error ?? `导出失败 (${response.status})`)
    }
    const job = await response.json() as ExportJobResponse
    log.info('create export job parsed', { id: job.id, type: job.type, fileName: job.fileName, expiresAt: job.expiresAt })
    return job
  }, [])

  const handleExportPdf = useCallback(async (): Promise<void> => {
    if (!innerRef.current) return
    setIsExporting(true)
    const fileName: string = resume.name || 'resume'
    try {
      // Mini-program flow: skip H5 file generation entirely, hand the raw
      // resumeId+templateId off to the native page so the user sees the
      // server-rendered preview before consuming any quota.
      if (inMiniProgram) {
        const targetResumeId: string | null = draftResumeId || searchParams.get('id')
        if (targetResumeId) {
          const handed = openMiniProgramExportResult({
            type: 'pdf',
            resumeId: targetResumeId,
            templateId,
            fileName,
          })
          if (handed) return
        } else {
          log.warn('miniprogram pdf export missing resumeId, falling back to H5')
        }
      }

      if (!(await requireExportQuota())) return

      const html: string = buildResumeHtml(innerRef.current, { title: fileName })
      const job = await createExportJob({ type: 'pdf', html, fileName })
      openExportResult(job)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'PDF 导出失败')
    } finally {
      setIsExporting(false)
    }
  }, [resume, requireExportQuota, createExportJob, openExportResult, inMiniProgram, draftResumeId, searchParams, templateId, openMiniProgramExportResult])

  const handleExportImage = useCallback(async (): Promise<void> => {
    if (!innerRef.current) return
    setIsExporting(true)
    try {
      const fileName: string = resume.name || 'resume'
      // Mini-program flow: hand off to native page with resumeId for server-side
      // rendering. The native page will consume quota only after preview confirm.
      if (inMiniProgram) {
        const targetResumeId: string | null = draftResumeId || searchParams.get('id')
        if (targetResumeId) {
          const handed = openMiniProgramExportResult({
            type: 'image',
            resumeId: targetResumeId,
            templateId,
            fileName,
          })
          if (handed) return
        } else {
          log.warn('miniprogram image export missing resumeId, falling back to H5')
        }
      }

      if (!(await requireExportQuota())) return
      const dataUrl = await exportImage(innerRef, {
        fileName,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        returnBase64: true,
        resetTransform: true,
      })
      if (typeof dataUrl !== 'string') throw new Error('图片生成失败')
      const job = await createExportJob({ type: 'image', dataUrl, fileName })
      openExportResult(job)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '图片导出失败')
    } finally {
      setIsExporting(false)
    }
  }, [resume, requireExportQuota, createExportJob, openExportResult, inMiniProgram, draftResumeId, searchParams, templateId, openMiniProgramExportResult])

  const scopedStyleId = `m-preview-scope-${templateId}`

  return (
    <AiSectionProvider>
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <TopBar />

        <div
          ref={stageRef}
          className="flex-1 flex items-start justify-center px-3 pt-4 overflow-auto touch-pan-y"
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
            id={scopedStyleId}
            className="relative bg-white shadow-xl rounded overflow-hidden"
            style={{
              width: `${containerWidth * userZoom}px`,
              // Use the measured unscaled content height × scale for the real
              // visual height. Fallback to one A4 page height before measurement.
              height: `${contentHeight > 0 ? contentHeight * scale : scaledHeight}px`,
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
              }}
            >
              <Suspense fallback={<TemplateFallback />}>
                {Template ? <Template resume={resume} theme={theme} /> : null}
              </Suspense>
            </div>

            {onePageFit ? <OnePageBadge status={onePageStatus} /> : null}
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

        <BottomSheet open={sheetOpen} onClose={(): void => setSheetOpen(false)}>
          <Tabs value={tab} onValueChange={(v): void => setTab(v as SettingsTab)}>
            <TabsList className="grid grid-cols-5 w-full h-10 bg-slate-100 mb-3">
              <TabsTrigger value="template">模板</TabsTrigger>
              <TabsTrigger value="color">配色</TabsTrigger>
              <TabsTrigger value="font">字体</TabsTrigger>
              <TabsTrigger value="layout">排版</TabsTrigger>
              <TabsTrigger value="advanced">高级</TabsTrigger>
            </TabsList>

            <TabsContent value="template">
              <TemplatePanel activeId={templateId} onSelect={handleSelectTemplate} />
            </TabsContent>

            <TabsContent value="color">
              <ColorPanel
                value={theme.primaryColor}
                locked={Boolean(templateConfig?.locksPrimaryColor)}
                onChange={(c): void => updateTheme({ primaryColor: c })}
              />
            </TabsContent>

            <TabsContent value="font">
              <FontPanel theme={theme} onUpdate={updateTheme} />
            </TabsContent>

            <TabsContent value="layout">
              <LayoutPanel theme={theme} onUpdate={updateTheme} />
            </TabsContent>

            <TabsContent value="advanced">
              <AdvancedPanel theme={theme} onUpdate={updateTheme} />
            </TabsContent>
          </Tabs>
        </BottomSheet>

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

// ---------------------------------------------------------------------------
// Bottom action bar (primary mobile touchpoint)
// ---------------------------------------------------------------------------

interface BottomActionBarProps {
  readonly onOpenSettings: () => void
  readonly onExportPdf: () => Promise<void>
  readonly onExportImage: () => Promise<void>
  readonly isExporting: boolean
}

/**
 * Fixed bottom action bar with thumb-zone friendly primary actions.
 * Follows mobile UX best practice: primary actions in the bottom third of
 * the screen, with safe-area inset support for iOS home-indicator.
 */
function BottomActionBar(props: BottomActionBarProps): ReactElement {
  const { onOpenSettings, onExportPdf, onExportImage, isExporting } = props
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false)

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm active:scale-[0.98] transition-transform"
        >
          <Settings2 size={18} />
          <span>排版设置</span>
        </button>

        <div className="relative flex-1">
          <button
            type="button"
            onClick={(): void => setShowExportMenu((v) => !v)}
            disabled={isExporting}
            className="w-full h-11 rounded-xl flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm shadow-md shadow-violet-600/30 active:scale-[0.98] transition-transform disabled:opacity-70"
          >
            {isExporting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>导出中…</span>
              </>
            ) : (
              <>
                <FileDown size={18} />
                <span>导出</span>
              </>
            )}
          </button>

          {showExportMenu && !isExporting && (
            <>
              {/* Tap-outside dismissal layer */}
              <div
                className="fixed inset-0 z-40"
                onClick={(): void => setShowExportMenu(false)}
              />
              <div className="absolute right-0 bottom-full mb-2 w-40 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 overflow-hidden">
                <button
                  type="button"
                  className="w-full px-4 py-3 text-sm text-left text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                  onClick={(): void => {
                    setShowExportMenu(false)
                    void onExportPdf()
                  }}
                >
                  导出 PDF
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-3 text-sm text-left text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                  onClick={(): void => {
                    setShowExportMenu(false)
                    void onExportImage()
                  }}
                >
                  导出图片
                </button>
              </div>
            </>
          )}
        </div>
      </div>
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

// ---------------------------------------------------------------------------
// Bottom sheet
// ---------------------------------------------------------------------------

interface BottomSheetProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly children: React.ReactNode
}

function BottomSheet({ open, onClose, children }: BottomSheetProps): ReactElement {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition-opacity',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300',
          'h-[480px] flex flex-col',
          open ? 'translate-y-0' : 'translate-y-full'
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
          <div className="h-1 w-10 rounded bg-slate-300 mx-auto -mt-1 mb-2" />
        </div>
        <div className="flex items-center justify-between px-5 pb-2 shrink-0 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">排版设置</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------

function TemplatePanel({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }): ReactElement {
  return (
    <div className="grid grid-cols-3 gap-3">
      {TEMPLATE_IDS.map((id) => {
        const cfg = TEMPLATE_REGISTRY[id]
        const isActive = id === activeId
        return (
          <button
            key={id}
            type="button"
            onClick={(): void => onSelect(id)}
            className={cn(
              'flex flex-col items-stretch gap-1.5 p-1 rounded-lg border text-left transition-all',
              isActive ? 'border-violet-600 ring-2 ring-violet-600/30' : 'border-slate-200 hover:border-slate-300'
            )}
          >
            <div className="aspect-[210/297] bg-slate-100 rounded overflow-hidden flex items-center justify-center">
              {cfg.preview ? (
                <img src={cfg.preview} alt={cfg.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-slate-400">{cfg.name}</span>
              )}
            </div>
            <div className="px-1 pb-1">
              <div className="text-xs font-medium text-slate-800 truncate">{cfg.name}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function ColorPanel({
  value,
  locked,
  onChange,
}: {
  readonly value: string
  readonly locked: boolean
  readonly onChange: (c: string) => void
}): ReactElement {
  return (
    <div className="space-y-3">
      {locked ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2">
          当前模板锁定了品牌主色，切换其他模板可自定义配色。
        </div>
      ) : null}
      <div className="grid grid-cols-9 gap-2">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            disabled={locked}
            onClick={(): void => onChange(c)}
            className={cn(
              'h-8 w-8 rounded-full border-2 transition-transform active:scale-95',
              c === value ? 'border-slate-900 scale-110' : 'border-white',
              'shadow ring-1 ring-slate-200',
              locked ? 'opacity-40 cursor-not-allowed' : ''
            )}
            style={{ backgroundColor: c }}
            aria-label={`选择颜色 ${c}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-600">自定义</label>
        <input
          type="color"
          value={value}
          disabled={locked}
          onChange={(e): void => onChange(e.target.value)}
          className="h-8 w-12 rounded border border-slate-200 bg-transparent p-0"
        />
        <span className="text-xs text-slate-500 font-mono">{value}</span>
      </div>
    </div>
  )
}

interface ThemePatcher {
  (patch: Partial<ThemeTokens>): void
}

function FontPanel({ theme, onUpdate }: { readonly theme: ThemeTokens; readonly onUpdate: ThemePatcher }): ReactElement {
  const activeFamily = FONT_FAMILIES.find((f) => theme.fontFamily.includes(f.stack.split(',')[0])) ?? FONT_FAMILIES[0]

  return (
    <div className="space-y-5">
      <Row label="字体">
        <div className="grid grid-cols-3 gap-2">
          {FONT_FAMILIES.map((f) => {
            const selected = f.id === activeFamily.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={(): void => onUpdate({ fontFamily: f.stack })}
                className={cn(
                  'h-10 rounded-lg border text-sm',
                  selected ? 'border-violet-600 text-violet-700 bg-violet-50' : 'border-slate-200 text-slate-700'
                )}
                style={{ fontFamily: f.stack }}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </Row>

      <Row label={`字号基准 · ${theme.fontSize}px`}>
        <Slider
          min={12}
          max={18}
          step={1}
          value={[theme.fontSize]}
          onValueChange={([v]): void => onUpdate({ fontSize: v })}
        />
      </Row>

      <Row label="文字颜色">
        <input
          type="color"
          value={theme.textColor}
          onChange={(e): void => onUpdate({ textColor: e.target.value })}
          className="h-9 w-16 rounded border border-slate-200 bg-transparent p-0"
        />
      </Row>
    </div>
  )
}

function LayoutPanel({ theme, onUpdate }: { readonly theme: ThemeTokens; readonly onUpdate: ThemePatcher }): ReactElement {
  return (
    <div className="space-y-5">
      <Row label={`行距 · ${theme.lineHeight.toFixed(2)}`}>
        <Slider
          min={1.2}
          max={2}
          step={0.05}
          value={[theme.lineHeight]}
          onValueChange={([v]): void => onUpdate({ lineHeight: Number(v.toFixed(2)) })}
        />
      </Row>

      <Row label={`模块间距 · ${theme.spacingScale.toFixed(2)}×`}>
        <Slider
          min={0.6}
          max={1.6}
          step={0.05}
          value={[theme.spacingScale]}
          onValueChange={([v]): void => onUpdate({ spacingScale: Number(v.toFixed(2)) })}
        />
      </Row>

      <Row label={`页边距上下 · ${theme.pagePaddingVertical}mm`}>
        <Slider
          min={10}
          max={35}
          step={1}
          value={[theme.pagePaddingVertical]}
          onValueChange={([v]): void => onUpdate({ pagePaddingVertical: v })}
        />
      </Row>

      <Row label={`页边距左右 · ${theme.pagePaddingHorizontal}mm`}>
        <Slider
          min={8}
          max={30}
          step={1}
          value={[theme.pagePaddingHorizontal]}
          onValueChange={([v]): void => onUpdate({ pagePaddingHorizontal: v })}
        />
      </Row>
    </div>
  )
}

function AdvancedPanel({ theme, onUpdate }: { readonly theme: ThemeTokens; readonly onUpdate: ThemePatcher }): ReactElement {
  const titleScale: number = theme.titleScale ?? 1
  const paragraphIndent: number = theme.paragraphIndent ?? 0
  const onePageFit: boolean = theme.onePageFit ?? false

  return (
    <div className="space-y-5">
      <Row label={`标题放大倍率 · ${titleScale.toFixed(2)}×`}>
        <Slider
          min={0.9}
          max={1.6}
          step={0.05}
          value={[titleScale]}
          onValueChange={([v]): void => onUpdate({ titleScale: Number(v.toFixed(2)) })}
        />
      </Row>

      <Row label={`段落首行缩进 · ${paragraphIndent}em`}>
        <Slider
          min={0}
          max={2}
          step={1}
          value={[paragraphIndent]}
          onValueChange={([v]): void => onUpdate({ paragraphIndent: v })}
        />
      </Row>

      <Row label="单页模式">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(): void => onUpdate({ onePageFit: !onePageFit })}
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors',
              onePageFit ? 'bg-violet-600' : 'bg-slate-300'
            )}
            aria-pressed={onePageFit}
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
                onePageFit ? 'left-5' : 'left-0.5'
              )}
            />
          </button>
          <span className="text-xs text-slate-500">开启后自动压缩间距/行高/字号以适配单页 A4，关闭时恢复原设置</span>
        </div>
      </Row>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared layout helpers
// ---------------------------------------------------------------------------

function Row({ label, children }: { readonly label: string; readonly children: React.ReactNode }): ReactElement {
  return (
    <div>
      <div className="text-xs font-medium text-slate-700 mb-2">{label}</div>
      {children}
    </div>
  )
}

/**
 * Status badge overlaid on the preview when one-page mode is enabled.
 * Colours/messages mirror the four states from `useOnePageMode`.
 */
const ONE_PAGE_BADGE_STYLES: Record<OnePageStatus, { bg: string; label: string }> = {
  idle: { bg: 'bg-violet-600/90', label: '单页模式' },
  fitting: { bg: 'bg-amber-500/90', label: '正在适配单页…' },
  fit: { bg: 'bg-emerald-600/90', label: '单页适配完成' },
  overflow: { bg: 'bg-rose-600/90', label: '内容过多，建议精简' },
}

function OnePageBadge({ status }: { readonly status: OnePageStatus }): ReactElement {
  const { bg, label } = ONE_PAGE_BADGE_STYLES[status]
  return (
    <div className={cn('absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded text-white', bg)}>
      {label}
    </div>
  )
}
