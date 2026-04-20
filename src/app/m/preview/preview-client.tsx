'use client'

import { useEffect, useRef, useState, Suspense, type ReactElement } from 'react'
import { ArrowLeft, Settings2, X, Loader2, FileDown } from 'lucide-react'
import { useAppStore } from '@/state/store'
import { TEMPLATE_REGISTRY, getTemplate } from '@/templates/template-loader'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import AiSectionProvider from '@/components/ai-section/ai-section-provider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

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

/**
 * Main client for /m/preview. Owns the current template id, mounts read-only mode,
 * and renders the active template alongside a bottom-sheet settings panel.
 */
export default function MobilePreviewClient(): ReactElement {
  const resume = useAppStore((s) => s.resume)
  const setReadOnly = useAppStore((s) => s.setReadOnly)
  const loadTestData = useAppStore((s) => s.loadTestData)
  const getThemeForTemplate = useAppStore((s) => s.getThemeForTemplate)
  const setThemeForTemplate = useAppStore((s) => s.setThemeForTemplate)
  // Subscribe to themes map so live updates re-render the preview.
  const themesMap = useAppStore((s) => s.themes)
  void themesMap

  const [templateId, setTemplateId] = useState<string>('simple')
  const [sheetOpen, setSheetOpen] = useState<boolean>(false)
  const [tab, setTab] = useState<SettingsTab>('template')
  const [containerWidth, setContainerWidth] = useState<number>(MOBILE_PAGE_MAX_WIDTH_PX)
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setReadOnly(true)
    loadTestData()
    return (): void => {
      setReadOnly(false)
    }
  }, [setReadOnly, loadTestData])

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

  const theme: ThemeTokens = getThemeForTemplate(templateId)
  const templateConfig = getTemplate(templateId)
  const Template = templateConfig?.component

  const titleScale: number = theme.titleScale ?? 1
  const paragraphIndent: number = theme.paragraphIndent ?? 0
  const onePageFit: boolean = theme.onePageFit ?? false

  // A4 at 210mm ≈ 794px @ 96dpi. Scale to fit mobile viewport.
  const A4_WIDTH_PX = 794
  const scale: number = containerWidth / A4_WIDTH_PX
  const scaledHeight: number = A4_WIDTH_PX * A4_RATIO * scale

  const updateTheme = (patch: Partial<ThemeTokens>): void => {
    setThemeForTemplate(templateId, (draft) => {
      Object.assign(draft, patch)
    })
  }

  const scopedStyleId = `m-preview-scope-${templateId}`

  return (
    <AiSectionProvider>
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <TopBar />

        <div ref={stageRef} className="flex-1 flex items-start justify-center px-3 pt-4 pb-32 overflow-y-auto">
          <div
            id={scopedStyleId}
            className="relative bg-white shadow-xl rounded"
            style={{
              width: `${containerWidth}px`,
              minHeight: `${scaledHeight}px`,
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

            {onePageFit ? (
              <div className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded bg-violet-600/90 text-white">
                单页模式（UI 占位）
              </div>
            ) : null}
          </div>
        </div>

        <FloatingSettingsButton onClick={(): void => setSheetOpen(true)} />

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
              <TemplatePanel activeId={templateId} onSelect={setTemplateId} />
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
      </div>
    </AiSectionProvider>
  )
}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------

function TopBar(): ReactElement {
  const [showExportMenu, setShowExportMenu] = useState(false)

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
      <div className="relative">
        <button
          type="button"
          className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100"
          onClick={(): void => setShowExportMenu((v) => !v)}
          aria-label="导出"
        >
          <FileDown size={18} />
        </button>
        {showExportMenu && (
          <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
            <button
              type="button"
              className="w-full px-3 py-2 text-sm text-left text-slate-700 hover:bg-slate-50"
              onClick={(): void => {
                setShowExportMenu(false)
                alert('导出 PDF 功能开发中')
              }}
            >
              导出 PDF
            </button>
            <button
              type="button"
              className="w-full px-3 py-2 text-sm text-left text-slate-700 hover:bg-slate-50"
              onClick={(): void => {
                setShowExportMenu(false)
                alert('导出图片功能开发中')
              }}
            >
              导出图片
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function TemplateFallback(): ReactElement {
  return (
    <div className="flex items-center justify-center py-20 text-slate-500">
      <Loader2 className="animate-spin" size={18} />
      <span className="ml-2 text-sm">加载模板…</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Floating button + bottom sheet
// ---------------------------------------------------------------------------

function FloatingSettingsButton({ onClick }: { onClick: () => void }): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full bg-violet-600 text-white shadow-xl shadow-violet-600/30 flex items-center justify-center active:scale-95 transition-transform"
      aria-label="打开排版设置"
    >
      <Settings2 size={22} />
    </button>
  )
}

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
          <span className="text-xs text-slate-500">开启后系统将尝试自动缩放以单页呈现（占位，后续接入自动缩放算法）</span>
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
