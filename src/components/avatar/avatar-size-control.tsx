'use client'

import { useId, type ReactElement } from 'react'
import { AVATAR_SIZE_OPTIONS, normalizeAvatarSize, type AvatarSize } from '@/entities/user/avatar-size'

export function AvatarSizeControl({ value, onChange, maxScale = 1.4 }: {
  readonly value?: AvatarSize
  readonly onChange: (value: AvatarSize) => void
  readonly maxScale?: number
}): ReactElement {
  const labelId = useId()
  const size = maxScale <= 1 ? 'default' : normalizeAvatarSize(value)
  return <div className="space-y-3 text-left font-sans text-sm leading-normal text-slate-800" data-avatar-size-control="true">
    <div id={labelId} className="font-medium">在简历中的显示大小</div>
    <div role="group" aria-labelledby={labelId} className="grid grid-cols-3 gap-2">
      {AVATAR_SIZE_OPTIONS.map((option) => <button key={option.value} type="button"
        data-avatar-size={option.value} aria-pressed={size === option.value}
        disabled={maxScale <= 1 && option.value !== 'default'}
        onClick={() => onChange(option.value)}
        className={`min-h-10 rounded-lg border px-2 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-40 ${size === option.value ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
        {option.label}
      </button>)}
    </div>
    <p className="text-xs leading-relaxed text-slate-500">
      {maxScale <= 1 ? '照片已占满该模板的侧栏宽度。可通过更换照片时的裁剪调整人物大小。' : '保持照片比例，周围内容自动排版。放大后可能增加简历页数。'}
    </p>
    <button type="button" onClick={() => onChange('default')} disabled={normalizeAvatarSize(value) === 'default'}
      className="min-h-9 text-xs font-medium text-violet-600 hover:text-violet-700 disabled:text-slate-400">恢复模板默认</button>
  </div>
}
