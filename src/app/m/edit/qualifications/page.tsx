'use client'

import { type ReactElement } from 'react'
import { ModuleEditShell } from '../_components/module-edit-shell'
import { MobileRichTextarea } from '@/features/edit/form-fields/mobile-rich-textarea'
import { useSingleTextBlock } from '@/features/edit/draft/use-single-text-block'
import { QuickAddQualifications } from './quick-add-qualifications'

const PLACEHOLDER: string = `• 2023 年「XX 全国创业大赛」一等奖\n• 大学英语六级（560 分）\n• 计算机软件设计师（中级）\n• 校级一等奖学金（2022-2023 学年）`

/**
 * Awards / certificates edit page.
 */
export default function QualificationsEditPage(): ReactElement {
  const { html, setHtml, ready } = useSingleTextBlock('奖项证书')
  return (
    <ModuleEditShell title="奖项证书" subtitle="一行一条，按重要度排序">
      {!ready ? (
        <div className="text-center py-12 text-sm text-slate-500">加载中…</div>
      ) : (
        <div className="flex flex-col gap-4">
          <MobileRichTextarea
            label="奖项证书"
            html={html}
            onHtmlChange={setHtml}
            placeholder={PLACEHOLDER}
            tip="含金量越高越靠前，支持粗体/列表格式"
            minHeight={180}
          />
          <QuickAddQualifications html={html} onHtmlChange={setHtml} />
        </div>
      )}
    </ModuleEditShell>
  )
}
