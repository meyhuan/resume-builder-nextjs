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
    { value: 12, label: '极小' },
    { value: 13, label: '偏小' },
    { value: 14, label: '标准' },
    { value: 15, label: '中等 (推荐)' },
    { value: 16, label: '偏大' },
    { value: 17, label: '大号' },
    { value: 18, label: '特大' },
    { value: 19, label: '超大' },
    { value: 20, label: '巨型' }
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

  const sectionClass: string = 'rounded-2xl bg-white/60 backdrop-blur-md border border-white shadow-sm p-5 space-y-4 transition-all duration-200 hover:bg-white/80'
  const labelClass: string = 'text-[11px] font-bold text-slate-400 uppercase tracking-wider'
  const controlWrapperClass: string = 'space-y-2.5'
  const sliderLabelClass: string = 'flex items-center justify-between text-xs font-semibold text-slate-600'

  return (
    <div className="print:hidden w-full space-y-5 text-sm">
      <section className={sectionClass}>
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-bold text-slate-800">文字排版</h4>
          <span className="text-[10px] font-bold text-[#8B5CF6] bg-[#8B5CF6]/10 px-2 py-0.5 rounded-md">Typography</span>
        </div>
        <div className="space-y-4">
          <div className={controlWrapperClass}>
            <Label className={labelClass} htmlFor="font-size-select">全局字号</Label>
            <Select value={String(theme.fontSize)} onValueChange={handleFontSizeSelect}>
              <SelectTrigger id="font-size-select" className="h-10 rounded-xl border-white bg-white/50 backdrop-blur-sm shadow-sm focus:ring-[#8B5CF6]/20 transition-all">
                <SelectValue placeholder="字号" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-white bg-white/90 backdrop-blur-xl shadow-lg">
                {fontSizes.map((sizeOption) => (
                  <SelectItem key={sizeOption.value} value={String(sizeOption.value)} className="rounded-lg m-1 cursor-pointer hover:bg-black/5 focus:bg-[#8B5CF6]/10 focus:text-[#8B5CF6]">
                    {sizeOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-bold text-slate-800">间距布局</h4>
          <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md">Layout</span>
        </div>
        <button
          type="button"
          onClick={toggleSinglePage}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border transition-all duration-200 group"
          style={{
            borderColor: props.onePage ? theme.primaryColor : 'rgba(255,255,255,0.8)',
            backgroundColor: props.onePage ? `${theme.primaryColor}15` : 'rgba(255,255,255,0.5)',
            boxShadow: props.onePage ? `0 2px 10px ${theme.primaryColor}15` : '0 1px 2px rgba(0,0,0,0.02)'
          }}
        >
          <FileText
            size={16}
            className="transition-transform duration-200 group-hover:-translate-y-0.5"
            style={{ color: props.onePage ? theme.primaryColor : '#94a3b8' }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: props.onePage ? theme.primaryColor : '#64748b' }}
          >
            一页模式
          </span>
          {props.onePage && props.onePageStatus === 'fit' && (
            <span className="ml-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">已适配</span>
          )}
          {props.onePage && props.onePageStatus === 'fitting' && (
            <div className="w-1.5 h-1.5 rounded-full animate-pulse ml-1" style={{ backgroundColor: theme.primaryColor }} />
          )}
          {props.onePage && props.onePageStatus === 'overflow' && (
            <span className="ml-1 text-[10px] font-medium text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">内容超出</span>
          )}
        </button>
        {props.onePage && (
          <p className="text-[11px] text-slate-400 text-center -mt-2 font-medium">关闭后将恢复为开启前的排版设置</p>
        )}
        <div className="space-y-6 pt-3">
          <div className="space-y-3">
            <div className={sliderLabelClass}>
              <span>行高 (Line Height)</span>
              <span className="text-[#8B5CF6] font-mono bg-[#8B5CF6]/10 px-1.5 rounded text-[10px]">{theme.lineHeight.toFixed(1)}</span>
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
          </div>
          <div className="space-y-3">
            <div className={sliderLabelClass}>
              <span>模块间距 (Spacing)</span>
              <span className="text-blue-500 font-mono bg-blue-500/10 px-1.5 rounded text-[10px]">{theme.spacingScale.toFixed(1)}x</span>
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
          </div>
          <div className="space-y-3">
            <div className={sliderLabelClass}>
              <span>页边距上下 (Top/Bottom)</span>
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
          </div>
          <div className="space-y-3">
            <div className={sliderLabelClass}>
              <span>页边距左右 (Left/Right)</span>
              <span className="text-cyan-600 font-mono bg-cyan-500/10 px-1.5 rounded text-[10px]">{theme.pagePaddingHorizontal.toFixed(0)}mm</span>
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
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-bold text-slate-800">色彩风格</h4>
          <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">Colors</span>
        </div>
        <div className="space-y-4">
          <div className="space-y-2.5">
            <Label className={labelClass}>主题主色 (Primary)</Label>
            <Popover.Root open={primaryPopoverOpen} onOpenChange={setPrimaryPopoverOpen}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white bg-white/50 backdrop-blur-sm cursor-pointer transition-all hover:bg-white/80 hover:shadow-sm"
                >
                  <div
                    className="h-6 w-12 rounded-md shadow-sm border border-black/5"
                    style={{ backgroundColor: theme.primaryColor }}
                  />
                  <span className="text-xs font-mono text-slate-600 flex-1 text-left font-medium">{theme.primaryColor.toUpperCase()}</span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="z-[100] w-72 bg-white/85 backdrop-blur-xl rounded-2xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200"
                  sideOffset={8}
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
                        className="h-8 rounded-full border border-black/5 transition-all hover:scale-110"
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
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white bg-white/50 backdrop-blur-sm text-slate-600 font-medium text-xs transition-all hover:bg-white hover:shadow-sm"
                  >
                    <Palette className="h-3.5 w-3.5" />
                    <span>自定义颜色</span>
                  </button>
                  {showPrimaryCustom ? (
                    <div className="flex items-center gap-3 p-2 rounded-xl border border-white bg-white/50 shadow-inner backdrop-blur-sm">
                      <input
                        id="primary-color"
                        type="color"
                        value={theme.primaryColor}
                        onChange={(e): void => handlePrimaryColor(e)}
                        className="h-8 w-12 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                      />
                      <Input
                        type="text"
                        value={theme.primaryColor}
                        onChange={(e): void => handlePrimaryColor(e)}
                        className="flex-1 h-8 rounded-lg bg-white/50 border-white shadow-sm text-xs font-mono text-slate-600 focus-visible:ring-[#8B5CF6]/20"
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
