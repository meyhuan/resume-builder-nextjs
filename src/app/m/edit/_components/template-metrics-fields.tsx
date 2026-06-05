'use client'

import { type ReactElement } from 'react'
import { useBaseInfoField } from '@/features/edit/draft/use-draft-field'
import { TextField } from '@/features/edit/form-fields/text-field'
import {
  isTemplateExclusiveBaseInfoField,
  isTemplateHighlightField,
  isTemplateMetricField as isMetricField,
} from '@/lib/template-exclusive-fields'

type CustomField = { label: string; value: string }
type MetricItem = readonly [value: string, text: string]

const DEFAULT_METRICS: readonly MetricItem[] = [
  ['3.8亿', '年度 GMV 规模'],
  ['46%', '渠道获客成本下降'],
  ['60+', '团队规模'],
]
const DEFAULT_HIGHLIGHTS: readonly MetricItem[] = [
  ['Top 10%', '专业排名 / 成绩亮点'],
  ['3段', '实习与校园经历'],
  ['10万+', '项目成果与作品'],
]

export function isTemplateMetricField(label: string): boolean {
  return isMetricField(label)
}

export function isTemplateExclusiveField(label: string): boolean {
  return isTemplateExclusiveBaseInfoField(label)
}

export function TemplateMetricsFields(): ReactElement {
  const field = useBaseInfoField('customFields')
  const items: readonly CustomField[] = (field.value ?? []) as readonly CustomField[]
  const metrics = getMetricItems(items)

  const updateMetric = (index: number, part: 0 | 1, nextValue: string): void => {
    const nextMetrics = metrics.map((metric, metricIndex) => {
      if (metricIndex !== index) return metric
      return part === 0 ? [nextValue, metric[1]] : [metric[0], nextValue]
    }) as MetricItem[]
    const ordinaryFields = items.filter((item) => !isTemplateMetricField(item.label))
    const metricFields = nextMetrics.map(([value, text], metricIndex) => ({
      label: `业绩${metricIndex + 1}`,
      value: `${value.trim()}｜${text.trim()}`,
    }))
    field.setValue([...ordinaryFields, ...metricFields])
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <div className="text-sm font-medium text-slate-700">核心业绩</div>
        <div className="mt-0.5 text-[11px] text-slate-400">远山模板专属，会显示为三张业绩卡片</div>
      </div>
      <div className="flex flex-col gap-4">
        {metrics.map(([value, text], index) => (
          <div key={index} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="mb-3 text-xs font-medium text-slate-500">业绩 {index + 1}</div>
            <div className="flex flex-col gap-3">
              <TextField
                label="大字内容"
                value={value}
                onValueChange={(next): void => updateMetric(index, 0, next)}
                placeholder={DEFAULT_METRICS[index][0]}
              />
              <TextField
                label="说明文字"
                value={text}
                onValueChange={(next): void => updateMetric(index, 1, next)}
                placeholder={DEFAULT_METRICS[index][1]}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TemplateHighlightsFields(): ReactElement {
  const field = useBaseInfoField('customFields')
  const items: readonly CustomField[] = (field.value ?? []) as readonly CustomField[]
  const highlights = getHighlightItems(items)

  const updateHighlight = (index: number, part: 0 | 1, nextValue: string): void => {
    const nextHighlights = highlights.map((highlight, highlightIndex) => {
      if (highlightIndex !== index) return highlight
      return part === 0 ? [nextValue, highlight[1]] : [highlight[0], nextValue]
    }) as MetricItem[]
    const ordinaryFields = items.filter((item) => !isTemplateHighlightField(item.label))
    const highlightFields = nextHighlights.map(([value, text], highlightIndex) => ({
      label: `亮点${highlightIndex + 1}`,
      value: `${value.trim()}｜${text.trim()}`,
    }))
    field.setValue([...ordinaryFields, ...highlightFields])
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <div className="text-sm font-medium text-slate-700">页眉亮点</div>
        <div className="mt-0.5 text-[11px] text-slate-400">青穗模板专属，会显示在顶部渐变页眉中</div>
      </div>
      <div className="flex flex-col gap-4">
        {highlights.map(([value, text], index) => (
          <div key={index} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="mb-3 text-xs font-medium text-slate-500">亮点 {index + 1}</div>
            <div className="flex flex-col gap-3">
              <TextField
                label="大字内容"
                value={value}
                onValueChange={(next): void => updateHighlight(index, 0, next)}
                placeholder={DEFAULT_HIGHLIGHTS[index][0]}
              />
              <TextField
                label="说明文字"
                value={text}
                onValueChange={(next): void => updateHighlight(index, 1, next)}
                placeholder={DEFAULT_HIGHLIGHTS[index][1]}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function getMetricItems(customFields: readonly CustomField[] | undefined): readonly MetricItem[] {
  const fields = customFields ?? []
  return DEFAULT_METRICS.map((fallback, index) => {
    const field = fields.find((item) => item.label === `业绩${index + 1}`)
    if (!field?.value) return fallback
    const parts = field.value.split(/[|｜]/).map((part) => part.trim()).filter(Boolean)
    if (parts.length >= 2) return [parts[0], parts.slice(1).join(' / ')]
    return [field.value, fallback[1]]
  })
}

export function getHighlightItems(customFields: readonly CustomField[] | undefined): readonly MetricItem[] {
  const fields = customFields ?? []
  return DEFAULT_HIGHLIGHTS.map((fallback, index) => {
    const field = fields.find((item) => item.label === `亮点${index + 1}`)
    if (!field?.value) return fallback
    const parts = field.value.split(/[|｜]/).map((part) => part.trim()).filter(Boolean)
    if (parts.length >= 2) return [parts[0], parts.slice(1).join(' / ')]
    return [field.value, fallback[1]]
  })
}
