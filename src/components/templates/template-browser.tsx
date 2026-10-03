'use client'

import { useId, useState, type ReactNode, type ReactElement } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import type { TemplateMetadata } from '@/lib/templates/template-metadata'
import {
  filterTemplates,
  QUICK_FILTERS,
  TAXONOMY_OPTIONS,
  type TemplateFilters,
  type TaxonomyDimension,
} from '@/lib/templates/template-taxonomy'

const DIMENSION_LABELS: Record<TaxonomyDimension, string> = {
  stages: '求职阶段',
  roles: '岗位方向',
  styles: '视觉风格',
  layouts: '版式',
  densities: '信息密度',
  languages: '语言',
}

interface TemplateBrowserProps<T extends TemplateMetadata> {
  readonly templates: readonly T[]
  readonly currentId?: string
  /** Keep more space for template cards inside the mobile preview sheet. */
  readonly compact?: boolean
  readonly gridClassName?: string
  readonly renderTemplate: (template: T) => ReactNode
}

/** Selection/filter state is local. Only the caller's card can change a resume. */
export function TemplateBrowser<T extends TemplateMetadata>({
  templates,
  currentId,
  compact = false,
  gridClassName = 'grid grid-cols-2 gap-4',
  renderTemplate,
}: TemplateBrowserProps<T>): ReactElement {
  const [filters, setFilters] = useState<TemplateFilters>({})
  const [quickId, setQuickId] = useState('all')
  const [expanded, setExpanded] = useState(false)
  const filtersId = useId()
  const filtered = filterTemplates(templates, filters)
  const current = templates.find((template) => template.id === currentId)
  const activeCount = Object.values(filters).reduce(
    (sum, values) => sum + values.length,
    0,
  )

  function clear(): void {
    setFilters({})
    setQuickId('all')
    setExpanded(false)
  }
  function toggle(dimension: TaxonomyDimension, value: string): void {
    setQuickId('custom')
    setFilters((previous) => {
      const selected = (previous[dimension] ?? []) as readonly string[]
      return {
        ...previous,
        [dimension]: selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value],
      }
    })
  }

  return (
    <div className="min-w-0 space-y-3" data-template-browser="true">
      {compact ? (
        <div className="flex min-w-0 gap-2">
          <select
            aria-label="模板分类"
            value={quickId}
            className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 hover:border-violet-300 focus-visible:outline-2 focus-visible:outline-violet-600"
            onChange={(event): void => {
              const quick = QUICK_FILTERS.find((item) => item.id === event.target.value)
              if (quick) { setQuickId(quick.id); setFilters(quick.filters); setExpanded(false) }
            }}
          >
            {QUICK_FILTERS.map((quick) => <option key={quick.id} value={quick.id}>{quick.label}（{filterTemplates(templates, quick.filters).length}）</option>)}
            {quickId === 'custom' && <option value="custom">自定义筛选</option>}
          </select>
          <button type="button" aria-expanded={expanded} aria-controls={filtersId}
            onClick={(): void => setExpanded(!expanded)}
            className={`flex h-11 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm focus-visible:outline-2 focus-visible:outline-violet-600 ${expanded || quickId === 'custom' ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-700'}`}>
            <SlidersHorizontal size={16} aria-hidden="true" />筛选{quickId === 'custom' && activeCount > 0 ? ` · ${activeCount}` : ''}
          </button>
        </div>
      ) : <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="模板快捷分类"
      >
        {QUICK_FILTERS.map((quick) => (
          <button
            key={quick.id}
            type="button"
            aria-pressed={quickId === quick.id}
            className={`shrink-0 rounded-lg border px-2.5 py-2 text-xs transition-colors ${quickId === quick.id ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300'}`}
            onClick={(): void => {
              setQuickId(quick.id)
              setFilters(quick.filters)
            }}
          >
            {quick.label} ({filterTemplates(templates, quick.filters).length})
          </button>
        ))}
      </div>}
      <details id={filtersId} open={compact ? expanded : undefined}
        className={compact && !expanded ? 'hidden' : 'rounded-lg border border-slate-200 bg-white p-3'}>
        <summary className={compact ? 'hidden' : 'cursor-pointer text-xs font-medium text-slate-700'}>
          更多筛选{activeCount > 0 ? `（已选 ${activeCount} 项）` : ''}
        </summary>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          同一项可多选，不同项组合筛选。筛选不会修改简历内容。
        </p>
        <div className="mt-3 space-y-3">
          {(Object.keys(TAXONOMY_OPTIONS) as TaxonomyDimension[]).map(
            (dimension) => (
              <fieldset key={dimension}>
                <legend className="mb-1.5 text-xs font-medium text-slate-700">
                  {DIMENSION_LABELS[dimension]}
                </legend>
                <div className="flex flex-wrap gap-x-3 gap-y-2">
                  {Object.entries(TAXONOMY_OPTIONS[dimension]).map(
                    ([value, label]) => (
                      <label
                        key={value}
                        className={compact ? 'flex min-h-11 items-center gap-2 text-sm text-slate-700' : 'flex items-center gap-1.5 text-xs text-slate-600'}
                      >
                        <input
                          type="checkbox"
                          className="accent-violet-600"
                          checked={(
                            (filters[dimension] ?? []) as readonly string[]
                          ).includes(value)}
                          onChange={(): void => toggle(dimension, value)}
                        />
                        {label}
                      </label>
                    ),
                  )}
                </div>
              </fieldset>
            ),
          )}
        </div>
        {compact && <button type="button" onClick={(): void => setExpanded(false)} className="mt-2 min-h-11 w-full rounded-lg bg-slate-50 text-sm text-slate-700 hover:bg-slate-100">收起筛选</button>}
      </details>
      <div className={`flex items-center justify-between gap-2 text-xs ${compact ? 'min-h-6' : ''}`}>
        <span role="status" aria-live="polite" className="text-slate-500">
          已找到 {filtered.length} 款模板
        </span>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clear}
            className={compact ? '-my-2.5 min-h-11 px-1 text-violet-700 underline underline-offset-2' : 'py-1 text-violet-700 underline underline-offset-2'}
          >
            清除筛选
          </button>
        )}
      </div>
      {!compact && current && !filtered.some((template) => template.id === current.id) && (
        <p className="rounded-lg bg-violet-50 p-3 text-xs leading-5 text-slate-600">
          正在使用「{current.name}」，不在当前筛选结果内，简历保持不变。
          <button
            type="button"
            onClick={clear}
            className="ml-1 text-violet-700 underline"
          >
            查看全部
          </button>
        </p>
      )}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
          <p>没有符合这些条件的模板</p>
          <button
            type="button"
            onClick={clear}
            className="mt-3 min-h-11 text-violet-700 underline"
          >
            查看全部模板
          </button>
        </div>
      ) : (
        <div className={gridClassName}>{filtered.map(renderTemplate)}</div>
      )}
    </div>
  )
}
