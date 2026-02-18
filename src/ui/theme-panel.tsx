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
  const fontSizes: readonly number[] = [12, 13, 14, 15, 16, 17, 18, 19, 20]

  function handlePrimaryColor(e: ChangeEvent<HTMLInputElement>): void {
    props.onUpdate({ primaryColor: e.target.value })
  }

  function handleLineHeight(value: number[]): void {
    props.onUpdate({ lineHeight: value[0] })
  }

  function handleSpacing(value: number[]): void {
    props.onUpdate({ spacingScale: value[0] })
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

  const sectionClass: string = 'rounded-[20px] bg-white border border-slate-50 p-5 space-y-4 shadow-sm transition-all duration-300 hover:shadow-md'
  const labelClass: string = 'text-[11px] font-bold text-slate-400 uppercase tracking-wider'
  const controlWrapperClass: string = 'space-y-2.5'
  const sliderLabelClass: string = 'flex items-center justify-between text-xs font-semibold text-slate-600'

  return (
    <div className="print:hidden w-full space-y-5 text-sm">
      <section className={sectionClass}>
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-bold text-slate-900">文字排版</h4>
          <span className="text-[10px] font-bold text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full">Typography</span>
        </div>
        <div className="space-y-4">
          {/* <div className={controlWrapperClass}>
            <Label className={labelClass} htmlFor="font-family">字体家族</Label>
            <Select value={theme.fontFamily} onValueChange={handleFont}>
              <SelectTrigger id="font-family" className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:ring-violet-500/20">
                <SelectValue placeholder="选择字体" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                {fonts.map((f) => (
                  <SelectItem key={f.value} value={f.value} className="rounded-lg m-1">
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div> */}
          <div className={controlWrapperClass}>
            <Label className={labelClass} htmlFor="font-size-select">全局字号</Label>
            <Select value={String(theme.fontSize)} onValueChange={handleFontSizeSelect}>
              <SelectTrigger id="font-size-select" className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:ring-violet-500/20">
                <SelectValue placeholder="字号" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                {fontSizes.map((size) => (
                  <SelectItem key={size} value={String(size)} className="rounded-lg m-1">
                    {size}px
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-bold text-slate-900">间距布局</h4>
          <span className="text-[10px] font-bold text-fuchsia-500 bg-fuchsia-50 px-2 py-0.5 rounded-full">Layout</span>
        </div>
        <button
          type="button"
          onClick={toggleSinglePage}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 transition-all duration-300 group hover:scale-[1.02]"
          style={{
            borderColor: props.onePage ? theme.primaryColor : '#f1f5f9',
            backgroundColor: props.onePage ? `${theme.primaryColor}08` : '#f8fafc'
          }}
        >
          <FileText
            size={18}
            className="transition-transform duration-300 group-hover:scale-110"
            style={{ color: props.onePage ? theme.primaryColor : '#94a3b8' }}
          />
          <span
            className="text-sm font-bold"
            style={{ color: props.onePage ? theme.primaryColor : '#64748b' }}
          >
            一页模式
          </span>
          {props.onePage && props.onePageStatus === 'fit' && (
            <span className="ml-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">已适配</span>
          )}
          {props.onePage && props.onePageStatus === 'fitting' && (
            <div className="w-1.5 h-1.5 rounded-full animate-pulse ml-1" style={{ backgroundColor: theme.primaryColor }} />
          )}
          {props.onePage && props.onePageStatus === 'overflow' && (
            <span className="ml-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">内容超出</span>
          )}
        </button>
        {props.onePage && (
          <p className="text-[11px] text-slate-400 text-center -mt-1">关闭后将恢复为开启前的排版设置</p>
        )}
        <div className="space-y-5 pt-2">
          <div className="space-y-3">
            <div className={sliderLabelClass}>
              <span>行高 (Line Height)</span>
              <span className="text-violet-600 font-mono">{theme.lineHeight.toFixed(1)}</span>
            </div>
            <Slider
              id="line-height"
              min={1.0}
              max={3.0}
              step={0.1}
              value={[theme.lineHeight]}
              onValueChange={handleLineHeight}
              className="py-2"
            />
          </div>
          <div className="space-y-3">
            <div className={sliderLabelClass}>
              <span>模块间距 (Spacing)</span>
              <span className="text-fuchsia-600 font-mono">{theme.spacingScale.toFixed(1)}x</span>
            </div>
            <Slider
              id="spacing-scale"
              min={0}
              max={3.0}
              step={0.1}
              value={[theme.spacingScale]}
              onValueChange={handleSpacing}
              className="py-2"
            />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-bold text-slate-900">色彩风格</h4>
          <span className="text-[10px] font-bold text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full">Colors</span>
        </div>
        <div className="space-y-5">
          <div className="space-y-2.5">
            <Label className={labelClass}>主题主色 (Primary)</Label>
            <Popover.Root open={primaryPopoverOpen} onOpenChange={setPrimaryPopoverOpen}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-xl border border-slate-100 bg-slate-50/50 cursor-pointer transition-all hover:bg-white hover:border-violet-200 hover:shadow-sm"
                >
                  <div
                    className="h-7 w-14 rounded-lg shadow-sm border border-white/20"
                    style={{ backgroundColor: theme.primaryColor }}
                  />
                  <span className="text-xs font-mono text-slate-500 flex-1 text-left">{theme.primaryColor.toUpperCase()}</span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="z-[100] w-72 bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-100 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in duration-200"
                  sideOffset={12}
                  align="end"
                >
                  <div className="grid grid-cols-6 gap-2.5">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={(): void => {
                          props.onUpdate({ primaryColor: color })
                          setPrimaryPopoverOpen(false)
                        }}
                        className="h-8 rounded-full border-2 transition-all hover:scale-125 active:scale-95"
                        style={{
                          backgroundColor: color,
                          borderColor: theme.primaryColor === color ? 'white' : 'transparent',
                          boxShadow: theme.primaryColor === color ? `0 0 0 2px ${color}` : 'none'
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={(): void => setShowPrimaryCustom(!showPrimaryCustom)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-600 font-bold text-xs transition-all hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Palette className="h-4 w-4" />
                    <span>自定义颜色</span>
                  </button>
                  {showPrimaryCustom ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white shadow-inner">
                      <input
                        id="primary-color"
                        type="color"
                        value={theme.primaryColor}
                        onChange={(e): void => handlePrimaryColor(e)}
                        className="h-9 w-12 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                      />
                      <Input
                        type="text"
                        value={theme.primaryColor}
                        onChange={(e): void => handlePrimaryColor(e)}
                        className="flex-1 h-9 rounded-lg bg-slate-50 border-0 text-xs font-mono"
                      />
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
