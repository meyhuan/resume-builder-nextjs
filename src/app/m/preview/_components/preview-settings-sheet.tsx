'use client'

/* Hallmark · component: mobile-settings-sheet · genre: modern-minimal · theme: existing violet
 * states: default · hover · focus · active · disabled · loading · error · success (saved preview)
 * pre-emit critique: P4 H4 E4 S4 R5 V3 · component scope, no page macrostructure changes
 */

import { TemplateBrowser } from '@/components/templates/template-browser'
import { templateLabels } from '@/lib/templates/template-taxonomy'
import { useRef, type ReactElement, type ReactNode } from 'react'
import { Check, LoaderCircle, RotateCcw, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import {
  getResumeFontFamily,
  RESUME_FONT_OPTIONS,
  resolveResumeFontFamilyId,
} from '@/entities/theme/font-stacks'
import { templateCatalog } from '@/lib/templates/template-catalog'
import type { OnePageStatus } from '@/hooks/use-one-page-mode'
import { cn } from '@/lib/utils'

export type SettingsTab = 'template' | 'appearance' | 'layout' | 'one-page'

export interface ThemePatcher {
  (patch: Partial<ThemeTokens>): void
}

export const DEFAULT_PREVIEW_THEME: ThemeTokens = {
  primaryColor: '#111827',
  textColor: '#111827',
  fontFamilyId: 'sans',
  fontFamily: getResumeFontFamily('sans'),
  fontSize: 15,
  lineHeight: 1.5,
  spacingScale: 1,
  pagePaddingVertical: 19,
  pagePaddingHorizontal: 15,
  titleScale: 1,
  paragraphIndent: 0,
  onePageFit: false,
}

export const ONE_PAGE_BADGE_STYLES: Record<OnePageStatus, { bg: string; label: string }> = {
  idle: { bg: 'bg-violet-600/90', label: '单页模式' },
  fitting: { bg: 'bg-amber-500/90', label: '正在适配单页…' },
  fit: { bg: 'bg-emerald-600/90', label: '单页适配完成' },
  overflow: { bg: 'bg-rose-600/90', label: '内容过多，建议精简' },
}

const PRESET_COLORS: ReadonlyArray<string> = [
  '#111827', '#2563eb', '#0891b2', '#10b981', '#b45309',
  '#b91c1c', '#7c3aed', '#db2777', '#475569',
]

const TEMPLATES = templateCatalog

interface PreviewSettingsSheetProps {
  readonly open: boolean
  readonly tab: SettingsTab
  readonly templateId: string
  readonly theme: ThemeTokens
  readonly defaultPrimaryColor: string
  readonly locksPrimaryColor: boolean
  readonly onePageStatus: OnePageStatus
  readonly onClose: () => void
  readonly onConfirm: () => void | Promise<void>
  readonly confirming: boolean
  readonly saveError?: string | null
  readonly onReset: () => void
  readonly onTabChange: (tab: SettingsTab) => void
  readonly onSelectTemplate: (id: string) => void
  readonly onUpdateTheme: ThemePatcher
}

export function PreviewSettingsSheet(props: PreviewSettingsSheetProps): ReactElement {
  const {
    open,
    tab,
    templateId,
    theme,
    defaultPrimaryColor,
    locksPrimaryColor,
    onePageStatus,
    onClose,
    onConfirm,
    confirming,
    saveError,
    onReset,
    onTabChange,
    onSelectTemplate,
    onUpdateTheme,
  } = props

  return (
    <BottomSheet open={open} confirming={confirming} saveError={saveError} selectedName={TEMPLATES.find((item) => item.id === templateId)?.name ?? templateId} onClose={onClose} onConfirm={onConfirm}>
      <Tabs value={tab} onValueChange={(v): void => onTabChange(v as SettingsTab)} className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 bg-white px-4 pb-3 pt-3">
          <TabsList className="grid h-12 w-full grid-cols-4 rounded-xl bg-slate-100 p-0.5 [&>button]:min-h-11">
          <TabsTrigger value="template" className="transition-colors">模板</TabsTrigger>
          <TabsTrigger value="appearance" className="transition-colors">外观</TabsTrigger>
          <TabsTrigger value="layout" className="transition-colors">版式</TabsTrigger>
          <TabsTrigger value="one-page" className="transition-colors">单页</TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-4 pb-4" data-settings-scroll>
          <TabsContent value="template" className="mt-0">
            <TemplatePanel activeId={templateId} onSelect={onSelectTemplate} />
          </TabsContent>

          <TabsContent value="appearance" className="mt-0">
            <AppearancePanel
              key={templateId}
              theme={theme}
              defaultPrimaryColor={defaultPrimaryColor}
              locked={locksPrimaryColor}
              onUpdate={onUpdateTheme}
            />
          </TabsContent>

          <TabsContent value="layout" className="mt-0">
            <LayoutPanel theme={theme} onUpdate={onUpdateTheme} />
          </TabsContent>

          <TabsContent value="one-page" className="mt-0">
            <OnePagePanel theme={theme} status={onePageStatus} onUpdate={onUpdateTheme} />
          </TabsContent>
          {tab !== 'template' && (
            <div className="mt-6 border-t border-slate-100 pt-3">
              <button type="button" onClick={onReset} className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-slate-600 focus-visible:outline-2 focus-visible:outline-violet-600">
                <RotateCcw size={16} aria-hidden="true" />重置当前模板全部样式
              </button>
              <p className="px-2 text-xs leading-5 text-slate-500">恢复外观、版式及单页设置，不修改简历内容。</p>
            </div>
          )}
        </div>
      </Tabs>
    </BottomSheet>
  )
}

interface BottomSheetProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly onConfirm: () => void | Promise<void>
  readonly confirming: boolean
  readonly saveError?: string | null
  readonly selectedName: string
  readonly children: ReactNode
}

function BottomSheet({ open, onClose, onConfirm, confirming, saveError, selectedName, children }: BottomSheetProps): ReactElement {
  const previousFocus = useRef<HTMLElement | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  return (
    <Dialog open={open} onOpenChange={(next): void => { if (!next && !confirming) onClose() }}>
      <DialogContent
        ref={contentRef}
        hideCloseButton
        overlayClassName="bg-slate-900/20"
        className="bottom-0 left-0 top-auto flex h-[88dvh] max-h-[900px] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-b-none rounded-t-2xl border-0 bg-white p-0 shadow-2xl sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-violet-600 [&_button]:disabled:cursor-not-allowed [&_button]:disabled:opacity-50 motion-reduce:[&_*]:transition-none motion-reduce:[&_button]:transform-none"
        onOpenAutoFocus={(event): void => {
          event.preventDefault()
          previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          contentRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus({ preventScroll: true })
        }}
        onCloseAutoFocus={(event): void => { event.preventDefault(); previousFocus.current?.focus({ preventScroll: true }) }}
        onEscapeKeyDown={(event): void => { if (confirming) event.preventDefault() }}
        onPointerDownOutside={(event): void => { if (confirming) event.preventDefault() }}
        aria-busy={confirming}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 py-2 pl-4 pr-2">
          <div>
            <DialogTitle className="text-base text-slate-900">调整样式</DialogTitle>
            <DialogDescription className="mt-1 text-xs text-slate-500">试选后保存，取消将恢复原样</DialogDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            aria-label="取消并关闭"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 bg-white" inert={confirming || undefined}>{children}</div>
        <div
          className="shrink-0 border-t border-slate-100 bg-white px-4 py-2.5"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}
        >
          <p className="mb-2 text-xs text-slate-600">已选模板：<span className="font-medium text-slate-900">{selectedName}</span></p>
          {saveError && <p role="alert" className="mb-2 text-sm leading-5 text-red-700">{saveError}</p>}
          <div className="grid grid-cols-[1fr_1.5fr] gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={confirming}
              className="flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100"
            >
              取消
            </button>
            <button
              type="button"
              onClick={(): void => { void onConfirm() }}
              disabled={confirming}
              className="flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-violet-600 text-sm font-medium text-white shadow-sm hover:bg-violet-700 active:bg-violet-800"
            >
              {confirming ? <LoaderCircle size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
              {confirming ? '保存中…' : '应用并保存'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TemplatePanel({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }): ReactElement {
  return (
    <TemplateBrowser templates={TEMPLATES} currentId={activeId} compact gridClassName="grid grid-cols-2 gap-3"
      renderTemplate={(cfg) => {
        const id = cfg.id
        const isActive = id === activeId
        return (
          <button
            key={id}
            data-template-id={id}
            aria-pressed={isActive}
            type="button"
            onClick={(): void => onSelect(id)}
            className={cn(
              'relative min-w-0 flex flex-col items-stretch gap-2 rounded-xl border bg-white p-2 text-left transition-colors',
              isActive ? 'border-violet-500 bg-violet-50/30' : 'border-slate-200',
            )}
          >
            {isActive ? (
              <span className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white shadow-sm">
                <Check size={15} />
              </span>
            ) : null}
            <div className="aspect-[210/297] bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
              {cfg.preview ? (
                <img src={cfg.preview} alt={cfg.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-slate-400">{cfg.name}</span>
              )}
            </div>
            <div className="px-0.5 pb-0.5">
              <div className="text-sm font-semibold text-slate-900">{cfg.name}</div>
              <div className="mt-0.5 text-xs leading-5 text-slate-500">{isActive ? '已选' : templateLabels(cfg).slice(0, 2).join(' · ')}</div>
            </div>
          </button>
        )
      }} />
  )
}

function AppearancePanel({
  theme,
  defaultPrimaryColor,
  locked,
  onUpdate,
}: {
  readonly theme: ThemeTokens
  readonly defaultPrimaryColor: string
  readonly locked: boolean
  readonly onUpdate: ThemePatcher
}): ReactElement {
  const activeFamilyId = resolveResumeFontFamilyId(theme.fontFamilyId, theme.fontFamily)

  return (
    <div className="space-y-6">
      <Row label="主题色">
        <div className="space-y-3">
          {locked ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              当前模板使用固定品牌色，切换其他模板后可自定义颜色。
            </div>
          ) : null}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(44px,1fr))] gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                disabled={locked}
                onClick={(): void => onUpdate({ primaryColor: c })}
                className={cn(
                  'relative h-11 w-11 rounded-full border-2 transition-transform active:scale-95',
                  c === theme.primaryColor ? 'border-slate-900 scale-110' : 'border-white',
                  'shadow ring-1 ring-slate-200',
                  locked ? 'opacity-40 cursor-not-allowed' : '',
                )}
                style={{ backgroundColor: c }}
                aria-label={`选择颜色 ${c}`}
              >
                {c === theme.primaryColor ? (
                  <span className="absolute inset-0 flex items-center justify-center text-white drop-shadow">
                    <Check size={14} />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
            <div>
              <div className="text-sm font-medium text-slate-800">自定义颜色</div>
              <div className="text-xs font-mono text-slate-400">{theme.primaryColor}</div>
            </div>
            <input
              type="color"
              aria-label="自定义主题色"
              value={theme.primaryColor}
              disabled={locked}
              onChange={(e): void => onUpdate({ primaryColor: e.target.value })}
              className="h-11 w-12 rounded border border-slate-200 bg-transparent p-0"
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div>
              <div className="text-sm font-medium text-slate-800">模板默认色</div>
              <div className="text-xs font-mono text-slate-400">{defaultPrimaryColor}</div>
            </div>
            <span
              className="h-8 w-12 rounded border border-slate-200"
              style={{ backgroundColor: defaultPrimaryColor }}
            />
          </div>
        </div>
      </Row>

      <Row label="字体">
        <div className="grid grid-cols-2 gap-2">
          {RESUME_FONT_OPTIONS.map((f) => {
            const selected = f.id === activeFamilyId
            return (
              <button
                key={f.id}
                type="button"
                onClick={(): void => onUpdate({ fontFamilyId: f.id, fontFamily: f.stack })}
                className={cn(
                  'rounded-xl border px-3 py-2 text-left transition-colors',
                  selected ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-700',
                )}
                style={{ fontFamily: f.stack }}
              >
                <span className="block text-sm font-semibold">{f.label}</span>
                <span className="mt-0.5 block text-[11px] text-slate-500">{f.description}</span>
              </button>
            )
          })}
        </div>
      </Row>
    </div>
  )
}

function LayoutPanel({ theme, onUpdate }: { readonly theme: ThemeTokens; readonly onUpdate: ThemePatcher }): ReactElement {
  const densityPresets: ReadonlyArray<{
    id: string
    label: string
    desc: string
    patch: Pick<ThemeTokens, 'fontSize' | 'lineHeight' | 'spacingScale' | 'pagePaddingVertical' | 'pagePaddingHorizontal'>
  }> = [
    {
      id: 'compact',
      label: '紧凑',
      desc: '内容较多',
      patch: { fontSize: 14, lineHeight: 1.35, spacingScale: 0.82, pagePaddingVertical: 14, pagePaddingHorizontal: 12 },
    },
    {
      id: 'standard',
      label: '标准',
      desc: '通用投递',
      patch: { fontSize: 15, lineHeight: 1.5, spacingScale: 1, pagePaddingVertical: 19, pagePaddingHorizontal: 15 },
    },
    {
      id: 'relaxed',
      label: '舒展',
      desc: '内容精简',
      patch: { fontSize: 16, lineHeight: 1.7, spacingScale: 1.22, pagePaddingVertical: 24, pagePaddingHorizontal: 18 },
    },
  ]

  return (
    <div className="space-y-6">
      <Row label="内容密度">
        <div className="grid grid-cols-3 gap-2">
          {densityPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={(): void => onUpdate(preset.patch)}
              className="rounded-xl border border-slate-200 px-2 py-3 text-center active:scale-[0.98] transition-transform"
            >
              <div className="text-sm font-semibold text-slate-900">{preset.label}</div>
              <div className="mt-1 text-[11px] text-slate-500">{preset.desc}</div>
            </button>
          ))}
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
          min={0}
          max={3}
          step={0.1}
          value={[theme.spacingScale]}
          onValueChange={([v]): void => onUpdate({ spacingScale: Number(v.toFixed(2)) })}
        />
      </Row>

      <div className="rounded-2xl border border-slate-200 p-3 space-y-5">
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
    </div>
  )
}

function OnePagePanel({
  theme,
  status,
  onUpdate,
}: {
  readonly theme: ThemeTokens
  readonly status: OnePageStatus
  readonly onUpdate: ThemePatcher
}): ReactElement {
  const titleScale: number = theme.titleScale ?? 1
  const paragraphIndent: number = theme.paragraphIndent ?? 0
  const onePageFit: boolean = theme.onePageFit ?? false
  const statusMeta = ONE_PAGE_BADGE_STYLES[status]

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold text-slate-900">单页模式</div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              自动压缩字号、行距和间距，尽量适配一页 A4。
            </p>
          </div>
          <Switch checked={onePageFit} onChange={(): void => onUpdate({ onePageFit: !onePageFit })} />
        </div>
        {onePageFit ? (
          <div className={cn('mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-medium text-white', statusMeta.bg)}>
            {statusMeta.label}
          </div>
        ) : null}
      </div>

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
    </div>
  )
}

function Switch({ checked, onChange }: { readonly checked: boolean; readonly onChange: () => void }): ReactElement {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        'relative h-11 w-14 rounded-full transition-colors shrink-0',
        checked ? 'bg-violet-600' : 'bg-slate-300',
      )}
      aria-pressed={checked}
      aria-label="单页模式"
    >
      <span
        className={cn(
          'absolute left-1.5 top-2.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )
}

function Row({ label, children }: { readonly label: string; readonly children: ReactNode }): ReactElement {
  return (
    <div>
      <div className="text-xs font-medium text-slate-700 mb-2">{label}</div>
      {children}
    </div>
  )
}
