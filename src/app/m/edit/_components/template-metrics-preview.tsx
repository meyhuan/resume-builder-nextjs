'use client'

import { type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, ChevronRight, Sparkles } from 'lucide-react'
import type { ResumeData } from '@/entities/resume/resume-data'
import { getHighlightItems, getMetricItems } from './template-metrics-fields'

interface TemplateMetricsPreviewProps {
  readonly resume: ResumeData
}

interface TemplateSpecificSettingsProps {
  readonly resume: ResumeData
  readonly templateId: string
}

export function supportsTemplateMetrics(templateId: string): boolean {
  return templateId === 'yuanshan'
}

export function supportsTemplateHighlights(templateId: string): boolean {
  return templateId === 'qingsui'
}

export function supportsTemplateSpecificSettings(templateId: string): boolean {
  return supportsTemplateMetrics(templateId) || supportsTemplateHighlights(templateId)
}

export function TemplateSpecificSettings({ resume, templateId }: TemplateSpecificSettingsProps): ReactElement | null {
  if (!supportsTemplateSpecificSettings(templateId)) return null
  const badge = templateId === 'qingsui' ? '青穗专属' : '远山专属'

  return (
    <section className="mt-4 px-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <div>
          <div className="text-[13px] font-semibold text-slate-700">当前模板专属设置</div>
          <div className="mt-0.5 text-[11px] text-slate-400">只影响正在使用的模板，不是通用简历模块</div>
        </div>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
          {badge}
        </span>
      </div>
      {templateId === 'qingsui' ? <TemplateHighlightsPreview resume={resume} /> : <TemplateMetricsPreview resume={resume} />}
    </section>
  )
}

function TemplateMetricsPreview({ resume }: TemplateMetricsPreviewProps): ReactElement {
  const router = useRouter()
  const metrics = getMetricItems(resume.baseInfo?.customFields)

  return (
    <button
      type="button"
      data-edit-home-anchor="template-specific"
      onClick={(): void => router.push('/m/edit/metrics')}
      className="w-full rounded-[18px] border border-amber-100 bg-white p-3.5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.045)] active:scale-[0.99] transition-transform"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <BarChart3 size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold leading-5 text-slate-950">核心业绩</div>
          <div className="mt-0.5 truncate text-[12px] text-slate-400">仅在远山模板中显示为业绩卡片</div>
        </div>
        <ChevronRight size={17} className="text-slate-300" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {metrics.map(([value, text], index) => (
          <div key={index} className="min-w-0 rounded-xl bg-slate-50 px-2 py-2">
            <div className="truncate text-[14px] font-semibold leading-5 text-slate-900">{value}</div>
            <div className="mt-0.5 truncate text-[10px] leading-4 text-slate-500">{text}</div>
          </div>
        ))}
      </div>
    </button>
  )
}

function TemplateHighlightsPreview({ resume }: TemplateMetricsPreviewProps): ReactElement {
  const router = useRouter()
  const highlights = getHighlightItems(resume.baseInfo?.customFields)

  return (
    <button
      type="button"
      data-edit-home-anchor="template-specific"
      onClick={(): void => router.push('/m/edit/highlights')}
      className="w-full rounded-[18px] border border-cyan-100 bg-white p-3.5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.045)] active:scale-[0.99] transition-transform"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
          <Sparkles size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold leading-5 text-slate-950">页眉亮点</div>
          <div className="mt-0.5 truncate text-[12px] text-slate-400">仅在青穗模板中显示为顶部亮点卡片</div>
        </div>
        <ChevronRight size={17} className="text-slate-300" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {highlights.map(([value, text], index) => (
          <div key={index} className="min-w-0 rounded-xl bg-slate-50 px-2 py-2">
            <div className="truncate text-[14px] font-semibold leading-5 text-slate-900">{value}</div>
            <div className="mt-0.5 truncate text-[10px] leading-4 text-slate-500">{text}</div>
          </div>
        ))}
      </div>
    </button>
  )
}
