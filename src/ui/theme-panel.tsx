import { useState } from 'react'
import type { ChangeEvent, ReactElement } from 'react'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
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
import { Palette, ChevronDown } from 'lucide-react'

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
  readonly onOnePageChange?: (isOnePage: boolean) => void
}): ReactElement {
  const theme = props.theme
  const fonts: readonly { label: string; value: string }[] = [
    { label: 'Inter + Noto Sans SC', value: 'Inter, Noto Sans SC, system-ui, sans-serif' },
    { label: 'Noto Sans SC', value: 'Noto Sans SC, system-ui, sans-serif' },
    { label: 'System Sans', value: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' },
    { label: 'Georgia (serif)', value: 'Georgia, serif' },
  ]
  const fontSizes: readonly number[] = [12, 13, 14, 15, 16, 17, 18, 19, 20]

  function handleColor(e: ChangeEvent<HTMLInputElement>, key: 'primaryColor' | 'textColor'): void {
    props.onUpdate({ [key]: e.target.value } as Partial<ThemeTokens>)
  }

  function handleLineHeight(value: number[]): void {
    props.onUpdate({ lineHeight: value[0] })
  }

  function handleSpacing(value: number[]): void {
    props.onUpdate({ spacingScale: value[0] })
  }

  function handleFont(value: string): void {
    props.onUpdate({ fontFamily: value })
  }

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
  const [textPopoverOpen, setTextPopoverOpen] = useState(false)
  const [showTextCustom, setShowTextCustom] = useState(false)

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

  const sectionClass: string = 'rounded-xl bg-white/80 p-4 space-y-3 shadow-sm'
  const labelClass: string = 'text-xs font-medium text-muted-foreground'
  const controlWrapperClass: string = 'space-y-2'
  const sliderLabelClass: string = 'flex items-center justify-between text-xs text-muted-foreground'

  return (
    <div className="print:hidden w-full space-y-5 text-sm">
      <section className={sectionClass}>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">文字</h4>
          <span className="text-xs text-muted-foreground">Typography</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className={controlWrapperClass}>
            <Label className={labelClass} htmlFor="font-family">字体</Label>
            <Select value={theme.fontFamily} onValueChange={handleFont}>
              <SelectTrigger id="font-family" className="h-10 rounded-lg">
                <SelectValue placeholder="选择字体" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {fonts.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={controlWrapperClass}>
            <Label className={labelClass} htmlFor="font-size-select">字号</Label>
            <Select value={String(theme.fontSize)} onValueChange={handleFontSizeSelect}>
              <SelectTrigger id="font-size-select" className="h-10 rounded-lg">
                <SelectValue placeholder="字号" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {fontSizes.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h4 className="text-sm font-semibold text-gray-900">间距</h4>
        <button
          type="button"
          onClick={toggleSinglePage}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all hover:border-gray-400"
          style={{
            borderColor: props.onePage ? theme.primaryColor : '#e5e7eb',
            backgroundColor: props.onePage ? `${theme.primaryColor}10` : 'transparent'
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: props.onePage ? theme.primaryColor : '#6b7280' }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
          <span
            className="text-sm font-medium"
            style={{ color: props.onePage ? theme.primaryColor : '#374151' }}
          >
            一页模式
          </span>
        </button>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className={sliderLabelClass}>
              <span>行间距</span>
              <span>{theme.lineHeight.toFixed(1)}</span>
            </div>
            <Slider
              id="line-height"
              min={1.2}
              max={2.0}
              step={0.1}
              value={[theme.lineHeight]}
              onValueChange={handleLineHeight}
            />
          </div>
          <div className="space-y-2">
            <div className={sliderLabelClass}>
              <span>模块间距</span>
              <span>{theme.spacingScale.toFixed(1)}x</span>
            </div>
            <Slider
              id="spacing-scale"
              min={0.8}
              max={1.6}
              step={0.1}
              value={[theme.spacingScale]}
              onValueChange={handleSpacing}
            />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">颜色</h4>
          <span className="text-xs text-muted-foreground">Theme Colors</span>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className={labelClass}>主颜色</Label>
            <Popover.Root open={primaryPopoverOpen} onOpenChange={setPrimaryPopoverOpen}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all hover:border-gray-300"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  <div
                    className="h-8 w-16 rounded"
                    style={{ backgroundColor: theme.primaryColor }}
                  />
                  <span className="text-sm text-gray-600 flex-1">{theme.primaryColor}</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="z-50 w-80 bg-white rounded-lg border shadow-lg p-4 space-y-3"
                  sideOffset={8}
                  align="start"
                >
                  <div className="grid grid-cols-6 gap-2">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={(): void => {
                          props.onUpdate({ primaryColor: color })
                          setPrimaryPopoverOpen(false)
                        }}
                        className="h-10 rounded border-2 transition-all hover:scale-110"
                        style={{
                          backgroundColor: color,
                          borderColor: theme.primaryColor === color ? theme.primaryColor : 'transparent',
                          boxShadow: theme.primaryColor === color ? `0 0 0 2px ${color}40` : 'none'
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={(): void => setShowPrimaryCustom(!showPrimaryCustom)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all hover:bg-gray-50"
                  >
                    <Palette className="h-4 w-4" />
                    <span className="text-sm">自定义</span>
                  </button>
                  {showPrimaryCustom ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
                      <input
                        id="primary-color"
                        type="color"
                        value={theme.primaryColor}
                        onChange={(e): void => handleColor(e, 'primaryColor')}
                        className="h-10 w-12 rounded border cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={theme.primaryColor}
                        onChange={(e): void => handleColor(e, 'primaryColor')}
                        className="flex-1 rounded-lg"
                      />
                    </div>
                  ) : null}
                  <Popover.Arrow className="fill-white" />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
          <div className="space-y-2">
            <Label className={labelClass}>正文颜色</Label>
            <Popover.Root open={textPopoverOpen} onOpenChange={setTextPopoverOpen}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all hover:border-gray-300"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  <div
                    className="h-8 w-16 rounded"
                    style={{ backgroundColor: theme.textColor }}
                  />
                  <span className="text-sm text-gray-600 flex-1">{theme.textColor}</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="z-50 w-80 bg-white rounded-lg border shadow-lg p-4 space-y-3"
                  sideOffset={8}
                  align="start"
                >
                  <div className="grid grid-cols-6 gap-2">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={(): void => {
                          props.onUpdate({ textColor: color })
                          setTextPopoverOpen(false)
                        }}
                        className="h-10 rounded border-2 transition-all hover:scale-110"
                        style={{
                          backgroundColor: color,
                          borderColor: theme.textColor === color ? theme.textColor : 'transparent',
                          boxShadow: theme.textColor === color ? `0 0 0 2px ${color}40` : 'none'
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={(): void => setShowTextCustom(!showTextCustom)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border transition-all hover:bg-gray-50"
                  >
                    <Palette className="h-4 w-4" />
                    <span className="text-sm">自定义</span>
                  </button>
                  {showTextCustom ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
                      <input
                        id="text-color"
                        type="color"
                        value={theme.textColor}
                        onChange={(e): void => handleColor(e, 'textColor')}
                        className="h-10 w-12 rounded border cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={theme.textColor}
                        onChange={(e): void => handleColor(e, 'textColor')}
                        className="flex-1 rounded-lg"
                      />
                    </div>
                  ) : null}
                  <Popover.Arrow className="fill-white" />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>
      </section>
    </div>
  )
}
