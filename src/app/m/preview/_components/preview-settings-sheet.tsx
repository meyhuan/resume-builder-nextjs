'use client'

/* Hallmark · component: mobile-settings-sheet · genre: modern-minimal · theme: existing violet
 * states: default · hover · focus · active · disabled · loading · error · success (saved preview)
 * pre-emit critique: P4 H4 E4 S4 R5 V3 · component scope, no page macrostructure changes
 */

import { TemplateBrowser } from '@/components/templates/template-browser'
import { TemplateCover } from '@/components/templates/template-cover'
import { useRef, useEffect, type ComponentProps, type ReactElement, type ReactNode } from 'react'
import { Sheet, type SheetRef } from 'react-modal-sheet'
import { motion, useMotionValue, useMotionValueEvent, type MotionValue } from 'motion/react'
import { Check, ChevronDown, ChevronUp, LoaderCircle, Palette, RotateCcw } from 'lucide-react'
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
  overflow: { bg: 'bg-rose-600/90', label: '无法完整适配一页' },
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
    <BottomSheet key={open ? 'open' : 'closed'} open={open} confirming={confirming} saveError={saveError} selectedName={TEMPLATES.find((item) => item.id === templateId)?.name ?? templateId} onClose={onClose} onConfirm={onConfirm}>
      <Tabs value={tab} onValueChange={(v): void => onTabChange(v as SettingsTab)} className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 bg-white px-4 py-1.5">
          <TabsList className="grid h-10 w-full grid-cols-4 rounded-xl bg-slate-100/90 p-1">
            <TabsTrigger value="template" className="h-full rounded-lg text-[13px] font-medium text-slate-500 transition-all data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=active]:text-violet-700 data-[state=active]:shadow-sm">模板</TabsTrigger>
            <TabsTrigger value="appearance" className="h-full rounded-lg text-[13px] font-medium text-slate-500 transition-all data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=active]:text-violet-700 data-[state=active]:shadow-sm">外观</TabsTrigger>
            <TabsTrigger value="layout" className="h-full rounded-lg text-[13px] font-medium text-slate-500 transition-all data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=active]:text-violet-700 data-[state=active]:shadow-sm">版式</TabsTrigger>
            <TabsTrigger value="one-page" className="h-full rounded-lg text-[13px] font-medium text-slate-500 transition-all data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=active]:text-violet-700 data-[state=active]:shadow-sm">单页</TabsTrigger>
          </TabsList>
        </div>

        {/* Explicit styled mode prevents v5.7's shared scroller styles retaining overflow:clip.
            Content has no decorative library styles; our existing UI stays intact. */}
        <Sheet.Content key={tab} unstyled={false} disableScroll={({ currentSnap }) => currentSnap !== 3}
          className="min-h-0 flex-1 bg-white" scrollClassName="px-4 pb-4 pt-1">
          <div onPointerDown={event => {
            // Let native controls and Radix sliders own their pointer gesture.
            if ((event.target as HTMLElement).closest('input, select, textarea, [data-settings-slider]')) event.stopPropagation()
          }}>
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
            <div className="mt-3 pt-1">
              <button
                type="button"
                onClick={onReset}
                className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-violet-600"
              >
                <RotateCcw size={14} aria-hidden="true" />重置当前模板全部样式
              </button>
            </div>
          )}
          </div>
        </Sheet.Content>
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

// Fractions are relative to the maximum sheet height (75dvh).
// The library requires a closed point at 0; disableDismiss keeps dragging at 30% or above.
const PANEL_SNAPS = [0, 30 / 75, 50 / 75, 1]
const PANEL_PERCENTAGES = [0, 30, 50, 75]

function BottomSheet(props: BottomSheetProps): ReactElement {
  const visibleHeight = useMotionValue(0)
  const sheetRef = useRef<SheetRef>(null)
  if (!props.open) return <></>
  return <>
    <motion.div aria-hidden="true" className="shrink-0" style={{ height: visibleHeight }} />
    <Sheet ref={sheetRef} isOpen onClose={props.onClose} initialSnap={2} snapPoints={PANEL_SNAPS}
      // Opening can precede the first size measurement; enforce the measured initial stop.
      onOpenEnd={() => sheetRef.current?.snapTo(2)}
      detent="full" disableDismiss disableScrollLocking disableDrag={props.confirming} avoidKeyboard={false}
      unstyled style={{ top: 'auto', height: '75dvh', zIndex: 40 }}>
      <Sheet.Container>
        <SettingsSheetBody {...props} visibleHeight={visibleHeight} />
      </Sheet.Container>
    </Sheet>
  </>
}

function SettingsSheetBody({ open, onClose, onConfirm, confirming, saveError, selectedName, children, visibleHeight }: BottomSheetProps & { visibleHeight: MotionValue<number> }): ReactElement {
  const { currentSnap = 2, height, snapTo, yInverted } = Sheet.useContext()
  const measuredHeight = useRef(height)
  useEffect(() => {
    if (measuredHeight.current > 0 && height > 0 && measuredHeight.current !== height) {
      snapTo(currentSnap)
    }
    measuredHeight.current = height
  }, [height, currentSnap, snapTo])
  // Reserve the actual visible sheet height in the preview's flex layout on every
  // animation frame. The preview and controls retain independent scroll areas.
  useMotionValueEvent(yInverted, 'change', value => visibleHeight.set(value))
  useEffect(() => { visibleHeight.set(yInverted.get()) }, [visibleHeight, yInverted])
  const heightPercent = PANEL_PERCENTAGES[currentSnap]
  const previousFocus = useRef<HTMLElement | null>(null)
  const contentRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    contentRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus({ preventScroll: true })
    return () => { previousFocus.current?.focus({ preventScroll: true }) }
  }, [open])
  if (!open) return <></>
  const isExpanded = heightPercent > 50
  return (
    <motion.section ref={contentRef} role="dialog" aria-modal="false" aria-label="调整样式" aria-busy={confirming}
      data-settings-panel
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !confirming) {
          event.stopPropagation()
          onClose()
        }
      }}
      className="relative z-40 flex min-h-0 w-full shrink-0 flex-col rounded-t-2xl border-t border-slate-200/80 bg-white shadow-[0_-8px_30px_rgba(15,23,42,0.12)] [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-violet-600 [&_button]:disabled:opacity-50"
      style={{ height: yInverted, overflow: 'clip', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <Sheet.Header className="relative flex shrink-0 touch-none items-center justify-between gap-2 border-b border-slate-100 px-4 pt-3 pb-1">
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-slate-300/90" />
        <div role="slider" tabIndex={confirming ? -1 : 0} aria-label="调整面板高度" aria-orientation="vertical"
          aria-valuemin={30} aria-valuemax={75} aria-valuenow={Math.round(heightPercent)} aria-valuetext={`${Math.round(heightPercent)}%`} aria-disabled={confirming}
          className="flex min-h-11 min-w-0 flex-1 touch-none cursor-ns-resize select-none items-center gap-2 rounded-lg text-xs text-slate-500 focus-visible:outline-2 focus-visible:outline-violet-600"
          onKeyDown={(event) => {
            if (confirming) return
            const next = event.key === 'ArrowUp' ? Math.min(3, currentSnap + 1) : event.key === 'ArrowDown' ? Math.max(1, currentSnap - 1) : event.key === 'Home' ? 1 : event.key === 'End' ? 3 : null
            if (next !== null) { event.preventDefault(); snapTo(next) }
          }}>
          <span className="text-[15px] font-semibold tracking-tight text-slate-900">调整样式</span>
          <span className="sr-only">上下拖动调整高度</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5" onPointerDown={event => event.stopPropagation()}>
          <button type="button" disabled={confirming} onClick={() => snapTo(isExpanded ? 1 : 3)}
            aria-label={isExpanded ? '收起调整面板' : '展开调整面板'} aria-expanded={isExpanded}
            className="group inline-flex min-h-11 shrink-0 items-center justify-center rounded-full">
            <span className="inline-flex h-8 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-600 transition-colors group-hover:bg-slate-100 group-active:scale-95">
              {isExpanded ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronUp size={14} aria-hidden="true" />}
              {isExpanded ? '收起' : '展开'}
            </span>
          </button>
          <span className="sr-only">已选模板：<span className="font-medium text-slate-900">{selectedName}</span></span>
          <button type="button" onClick={() => { void onConfirm() }} disabled={confirming}
            className="group inline-flex min-h-11 shrink-0 items-center justify-center rounded-full">
            <span className="inline-flex h-8 items-center justify-center rounded-full bg-violet-600 px-3.5 text-xs font-semibold text-white shadow-sm shadow-violet-600/25 transition-all group-hover:bg-violet-700 group-active:scale-95">
              {confirming ? <LoaderCircle size={15} className="animate-spin" aria-label="保存中…" /> : '完成'}
            </span>
          </button>
        </div>
      </Sheet.Header>
      {saveError && <p role="alert" className="bg-red-50 px-4 py-1.5 text-xs text-red-700">{saveError}</p>}
      <div className="min-h-0 flex-1" inert={confirming || undefined}>{children}</div>
    </motion.section>
  )
}

function TemplatePanel({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }): ReactElement {
  return (
    <TemplateBrowser analyticsEntry="mobile_preview" templates={TEMPLATES} currentId={activeId} compact gridClassName="grid grid-cols-3 gap-2.5"
      renderTemplate={(cfg, wordBadge) => {
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
              'relative min-w-0 flex flex-col items-stretch gap-1.5 rounded-xl border bg-white p-1.5 text-left transition-all active:scale-[0.98]',
              isActive
                ? 'border-violet-600 bg-violet-50/35 ring-1 ring-violet-600/20 shadow-xs'
                : 'border-slate-200 hover:border-slate-300',
            )}
          >
            {isActive ? (
              <span className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white shadow-sm">
                <Check size={13} strokeWidth={2.5} />
              </span>
            ) : null}
            <div className="flex h-28 items-center justify-center overflow-hidden rounded-lg bg-slate-50 p-1">
              {cfg.preview ? (
                <TemplateCover src={cfg.preview} alt={cfg.name} className="h-full w-full object-contain" />
              ) : (
                <span className="text-xs text-slate-400">{cfg.name}</span>
              )}
            </div>
            <div className="px-0.5 pb-0.5">
              <div className="truncate text-xs font-semibold text-slate-900">{cfg.name}</div>
              {wordBadge}
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
  const isCustomColor = !PRESET_COLORS.some((c) => c.toLowerCase() === theme.primaryColor.toLowerCase())
  const isDefaultColor = theme.primaryColor.toLowerCase() === defaultPrimaryColor.toLowerCase()

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">主题色</span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] uppercase text-slate-500">
              {theme.primaryColor}
            </span>
          </div>
          {!locked ? (
            isDefaultColor ? (
              <span className="text-[11px] text-slate-400">当前为模板默认色</span>
            ) : (
              <button
                type="button"
                onClick={(): void => onUpdate({ primaryColor: defaultPrimaryColor })}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full border border-black/10"
                  style={{ backgroundColor: defaultPrimaryColor }}
                />
                恢复默认
              </button>
            )
          ) : null}
        </div>

        {locked ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            当前模板使用固定品牌色，切换其他模板后可自定义颜色。
          </div>
        ) : null}

        <div className="grid grid-cols-5 justify-items-center gap-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-2.5">
          {PRESET_COLORS.map((c) => {
            const active = c.toLowerCase() === theme.primaryColor.toLowerCase()
            return (
              <button
                key={c}
                type="button"
                disabled={locked}
                onClick={(): void => onUpdate({ primaryColor: c })}
                aria-label={`选择颜色 ${c}`}
                aria-pressed={active}
                className={cn(
                  'relative flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-95',
                  locked ? 'cursor-not-allowed opacity-40' : '',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border border-black/10 shadow-xs transition-all',
                    active ? 'scale-105 ring-2 ring-violet-600 ring-offset-2 ring-offset-slate-50' : '',
                  )}
                  style={{ backgroundColor: c }}
                >
                  {active ? <Check size={14} strokeWidth={2.5} className="text-white drop-shadow" /> : null}
                </span>
              </button>
            )
          })}

          <label
            className={cn(
              'relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-transform active:scale-95',
              locked ? 'cursor-not-allowed opacity-40' : '',
            )}
            title="自定义颜色"
          >
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full shadow-xs transition-all',
                isCustomColor
                  ? 'border border-black/10 ring-2 ring-violet-600 ring-offset-2 ring-offset-slate-50'
                  : 'border border-slate-200 bg-white text-slate-600',
              )}
              style={isCustomColor ? { backgroundColor: theme.primaryColor } : undefined}
            >
              <Palette size={14} className={isCustomColor ? 'text-white drop-shadow' : 'text-slate-600'} aria-hidden="true" />
            </span>
            <input
              type="color"
              aria-label="自定义主题色"
              value={theme.primaryColor}
              disabled={locked}
              onChange={(e): void => onUpdate({ primaryColor: e.target.value })}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-700">字体风格</div>
        <div className="grid grid-cols-2 gap-2.5">
          {RESUME_FONT_OPTIONS.map((f) => {
            const selected = f.id === activeFamilyId
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={selected}
                onClick={(): void => onUpdate({ fontFamilyId: f.id, fontFamily: f.stack })}
                className={cn(
                  'relative rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.98]',
                  selected
                    ? 'border-violet-600 bg-violet-50/70 text-violet-950 ring-1 ring-violet-600/15'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                )}
                style={f.id === 'serif' ? { fontFamily: '"Songti SC", "STSong", "SimSun", Georgia, serif' } : undefined}
              >
                <span className="flex items-center justify-between gap-1 text-sm font-semibold">
                  <span>{f.label}</span>
                  {selected ? <Check size={14} strokeWidth={2.5} className="shrink-0 text-violet-600" aria-hidden="true" /> : null}
                </span>
                <span className="mt-0.5 block text-[11px] leading-4 tracking-tight text-slate-500">{f.description}</span>
              </button>
            )
          })}
        </div>
      </div>
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
      desc: '适合内容较多',
      patch: { fontSize: 14, lineHeight: 1.35, spacingScale: 0.82, pagePaddingVertical: 14, pagePaddingHorizontal: 12 },
    },
    {
      id: 'standard',
      label: '标准',
      desc: '通用投递推荐',
      patch: { fontSize: 15, lineHeight: 1.5, spacingScale: 1, pagePaddingVertical: 19, pagePaddingHorizontal: 15 },
    },
    {
      id: 'relaxed',
      label: '舒展',
      desc: '适合内容精简',
      patch: { fontSize: 16, lineHeight: 1.7, spacingScale: 1.22, pagePaddingVertical: 24, pagePaddingHorizontal: 18 },
    },
  ]

  const matchedPreset = densityPresets.find((preset) =>
    Object.entries(preset.patch).every(([key, value]) => theme[key as keyof ThemeTokens] === value),
  )

  return (
    <div className="space-y-2.5" data-layout-controls>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">内容密度</span>
          {matchedPreset ? (
            <span className="text-[11px] text-slate-400">{matchedPreset.desc}</span>
          ) : (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
              已自定义微调
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100/90 p-1">
          {densityPresets.map((preset) => {
            const active = matchedPreset?.id === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                onClick={(): void => onUpdate(preset.patch)}
                aria-pressed={active}
                className={cn(
                  'min-h-9 rounded-lg px-2 py-1.5 text-center text-xs transition-all active:scale-[0.98]',
                  active
                    ? 'bg-white font-semibold text-violet-700 shadow-sm'
                    : 'font-medium text-slate-600 hover:text-slate-900',
                )}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/75 px-3.5 py-0.5">
        <LayoutRow label="字号" value={`${theme.fontSize}px`}>
          <TouchSlider
            min={12}
            max={18}
            step={1}
            value={[theme.fontSize]}
            onValueChange={([v]): void => onUpdate({ fontSize: v })}
          />
        </LayoutRow>

        <LayoutRow label="行距" value={`${theme.lineHeight.toFixed(2)}`}>
          <TouchSlider
            min={1.2}
            max={2}
            step={0.05}
            value={[theme.lineHeight]}
            onValueChange={([v]): void => onUpdate({ lineHeight: Number(v.toFixed(2)) })}
          />
        </LayoutRow>

        <LayoutRow label="模块间距" value={`${theme.spacingScale.toFixed(2)}×`}>
          <TouchSlider
            min={0}
            max={3}
            step={0.1}
            value={[theme.spacingScale]}
            onValueChange={([v]): void => onUpdate({ spacingScale: Number(v.toFixed(2)) })}
          />
        </LayoutRow>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/75 px-3.5 py-0.5">
        <LayoutRow label="上下边距" value={`${theme.pagePaddingVertical}mm`}>
          <TouchSlider
            min={10}
            max={35}
            step={1}
            value={[theme.pagePaddingVertical]}
            onValueChange={([v]): void => onUpdate({ pagePaddingVertical: v })}
          />
        </LayoutRow>

        <LayoutRow label="左右边距" value={`${theme.pagePaddingHorizontal}mm`}>
          <TouchSlider
            min={8}
            max={30}
            step={1}
            value={[theme.pagePaddingHorizontal]}
            onValueChange={([v]): void => onUpdate({ pagePaddingHorizontal: v })}
          />
        </LayoutRow>
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
    <div className="space-y-3">
      <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">单页模式</div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              自动压缩字号、行距和间距，完整适配一页 A4；内容过多时会阻止一页导出。
            </p>
          </div>
          <Switch checked={onePageFit} onChange={(): void => onUpdate({ onePageFit: !onePageFit })} />
        </div>
        {onePageFit ? (
          <div className={cn('mt-2.5 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium text-white', statusMeta.bg)}>
            {statusMeta.label}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/75 px-3.5 py-1">
        <LayoutRow label="标题倍率" value={`${titleScale.toFixed(2)}×`}>
          <TouchSlider
            min={0.9}
            max={1.6}
            step={0.05}
            value={[titleScale]}
            onValueChange={([v]): void => onUpdate({ titleScale: Number(v.toFixed(2)) })}
          />
        </LayoutRow>

        <LayoutRow label="首行缩进" value={`${paragraphIndent}em`}>
          <TouchSlider
            min={0}
            max={2}
            step={1}
            value={[paragraphIndent]}
            onValueChange={([v]): void => onUpdate({ paragraphIndent: v })}
          />
        </LayoutRow>
      </div>
    </div>
  )
}

function Switch({ checked, onChange }: { readonly checked: boolean; readonly onChange: () => void }): ReactElement {
  return (
    <button
      type="button"
      onClick={onChange}
      className="inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-full"
      aria-pressed={checked}
      aria-label="单页模式"
    >
      {/* Keep a 44px touch target around the original 48×28px track. */}
      <span aria-hidden="true" className={cn('relative h-7 w-12 rounded-full transition-colors', checked ? 'bg-violet-600' : 'bg-slate-300')}>
        <span className={cn('absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0')} />
      </span>
    </button>
  )
}

function TouchSlider({ className, ...props }: ComponentProps<typeof Slider>): ReactElement {
  return (
    <Slider
      {...props}
      data-settings-slider
      className={cn(
        'py-2.5 [&>span:first-child]:h-1.5 [&>span:first-child]:bg-slate-200/90 [&_[role=slider]]:h-[18px] [&_[role=slider]]:w-[18px] [&_[role=slider]]:border-2 [&_[role=slider]]:border-violet-600 [&_[role=slider]]:bg-white [&_[role=slider]]:shadow-[0_1px_4px_rgba(124,58,237,0.28)]',
        className,
      )}
    />
  )
}

function LayoutRow({ label, value, children }: { label: string; value?: string; children: ReactNode }): ReactElement {
  return (
    <div className={cn('grid min-h-10 items-center gap-3', value ? 'grid-cols-[4.25rem_minmax(0,1fr)_3.25rem]' : 'grid-cols-[4.25rem_minmax(0,1fr)]')}>
      <div className="whitespace-nowrap text-[13px] font-medium text-slate-600">{label}</div>
      <div className="min-w-0">{children}</div>
      {value && <output className="text-right text-[13px] font-semibold tabular-nums text-slate-800">{value}</output>}
    </div>
  )
}
