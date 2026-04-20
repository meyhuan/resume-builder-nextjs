'use client'

import { use, useMemo, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { ModuleEditShell } from '../../_components/module-edit-shell'
import { TextField } from '@/features/edit/form-fields/text-field'
import { TextareaField } from '@/features/edit/form-fields/textarea-field'
import { htmlToPlainText, plainTextToHtml } from '@/features/edit/form-fields/html-text'
import { useCustomSections } from '@/features/edit/draft/use-custom-sections'

interface PageParams {
  readonly params: Promise<{ id: string }>
}

/**
 * Edit page for a single custom section: rename + edit text content.
 */
export default function CustomDetailPage({ params }: PageParams): ReactElement {
  const { id } = use(params)
  const router = useRouter()
  const { sections, renameSection, getTextHtml, setTextHtml } = useCustomSections()
  const section = useMemo(() => sections.find((s) => s.id === id), [sections, id])

  if (!section) {
    return (
      <ModuleEditShell title="自定义模块" onBack={(): void => router.replace('/m/edit/custom')}>
        <div className="text-center py-12 text-sm text-slate-500">
          <div className="text-4xl mb-3">🤔</div>
          模块不存在或已被删除
        </div>
      </ModuleEditShell>
    )
  }

  return (
    <ModuleEditShell title={section.title} subtitle="自定义内容" onBack={(): void => router.replace('/m/edit/custom')}>
      <TextField
        label="模块名称"
        value={section.title}
        onValueChange={(v): void => renameSection(section.id, v)}
        required
        placeholder="例如：语言能力"
      />
      <TextareaField
        label="模块内容"
        value={htmlToPlainText(getTextHtml(section.id))}
        onValueChange={(v): void => setTextHtml(section.id, plainTextToHtml(v))}
        placeholder={'每行一条即可，空行分段\n\n例如：\n• 英语 CET-6（600 分）\n• 日语 N2\n• 粤语日常沟通'}
        tip="内容越具体，招聘者印象越深"
        minRows={8}
      />
    </ModuleEditShell>
  )
}
