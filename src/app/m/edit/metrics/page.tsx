'use client'

import { type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { ModuleEditShell } from '../_components/module-edit-shell'
import { TemplateMetricsFields } from '../_components/template-metrics-fields'
import { supportsTemplateMetrics } from '../_components/template-metrics-preview'

export default function MetricsEditPage(): ReactElement {
  const router = useRouter()
  const draft = useDraftStore((s) => s.draft)
  const templateId = useDraftStore((s) => s.templateId)

  if (!draft) {
    return (
      <ModuleEditShell title="核心业绩">
        <div className="py-12 text-center text-sm text-slate-500">加载中…</div>
      </ModuleEditShell>
    )
  }

  if (!supportsTemplateMetrics(templateId)) {
    return (
      <ModuleEditShell title="核心业绩" subtitle="当前模板不支持此专属设置">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
          <div className="text-base font-semibold text-slate-900">这是远山模板专属设置</div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            当前模板不会显示核心业绩卡片，因此这里不提供编辑入口。切换到远山模板后会自动出现。
          </p>
          <button
            type="button"
            onClick={(): void => router.back()}
            className="mt-4 h-11 rounded-xl bg-violet-600 px-5 text-sm font-medium text-white active:scale-[0.98] transition-transform"
          >
            返回编辑页
          </button>
        </div>
      </ModuleEditShell>
    )
  }

  return (
    <ModuleEditShell title="核心业绩" subtitle="编辑远山模板的三张业绩卡片">
      <TemplateMetricsFields />
    </ModuleEditShell>
  )
}
