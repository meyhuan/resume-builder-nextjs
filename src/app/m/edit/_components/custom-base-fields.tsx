'use client'

import { type ReactElement } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useBaseInfoField } from '@/features/edit/draft/use-draft-field'
import {
  isTemplateExclusiveBaseInfoField,
  splitTemplateExclusiveBaseInfoFields,
} from '@/lib/template-exclusive-fields'

type CustomField = { label: string; value: string }

const PRESET_LABELS: ReadonlyArray<string> = [
  'GitHub',
  '作品集',
  '个人博客',
  '微信',
  'LinkedIn',
  '小红书',
  '驾照',
  '籍贯',
]

/**
 * Editor for user-defined `baseInfo.customFields`.
 *
 * Lets users add arbitrary label/value pairs to the base info block (e.g.
 * GitHub, portfolio URL, driver's license). Includes quick-add chips for
 * common labels so users do not have to think up field names.
 */
export function CustomBaseFields(): ReactElement {
  const field = useBaseInfoField('customFields')
  const allItems: ReadonlyArray<CustomField> = (field.value ?? []) as ReadonlyArray<CustomField>
  const items: ReadonlyArray<CustomField> = allItems.filter((item) => !isTemplateExclusiveBaseInfoField(item.label))
  const hiddenItems: ReadonlyArray<CustomField> = allItems.filter((item) => isTemplateExclusiveBaseInfoField(item.label))

  const setOrdinaryItems = (nextItems: readonly CustomField[]): void => {
    const { ordinaryFields } = splitTemplateExclusiveBaseInfoFields(nextItems)
    field.setValue([...ordinaryFields, ...hiddenItems])
  }

  const updateAt = (index: number, patch: Partial<CustomField>): void => {
    const next: CustomField[] = items.map((it, i) => (i === index ? { ...it, ...patch } : it))
    setOrdinaryItems(next)
  }

  const removeAt = (index: number): void => {
    const next: CustomField[] = items.filter((_, i) => i !== index)
    setOrdinaryItems(next)
  }

  const addItem = (presetLabel?: string): void => {
    const next: CustomField[] = [...items, { label: presetLabel ?? '', value: '' }]
    setOrdinaryItems(next)
  }

  const usedLabels: ReadonlySet<string> = new Set(items.map((it) => it.label))
  const remainingPresets: ReadonlyArray<string> = PRESET_LABELS.filter((l) => !usedLabels.has(l))

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-medium text-slate-700">自定义字段</div>
          <div className="text-[11px] text-slate-400 mt-0.5">如 GitHub、作品集、驾照等</div>
        </div>
        <span className="text-[11px] text-slate-400">{items.length} 项</span>
      </div>

      {items.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          {items.map((it, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2"
            >
              <input
                type="text"
                value={it.label}
                onChange={(e): void => updateAt(idx, { label: e.target.value })}
                placeholder="字段名"
                className="w-24 shrink-0 bg-white rounded-lg border border-slate-200 px-2 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none"
              />
              <input
                type="text"
                value={it.value}
                onChange={(e): void => updateAt(idx, { value: e.target.value })}
                placeholder="内容"
                className="flex-1 min-w-0 bg-white rounded-lg border border-slate-200 px-2 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none"
              />
              <button
                type="button"
                onClick={(): void => removeAt(idx)}
                className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                aria-label="删除"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {remainingPresets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {remainingPresets.map((label) => (
            <button
              key={label}
              type="button"
              onClick={(): void => addItem(label)}
              className="px-2.5 py-1 text-[11px] rounded-full border border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-600 active:scale-95 transition-all"
            >
              + {label}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={(): void => addItem()}
        className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-500 text-sm font-medium flex items-center justify-center gap-1.5 hover:border-violet-400 hover:text-violet-600 active:scale-[0.98] transition-all"
      >
        <Plus size={14} />
        添加自定义字段
      </button>
    </div>
  )
}
