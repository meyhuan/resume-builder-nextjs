import type { ExportFormat } from '@/components/export-format-options'

export interface ExportPreviewAsset {
  readonly id: string
  readonly type: ExportFormat
  readonly fileName: string
  readonly downloadUrl: string
  readonly expiresAt: string
  readonly previewImages?: readonly string[]
  readonly markdownContent?: string
  readonly confirmed: boolean
  readonly remaining?: number | 'unlimited'
  readonly isVip?: boolean
}

export async function confirmExportPreview(
  asset: ExportPreviewAsset,
): Promise<ExportPreviewAsset> {
  const response = await fetch(
    `/next-api/exports/mini/${encodeURIComponent(asset.id)}/confirm`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: asset.fileName }),
    },
  )
  const data = await response.json()
  if (!response.ok)
    throw Object.assign(new Error(data.error || '确认导出失败，请重试'), {
      status: response.status,
    })
  return { ...asset, ...data }
}
