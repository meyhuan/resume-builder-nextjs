'use client'

import { type ReactElement } from 'react'
import { Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { htmlToPlainText, plainTextToHtml } from '@/features/edit/form-fields/html-text'

interface QuickAddQualificationsProps {
  readonly html: string
  readonly onHtmlChange: (next: string) => void
}

const COMMON_ITEMS: readonly string[] = [
  '大学英语四级（CET-4）',
  '大学英语六级（CET-6）',
  '全国计算机等级考试二级',
  '普通话二级甲等',
  '机动车驾驶证（C1）',
  '教师资格证',
  '国家奖学金',
  '校级一等奖学金',
  '三好学生',
  '优秀毕业生',
]

/**
 * Inline one-tap quick-add chips for common certificates & awards.
 * Always visible below the editor; tapping appends `• value` to the content.
 */
export function QuickAddQualifications(props: QuickAddQualificationsProps): ReactElement {
  const { html, onHtmlChange } = props

  const plain: string = htmlToPlainText(html)
  const existingLines: string[] = plain
    .split('\n')
    .map((l) => l.replace(/^•\s*/, '').trim())
    .filter(Boolean)

  const addItem = (value: string): void => {
    if (existingLines.includes(value)) {
      toast('该条已经存在')
      return
    }
    const nextPlain: string = plain ? `${plain}\n• ${value}` : `• ${value}`
    onHtmlChange(plainTextToHtml(nextPlain))
    toast.success(`已添加：${value}`)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 px-0.5">
        <Wand2 size={13} className="text-violet-500" />
        <span>常用证书/奖项，点击快速添加</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {COMMON_ITEMS.map((item) => {
          const exists: boolean = existingLines.includes(item)
          return (
            <button
              key={item}
              type="button"
              onClick={(): void => addItem(item)}
              disabled={exists}
              className={cn(
                'shrink-0 px-3 h-8 rounded-full text-xs border transition-all active:scale-95',
                exists
                  ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-default'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-violet-400 hover:text-violet-700 hover:bg-violet-50',
              )}
            >
              {exists ? '✓ ' : ''}
              {item}
            </button>
          )
        })}
      </div>
    </div>
  )
}
