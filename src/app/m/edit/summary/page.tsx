'use client'

import { type ReactElement } from 'react'
import { ModuleEditShell } from '../_components/module-edit-shell'
import { RichAiTextarea } from '@/features/edit/form-fields/rich-ai-textarea'
import { useSingleTextBlock } from '@/features/edit/draft/use-single-text-block'

const PLACEHOLDER: string = `本人性格开朗，积极向上，对工作有极大的兴趣。\n\n从以下几个方面入手：\n• 你的核心优势\n• 你擅长的工作领域\n• 你想给招聘者传达的态度`

/**
 * Self-evaluation / summary edit page.
 */
export default function SummaryEditPage(): ReactElement {
  const { html, setHtml, ready } = useSingleTextBlock('自我评价')
  return (
    <ModuleEditShell title="自我评价" subtitle="向招聘者做一次 30 秒自我介绍">
      {!ready ? (
        <div className="text-center py-12 text-sm text-slate-500">加载中…</div>
      ) : (
        <RichAiTextarea
          label="自我评价"
          html={html}
          onHtmlChange={setHtml}
          placeholder={PLACEHOLDER}
          tip="3-5 句话即可，突出与岗位匹配的特质"
          moduleType="self-evaluation"
          minHeight={200}
        />
      )}
    </ModuleEditShell>
  )
}
