import { useState } from 'react'
import type { ChangeEvent, ReactElement } from 'react'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { OnePageStatus } from '@/hooks/use-one-page-mode'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import * as Popover from '@radix-ui/react-popover'
import { Palette, ChevronDown, FileText } from 'lucide-react'

/**
 * ThemePanel renders controls to customize ThemeTokens.
 * It does not own state; callers pass current theme and an onUpdate callback.
 * Now using shadcn/ui components for better UX.
 */
export default function ThemePanel(props: {
  readonly theme: ThemeTokens
  readonly onUpdate: (patch: Partial<ThemeTokens>) => void
  readonly onClose: () => void
  readonly onePage?: boolean
  readonly onePageStatus?: OnePageStatus
  readonly onOnePageChange?: (isOnePage: boolean) => void
}): ReactElement {
  const theme = props.theme
  // const fonts: readonly { label: string; value: string }[] = [
  //   { label: 'Inter + Noto Sans SC', value: 'Inter, Noto Sans SC, system-ui, sans-serif' },
  //   { label: 'Noto Sans SC', value: 'Noto Sans SC, system-ui, sans-serif' },
  //   { label: 'System Sans', value: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' },
  //   { label: 'Georgia (serif)', value: 'Georgia, serif' },
  // ]
  const fontSizes: readonly { value: number; label: string }[] = [
    { value: 12, label: 'Extra Small' },
    { value: 13, label: 'Small' },
    { value: 14, label: 'Standard' },
    { value: 15, label: 'Medium (Recommended)' },
    { value: 16, label: 'Large' },
    { value: 17, label: 'Extra Large' },
    { value: 18, label: 'XXL' },
    { value: 19, label: 'XXXL' },
    { value: 20, label: 'Huge' }
  ]

  function handlePrimaryColor(e: ChangeEvent<HTMLInputElement>): void {
    props.onUpdate({ primaryColor: e.target.value })
  }

  function handleLineHeight(value: number[]): void {
    props.onUpdate({ lineHeight: value[0] })
  }

  function handleSpacing(value: number[]): void {
    props.onUpdate({ spacingScale: value[0] })
  }

  function handlePagePaddingVertical(value: number[]): void {
    props.onUpdate({ pagePaddingVertical: value[0] })
  }

  function handlePagePaddingHorizontal(value: number[]): void {
    props.onUpdate({ pagePaddingHorizontal: value[0] })
  }

  // function handleFont(value: string): void {
  //   props.onUpdate({ fontFamily: value })
  // }

  function handleFontSizeSelect(value: string): void {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) {
      props.onUpdate({ fontSize: parsed })
    }
  }

  function toggleSinglePage(): void {
    props.onOnePageChange?.(!(props.onePage ?? false))
  }

  const [primaryPopoverOpen, setPrimaryPopoverOpen] = useState(false)
  const [showPrimaryCustom, setShowPrimaryCustom] = useState(false)

  const presetColors: readonly string[] = [
    '#000000',
    '#4B5563',
    '#78350F',
    '#B45309',
    '#F59E0B',
    '#FCD34D',
    '#F97316',
    '#FB923C',
    '#B91C1C',
    '#FB7185',
    '#C026D3',
    '#E879F9',
    '#4338CA',
    '#8B5CF6',
    '#0D9488',
    '#5EEAD4',
    '#2563EB',
    '#3B82F6',
  ]

  const sectionClass: string = 'rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm'
  const labelClass: string = 'text-[11px] font-semibold text-slate-500 tracking-wide'
  const controlWrapperClass: string = 'space-y-2'
  const sliderLabelClass: string = 'flex items-center justify-between text-xs font-semibold text-slate-600'
  const selectedColor: string = theme.primaryColor.toUpperCase()

  return (
    <div className="print:hidden w-full space-y-5 text-sm">
      <section className={sectionClass}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800">Typography</h4>
            <p className="text-[11px] text-slate-500">Adjust the reading rhythm of your resume.</p>
          </div>
          <span className="text-[10px] font-medium text-violet-700/80 bg-violet-50 px-1.5 py-0.5 rounded-md">Font</span>
        </div>
        <div className="space-y-3">
          <div className={controlWrapperClass}>
            <Label className={labelClass} htmlFor="font-size-select">Font Size</Label>
            <Select value={String(theme.fontSize)} onValueChange={handleFontSizeSelect}>
              <SelectTrigger id="font-size-select" className="h-10 rounded-xl border-slate-200 bg-slate-50 shadow-none focus:ring-violet-200 transition-all">
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 bg-white shadow-lg">
                {fontSizes.map((sizeOption) => (
                  <SelectItem key={sizeOption.value} value={String(sizeOption.value)} className="rounded-lg m-1 cursor-pointer hover:bg-slate-50 focus:bg-violet-50 focus:text-violet-700">
                    {sizeOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-slate-500">Recommended 14-16 for optimal density and readability.</p>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800">Spacing & Layout</h4>
            <p className="text-[11px] text-slate-500">Control whitespace and paragraph density for balanced layout.</p>
          </div>
          <span className="text-[10px] font-medium text-sky-700/80 bg-sky-50 px-1.5 py-0.5 rounded-md">Layout</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 space-y-3">
          <button
            type="button"
            onClick={toggleSinglePage}
            aria-pressed={props.onePage ?? false}
            className="w-full flex items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{
                  color: props.onePage ? theme.primaryColor : '#64748b',
                  backgroundColor: props.onePage ? `${theme.primaryColor}14` : '#ffffff'
                }}
              >
                <FileText size={15} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800">One-Page Mode</div>
                <p className="text-[11px] text-slate-500">Auto-compress layout to fit content on a single page.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="text-[10px] font-semibold"
                style={{ color: props.onePage ? theme.primaryColor : '#64748b' }}
              >
                {props.onePage ? 'On' : 'Off'}
              </span>
              <span
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{ backgroundColor: props.onePage ? theme.primaryColor : '#cbd5e1' }}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${props.onePage ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </span>
            </div>
          </button>
          {props.onePage ? (
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2 py-1 text-[10px] font-semibold"
                style={{
                  color: theme.primaryColor,
                  backgroundColor: `${theme.primaryColor}14`
                }}
              >
                Enabled
              </span>
              {props.onePageStatus === 'fit' ? (
                <span className="rounded-full px-2 py-1 text-[10px] font-medium text-emerald-700 bg-emerald-50">Fitted</span>
              ) : null}
              {props.onePageStatus === 'fitting' ? (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium text-slate-600 bg-white border border-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: theme.primaryColor }} />
                  Adjusting
                </span>
              ) : null}
              {props.onePageStatus === 'overflow' ? (
                <span className="rounded-full px-2 py-1 text-[10px] font-medium text-rose-700 bg-rose-50">Still Overflows</span>
              ) : null}
            </div>
          ) : null}
        </div>
        {props.onePage && (
          <p className="text-[11px] text-slate-500">Disabling will restore layout settings from before enabling.</p>
        )}
        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <div className={sliderLabelClass}>
              <span>Line Height</span>
              <span className="text-violet-700 font-mono bg-violet-50 px-1.5 rounded text-[10px]">{theme.lineHeight.toFixed(1)}</span>
            </div>
            <Slider
              id="line-height"
              min={1.0}
              max={3.0}
              step={0.1}
              value={[theme.lineHeight]}
              onValueChange={handleLineHeight}
              className="py-1"
            />
            <p className="text-[11px] text-slate-500">Larger values are more spacious but fit less content.</p>
          </div>
          <div className="space-y-2">
            <div className={sliderLabelClass}>
              <span>Section Spacing</span>
              <span className="text-sky-700 font-mono bg-sky-50 px-1.5 rounded text-[10px]">{theme.spacingScale.toFixed(1)}x</span>
            </div>
            <Slider
              id="spacing-scale"
              min={0}
              max={3.0}
              step={0.1}
              value={[theme.spacingScale]}
              onValueChange={handleSpacing}
              className="py-1"
            />
            <p className="text-[11px] text-slate-500">Smaller is more compact, larger is more spacious.</p>
          </div>
          <div className="space-y-2">
            <div className={sliderLabelClass}>
              <span>Vertical Margin</span>
              <span className="text-emerald-600 font-mono bg-emerald-500/10 px-1.5 rounded text-[10px]">{theme.pagePaddingVertical.toFixed(0)}mm</span>
            </div>
            <Slider
              id="page-padding-vertical"
              min={8}
              max={35}
              step={1}
              value={[theme.pagePaddingVertical]}
              onValueChange={handlePagePaddingVertical}
              className="py-1"
            />
            <p className="text-[11px] text-slate-500">Affects top/bottom whitespace and content capacity.</p>
          </div>
          <div className="space-y-2">
            <div className={sliderLabelClass}>
              <span>Horizontal Margin</span>
              <span className="text-cyan-700 font-mono bg-cyan-50 px-1.5 rounded text-[10px]">{theme.pagePaddingHorizontal.toFixed(0)}mm</span>
            </div>
            <Slider
              id="page-padding-horizontal"
              min={8}
              max={25}
              step={1}
              value={[theme.pagePaddingHorizontal]}
              onValueChange={handlePagePaddingHorizontal}
              className="py-1"
            />
            <p className="text-[11px] text-slate-500">Fine-tune content width and side margins.</p>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800">Color Style</h4>
            <p className="text-[11px] text-slate-500">Primary color affects headings, highlights, and overall aesthetic.</p>
          </div>
          <span className="text-[10px] font-medium text-rose-700/80 bg-rose-50 px-1.5 py-0.5 rounded-md">Color</span>
        </div>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className={labelClass}>Primary Color</Label>
            <Popover.Root open={primaryPopoverOpen} onOpenChange={setPrimaryPopoverOpen}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  aria-label="Select primary color"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer transition-colors hover:bg-white hover:border-slate-300"
                >
                  <div
                    className="h-6 w-12 rounded-md shadow-sm border border-black/5"
                    style={{ backgroundColor: theme.primaryColor }}
                  />
                  <div className="flex-1 text-left">
                    <div className="text-xs font-medium text-slate-700">Current Color</div>
                    <div className="text-[11px] font-mono text-slate-500">{selectedColor}</div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="z-[100] w-72 bg-white rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200"
                  sideOffset={8}
                  align="end"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-800">Choose Primary Color</div>
                    <p className="text-xs text-slate-500">Dark or neutral colors are recommended for stable print and screen rendering.</p>
                  </div>
                  <div className="grid grid-cols-6 gap-2.5">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={(): void => {
                          props.onUpdate({ primaryColor: color })
                          setPrimaryPopoverOpen(false)
                        }}
                        className="h-8 rounded-full border border-black/5 transition-all hover:scale-110"
                        aria-label={`Select color ${color}`}
                        aria-pressed={theme.primaryColor === color}
                        style={{
                          backgroundColor: color,
                          boxShadow: theme.primaryColor === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : 'none'
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={(): void => setShowPrimaryCustom(!showPrimaryCustom)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium text-xs transition-colors hover:bg-white hover:border-slate-300"
                  >
                    <Palette className="h-3.5 w-3.5" />
                    <span>Custom Color</span>
                  </button>
                  {showPrimaryCustom ? (
                    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <Label className="text-[11px] font-medium text-slate-600" htmlFor="primary-color-input">Enter hex color</Label>
                      <div className="flex items-center gap-3">
                      <input
                        id="primary-color"
                        type="color"
                        value={theme.primaryColor}
                        onChange={(e): void => handlePrimaryColor(e)}
                        className="h-8 w-12 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                      />
                      <Input
                        id="primary-color-input"
                        type="text"
                        value={theme.primaryColor}
                        onChange={(e): void => handlePrimaryColor(e)}
                        className="flex-1 h-8 rounded-lg bg-white border-slate-200 shadow-none text-xs font-mono text-slate-700 focus-visible:ring-violet-200"
                        placeholder="#8B5CF6"
                      />
                      </div>
                    </div>
                  ) : null}
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>
      </section>
    </div>
  )
}
