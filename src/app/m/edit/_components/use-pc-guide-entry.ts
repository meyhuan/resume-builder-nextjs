'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { createLogger } from '@/lib/logger'

interface UsePcGuideEntryOptions {
  readonly resumeId: string | null
  readonly template?: string | null
  readonly source: string
}

interface UsePcGuideEntryResult {
  readonly openingPcGuide: boolean
  readonly openPcGuide: () => Promise<void>
}

const log = createLogger('m/edit/pc-guide-entry')

export function usePcGuideEntry(options: UsePcGuideEntryOptions): UsePcGuideEntryResult {
  const { resumeId, template, source } = options
  const router = useRouter()
  const draftTemplateId = useDraftStore((s): string => s.templateId)
  const dirtyCount = useDraftStore((s): number => s.dirtyPaths.length)
  const saveAll = useDraftStore((s): typeof s.saveAll => s.saveAll)
  const [openingPcGuide, setOpeningPcGuide] = useState<boolean>(false)

  const buildPcGuideUrl = useCallback((): string => {
    const params = new URLSearchParams()
    if (resumeId) params.set('id', resumeId)
    const currentTemplate = draftTemplateId || template
    if (currentTemplate) params.set('tpl', currentTemplate)
    const query = params.toString()
    return query ? `/m/edit/pc?${query}` : '/m/edit/pc'
  }, [draftTemplateId, resumeId, template])

  const openPcGuide = useCallback(async (): Promise<void> => {
    if (openingPcGuide) return
    log.info('open pc guide requested', { resumeId, dirtyCount, source })
    setOpeningPcGuide(true)
    try {
      if (dirtyCount > 0) {
        const result = await saveAll()
        if (!result.ok) {
          log.warn('save before pc guide failed', { error: result.error, source })
          toast.error(result.error || '保存失败，暂时无法同步到电脑端')
          return
        }
        toast.success('已同步最新内容')
      }
      router.push(buildPcGuideUrl())
    } finally {
      setOpeningPcGuide(false)
    }
  }, [buildPcGuideUrl, dirtyCount, openingPcGuide, resumeId, router, saveAll, source])

  return { openingPcGuide, openPcGuide }
}
