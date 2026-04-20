'use client'

import { type ReactElement } from 'react'
import { ModuleEditShell } from '../_components/module-edit-shell'
import { RichAiTextarea } from '@/features/edit/form-fields/rich-ai-textarea'
import { useSingleTextBlock } from '@/features/edit/draft/use-single-text-block'

const PLACEHOLDER: string = `• 熟练使用 Figma / Sketch 进行 UI 设计\n• 掌握 HTML / CSS / JavaScript 基础开发\n• 英语六级，能阅读技术文档\n• 具备项目管理和跨团队协作能力`

/**
 * Skills edit page.
 */
export default function SkillEditPage(): ReactElement {
  const { html, setHtml, ready } = useSingleTextBlock('相关技能')
  return (
    <ModuleEditShell title="相关技能" subtitle="列出 3-6 条相关核心技能">
      {!ready ? (
        <div className="text-center py-12 text-sm text-slate-500">加载中…</div>
      ) : (
        <RichAiTextarea
          label="相关技能"
          html={html}
          onHtmlChange={setHtml}
          placeholder={PLACEHOLDER}
          tip="一行一项，说明熟练程度更具体"
          moduleType="skills"
          minHeight={180}
        />
      )}
    </ModuleEditShell>
  )
}
