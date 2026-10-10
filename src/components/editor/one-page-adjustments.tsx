/* Hallmark · component: fit explanation · existing tokens · P5 H4 E4 S5 R5 V4 */
import type { AdjustableTokens } from '@/entities/editor/editor-meta'
import type { OnePageStatus } from '@/hooks/use-one-page-mode'
import type { ResumePagination } from '@/hooks/use-resume-pagination'

const SETTINGS = [
  { key: 'spacingScale', label: '模块间距', unit: 'x' },
  { key: 'lineHeight', label: '行高', unit: '' },
  { key: 'fontSize', label: '字号', unit: 'px' },
  { key: 'pagePaddingVertical', label: '上下页边距', unit: 'mm' },
] as const

export function getOnePageAdjustments(snapshot: AdjustableTokens | null | undefined, current: AdjustableTokens) {
  if (!snapshot) return []
  return SETTINGS.filter(({ key }) => {
    const before = snapshot[key]
    const after = current[key]
    return typeof before === 'number' && typeof after === 'number' && Math.abs(before - after) > 0.01
  }).map(setting => ({ ...setting, before: snapshot[setting.key], after: current[setting.key] }))
}

export function OnePageAdjustments({ snapshot, current, status, pages }: {
  readonly snapshot?: AdjustableTokens | null; readonly current: AdjustableTokens; readonly status?: OnePageStatus
  readonly pages?: ResumePagination
}) {
  const changes = getOnePageAdjustments(snapshot, current)
  const pageMessage = pages?.ready
    ? pages.pageCount === 1
      ? '预计只占 1 页。'
      : `预计 ${pages.pageCount} 页${pages.overflowLabel ? `，超出位置：${pages.overflowLabel}` : '，内容会自然分页'}。`
    : '正在计算页数…'
  return <div data-one-page-adjustments className="space-y-2 border-t pt-3 text-xs leading-relaxed">
    {changes.length ? <dl className="space-y-1">
      {changes.map(change => <div key={change.key} className="flex items-center justify-between gap-2">
        <dt className="text-muted-foreground">{change.label}</dt>
        <dd className="tabular-nums">{change.before}{change.unit} → {change.after}{change.unit}</dd>
      </div>)}
    </dl> : <p className="text-muted-foreground">{status === 'fitting' ? '正在检查当前排版…' : '排版参数未调整。'}</p>}
    <p className="text-muted-foreground">
      <span className={pages?.ready && pages.pageCount > 1 ? 'text-amber-700' : ''}>{pageMessage}</span>
      <br />{status === 'overflow' ? '当前排版仍有内容超出，系统不会裁切；你可以切换策略或保留分页。' : '系统也会收紧标题、卡片、列表和页边的细部留白；关闭一页模式后恢复开启前设置。'}
    </p>
  </div>
}
