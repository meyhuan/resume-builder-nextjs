import { useState } from 'react'
import type { ChangeEvent, ReactElement } from 'react'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'

/**
 * RightSidebar shows two tabs: Template switch and Layout settings.
 */
export interface RightSidebarProps {
  readonly theme: ThemeTokens
  readonly tpl: 'simple' | 'modern' | 'professional' | 'creative'
  readonly onTplChange: (tpl: 'simple' | 'modern' | 'professional' | 'creative') => void
  readonly onThemePatch: (patch: Partial<ThemeTokens>) => void
  readonly onePage?: boolean
  readonly onOnePageChange?: (v: boolean) => void
  readonly onImportJson?: (json: string) => void
}

export default function RightSidebar(props: RightSidebarProps): ReactElement {
  const { theme, tpl } = props
  const [tab, setTab] = useState<'templates' | 'layout'>('layout')
  const fonts: readonly { label: string; value: string }[] = [
    { label: 'Inter + Noto Sans SC', value: 'Inter, Noto Sans SC, system-ui, sans-serif' },
    { label: 'Noto Sans SC', value: 'Noto Sans SC, system-ui, sans-serif' },
    { label: 'System Sans', value: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' },
    { label: 'Georgia (serif)', value: 'Georgia, serif' },
  ]

  function handleThemeNumber(e: ChangeEvent<HTMLInputElement>, key: 'fontSize' | 'lineHeight' | 'spacingScale'): void {
    const n: number = Number(e.target.value)
    if (Number.isFinite(n)) props.onThemePatch({ [key]: n } as Partial<ThemeTokens>)
  }

  function handleImportClick(): void {
    const json = prompt('粘贴JSON简历数据：')
    if (json) {
      try {
        props.onImportJson?.(json)
      } catch (e) {
        alert(`导入失败: ${e}`)
      }
    }
  }

  return (
    <div className="print:hidden w-full rounded-md border bg-white shadow-sm">
      <div className="grid grid-cols-2">
        <button
          type="button"
          className={`col-span-1 border-b p-2 text-sm font-medium hover:bg-gray-50 ${tab === 'templates' ? 'bg-gray-50' : ''}`}
          onClick={(): void => setTab('templates')}
        >
          切换模板
        </button>
        <button
          type="button"
          className={`col-span-1 border-b p-2 text-sm font-medium hover:bg-gray-50 ${tab === 'layout' ? 'bg-gray-50' : ''}`}
          onClick={(): void => setTab('layout')}
        >
          排版设置
        </button>
      </div>

      {tab === 'templates' ? (
        <div className="p-3 border-b">
          <div className="text-xs text-gray-500 mb-2">模板</div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              aria-label="Simple template"
              onClick={(): void => props.onTplChange('simple')}
              className={`rounded border p-2 text-sm hover:bg-gray-50 ${tpl === 'simple' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
            >
              简约
            </button>
            <button
              type="button"
              aria-label="Modern template"
              onClick={(): void => props.onTplChange('modern')}
              className={`rounded border p-2 text-sm hover:bg-gray-50 ${tpl === 'modern' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
            >
              现代
            </button>
            <button
              type="button"
              aria-label="Professional template"
              onClick={(): void => props.onTplChange('professional')}
              className={`rounded border p-2 text-sm hover:bg-gray-50 ${tpl === 'professional' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
            >
              专业商务
            </button>
            <button
              type="button"
              aria-label="Creative template"
              onClick={(): void => props.onTplChange('creative')}
              className={`rounded border p-2 text-sm hover:bg-gray-50 ${tpl === 'creative' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
            >
              创意风格
            </button>
          </div>
          <button
            type="button"
            onClick={handleImportClick}
            className="w-full rounded border p-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
          >
            导入JSON简历
          </button>
        </div>
      ) : null}

      {tab === 'layout' ? (
        <div className="p-3 space-y-4">
          <section>
            <div className="text-xs text-gray-500 mb-2">页面</div>
            <div className="flex items-center gap-2">
              <label className="text-sm w-24">一页模式</label>
              <input
                aria-label="Single page"
                type="checkbox"
                checked={!!props.onePage}
                onChange={(e): void => props.onOnePageChange?.(e.target.checked)}
              />
              <span className="text-xs text-gray-500">固定为A4一页预览</span>
            </div>
          </section>

          <section>
          <div className="text-xs text-gray-500 mb-2">文字</div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm w-24">字体</label>
            <select
              aria-label="Font family"
              value={theme.fontFamily}
              className="flex-1 text-sm border rounded px-2 py-1"
              onChange={(e): void => props.onThemePatch({ fontFamily: e.target.value })}
            >
              {fonts.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm w-24">字号</label>
            <input
              type="range"
              min={10}
              max={24}
              step={1}
              value={theme.fontSize}
              onChange={(e): void => handleThemeNumber(e, 'fontSize')}
              className="flex-1"
            />
            <span className="w-10 text-xs text-right">{theme.fontSize}px</span>
          </div>
          </section>

          <section>
          <div className="text-xs text-gray-500 mb-2">间距</div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm w-24">行间距</label>
            <input
              type="range"
              min={1.2}
              max={2.0}
              step={0.1}
              value={theme.lineHeight}
              onChange={(e): void => handleThemeNumber(e, 'lineHeight')}
              className="flex-1"
            />
            <span className="w-10 text-xs text-right">{theme.lineHeight.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm w-24">模块间距</label>
            <input
              type="range"
              min={0.8}
              max={1.6}
              step={0.1}
              value={theme.spacingScale}
              onChange={(e): void => handleThemeNumber(e, 'spacingScale')}
              className="flex-1"
            />
            <span className="w-10 text-xs text-right">{theme.spacingScale.toFixed(1)}x</span>
          </div>
          </section>

          <section>
          <div className="text-xs text-gray-500 mb-2">颜色</div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm w-24">主色</label>
            <input
              aria-label="Primary color"
              type="color"
              value={theme.primaryColor}
              onChange={(e): void => props.onThemePatch({ primaryColor: e.target.value })}
              className="h-8 w-10 p-0 border rounded"
            />
            <input
              aria-label="Primary color hex"
              type="text"
              value={theme.primaryColor}
              onChange={(e): void => props.onThemePatch({ primaryColor: e.target.value })}
              className="flex-1 text-sm border rounded px-2 py-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm w-24">正文色</label>
            <input
              aria-label="Text color"
              type="color"
              value={theme.textColor}
              onChange={(e): void => props.onThemePatch({ textColor: e.target.value })}
              className="h-8 w-10 p-0 border rounded"
            />
            <input
              aria-label="Text color hex"
              type="text"
              value={theme.textColor}
              onChange={(e): void => props.onThemePatch({ textColor: e.target.value })}
              className="flex-1 text-sm border rounded px-2 py-1"
            />
          </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
