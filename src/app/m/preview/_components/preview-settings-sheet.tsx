'use client'

import { type ReactElement, type ReactNode } from 'react'
import { Check, RotateCcw, X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { TEMPLATE_REGISTRY } from '@/templates/template-loader'
import type { OnePageStatus } from '@/hooks/use-one-page-mode'
import { cn } from '@/lib/utils'

export type SettingsTab = 'template' | 'appearance' | 'layout' | 'one-page'

export interface ThemePatcher {
  (patch: Partial<ThemeTokens>): void
}

export const DEFAULT_PREVIEW_THEME: ThemeTokens = {
  primaryColor: '#111827',
  textColor: '#111827',
  fontFamily: 'Inter, Noto Sans SC, system-ui, sans-serif',
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
    onReset,
    onTabChange,
    onSelectTemplate,
    onUpdateTheme,
  } = props

  return (
    <BottomSheet open={open} confirming={confirming} onClose={onClose} onConfirm={onConfirm} onReset={onReset}>
      <Tabs value={tab} onValueChange={(v): void => onTabChange(v as SettingsTab)} className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 bg-white px-4 pb-3 pt-3">
          <TabsList className="grid h-10 w-full grid-cols-4 rounded-xl bg-slate-100 p-1">
          <TabsTrigger value="template">模板</TabsTrigger>
          <TabsTrigger value="appearance">外观</TabsTrigger>
          <TabsTrigger value="layout">版式</TabsTrigger>
          <TabsTrigger value="one-page">单页</TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white px-4 pb-3">
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
  readonly onReset: () => void
  readonly children: ReactNode
}

function BottomSheet({ open, onClose, onConfirm, confirming, onReset, children }: BottomSheetProps): ReactElement {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/[0.08] transition-opacity',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300',
          'h-[62vh] max-h-[540px] flex flex-col',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-center px-5 pt-2 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-slate-300" />
        </div>
        <div className="flex items-center justify-between px-5 pb-2 shrink-0 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">调整样式</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 bg-white">{children}</div>
        <div
          className="shrink-0 border-t border-slate-100 bg-white px-4 py-2.5"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}
        >
          <div className="grid grid-cols-[1fr_1.4fr] gap-3">
            <button
              type="button"
              onClick={onReset}
              className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={16} />
              恢复默认
            </button>
            <button
              type="button"
              onClick={(): void => { void onConfirm() }}
              disabled={confirming}
              className="h-11 rounded-xl bg-violet-600 text-sm font-medium text-white shadow-md shadow-violet-600/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5 disabled:opacity-70"
            >
              <Check size={17} />
              {confirming ? '保存中...' : '完成'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function TemplatePanel({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }): ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3">
      {TEMPLATE_IDS.map((id) => {
        const cfg = TEMPLATE_REGISTRY[id]
        const isActive = id === activeId
        return (
          <button
            key={id}
            type="button"
            onClick={(): void => onSelect(id)}
            className={cn(
              'relative flex flex-col items-stretch gap-2 rounded-xl border bg-white p-2 text-left transition-all active:scale-[0.99]',
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
              <div className="text-sm font-semibold text-slate-900 truncate">{cfg.name}</div>
              <div className="mt-0.5 text-[11px] text-slate-500 truncate">{cfg.description}</div>
            </div>
          </button>
        )
      })}
    </div>
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
  const activeFamily = FONT_FAMILIES.find((f) => theme.fontFamily.includes(f.stack.split(',')[0])) ?? FONT_FAMILIES[0]

  return (
    <div className="space-y-6">
      <Row label="主题色">
        <div className="space-y-3">
          {locked ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
              当前模板使用固定品牌色，切换其他模板后可自定义颜色。
            </div>
          ) : null}
          <div className="grid grid-cols-9 gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                disabled={locked}
                onClick={(): void => onUpdate({ primaryColor: c })}
                className={cn(
                  'relative h-8 w-8 rounded-full border-2 transition-transform active:scale-95',
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
              value={theme.primaryColor}
              disabled={locked}
              onChange={(e): void => onUpdate({ primaryColor: e.target.value })}
              className="h-9 w-12 rounded border border-slate-200 bg-transparent p-0"
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
        <div className="grid grid-cols-3 gap-2">
          {FONT_FAMILIES.map((f) => {
            const selected = f.id === activeFamily.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={(): void => onUpdate({ fontFamily: f.stack })}
                className={cn(
                  'h-11 rounded-xl border text-sm font-medium transition-colors',
                  selected ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-700',
                )}
                style={{ fontFamily: f.stack }}
              >
                {f.label}
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
          min={0.6}
          max={1.6}
          step={0.05}
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
        'relative h-7 w-12 rounded-full transition-colors shrink-0',
        checked ? 'bg-violet-600' : 'bg-slate-300',
      )}
      aria-pressed={checked}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
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
