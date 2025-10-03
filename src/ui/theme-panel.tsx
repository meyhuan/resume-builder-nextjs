import type { ChangeEvent, ReactElement } from 'react'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'

/**
 * ThemePanel renders controls to customize ThemeTokens.
 * It does not own state; callers pass current theme and an onUpdate callback.
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

  function handleNumber(e: ChangeEvent<HTMLInputElement>, key: 'fontSize' | 'lineHeight' | 'spacingScale'): void {
    const v: number = Number(e.target.value)
    props.onUpdate({ [key]: v } as Partial<ThemeTokens>)
  }

  function handleFont(e: ChangeEvent<HTMLSelectElement>): void {
    props.onUpdate({ fontFamily: e.target.value })
  }

  return (
    <div className="print:hidden rounded-md border bg-white shadow-sm p-3 w-full md:w-[560px]">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold">Theme</h3>
        <button type="button" className="ml-auto text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50" onClick={props.onClose}>Close</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm w-28">Primary color</label>
          <input aria-label="Primary color" type="color" value={theme.primaryColor} onChange={(e): void => handleColor(e, 'primaryColor')} className="h-8 w-10 p-0 border rounded" />
          <input aria-label="Primary color hex" type="text" value={theme.primaryColor} onChange={(e): void => handleColor(e as unknown as ChangeEvent<HTMLInputElement>, 'primaryColor')} className="flex-1 text-sm border rounded px-2 py-1" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm w-28">Text color</label>
          <input aria-label="Text color" type="color" value={theme.textColor} onChange={(e): void => handleColor(e, 'textColor')} className="h-8 w-10 p-0 border rounded" />
          <input aria-label="Text color hex" type="text" value={theme.textColor} onChange={(e): void => handleColor(e as unknown as ChangeEvent<HTMLInputElement>, 'textColor')} className="flex-1 text-sm border rounded px-2 py-1" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm w-28">Font family</label>
          <select aria-label="Font family" value={theme.fontFamily} onChange={handleFont} className="flex-1 text-sm border rounded px-2 py-1">
            {fonts.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm w-28">Font size</label>
          <input aria-label="Font size" type="number" min={10} max={24} step={1} value={theme.fontSize} onChange={(e): void => handleNumber(e, 'fontSize')} className="w-24 text-sm border rounded px-2 py-1" />
          <span className="text-xs text-gray-500">px</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm w-28">Line height</label>
          <input aria-label="Line height" type="number" min={1.2} max={2.0} step={0.1} value={theme.lineHeight} onChange={(e): void => handleNumber(e, 'lineHeight')} className="w-24 text-sm border rounded px-2 py-1" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm w-28">Spacing</label>
          <input aria-label="Spacing scale" type="number" min={0.8} max={1.6} step={0.1} value={theme.spacingScale} onChange={(e): void => handleNumber(e, 'spacingScale')} className="w-24 text-sm border rounded px-2 py-1" />
          <span className="text-xs text-gray-500">x</span>
        </div>
      </div>
    </div>
  )
}
