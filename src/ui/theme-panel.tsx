import type { ChangeEvent, ReactElement } from 'react'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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

/**
 * ThemePanel renders controls to customize ThemeTokens.
 * It does not own state; callers pass current theme and an onUpdate callback.
 * Now using shadcn/ui components for better UX.
 */
export default function ThemePanel(props: {
  readonly theme: ThemeTokens
  readonly onUpdate: (patch: Partial<ThemeTokens>) => void
  readonly onClose: () => void
}): ReactElement {
  const theme = props.theme
  const fonts: readonly { label: string; value: string }[] = [
    { label: 'Inter + Noto Sans SC', value: 'Inter, Noto Sans SC, system-ui, sans-serif' },
    { label: 'Noto Sans SC', value: 'Noto Sans SC, system-ui, sans-serif' },
    { label: 'System Sans', value: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' },
    { label: 'Georgia (serif)', value: 'Georgia, serif' },
  ]

  function handleColor(e: ChangeEvent<HTMLInputElement>, key: 'primaryColor' | 'textColor'): void {
    props.onUpdate({ [key]: e.target.value } as Partial<ThemeTokens>)
  }

  function handleFontSize(value: number[]): void {
    props.onUpdate({ fontSize: value[0] })
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

  return (
    <Card className="print:hidden w-full border-0 shadow-none">
      <CardHeader className="pb-3 px-0">
        <CardTitle className="text-lg">Theme Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Colors Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Colors</h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="primary-color"
                  type="color"
                  value={theme.primaryColor}
                  onChange={(e): void => handleColor(e, 'primaryColor')}
                  className="h-10 w-14 p-1 border rounded cursor-pointer"
                />
                <Input
                  type="text"
                  value={theme.primaryColor}
                  onChange={(e): void => handleColor(e, 'primaryColor')}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="text-color">Text Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="text-color"
                  type="color"
                  value={theme.textColor}
                  onChange={(e): void => handleColor(e, 'textColor')}
                  className="h-10 w-14 p-1 border rounded cursor-pointer"
                />
                <Input
                  type="text"
                  value={theme.textColor}
                  onChange={(e): void => handleColor(e, 'textColor')}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Typography Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Typography</h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="font-family">Font Family</Label>
              <Select value={theme.fontFamily} onValueChange={handleFont}>
                <SelectTrigger id="font-family">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fonts.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="font-size">Font Size</Label>
                <span className="text-sm text-muted-foreground">{theme.fontSize}px</span>
              </div>
              <Slider
                id="font-size"
                min={10}
                max={24}
                step={1}
                value={[theme.fontSize]}
                onValueChange={handleFontSize}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="line-height">Line Height</Label>
                <span className="text-sm text-muted-foreground">{theme.lineHeight.toFixed(1)}</span>
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
          </div>
        </div>

        {/* Spacing Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Spacing</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="spacing-scale">Module Spacing</Label>
              <span className="text-sm text-muted-foreground">{theme.spacingScale.toFixed(1)}x</span>
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
      </CardContent>
    </Card>
  )
}
