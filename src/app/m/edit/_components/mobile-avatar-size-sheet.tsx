'use client'

import { Suspense, useEffect, useLayoutEffect, useState, type ReactElement } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { AvatarSizeControl } from '@/components/avatar/avatar-size-control'
import { getAvatarMaxScale } from '@/entities/user/avatar-size'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { useAppStore } from '@/state/store'
import { getTemplate } from '@/templates/template-loader'

export function MobileAvatarSizeSheet({ onClose }: { readonly onClose: () => void }): ReactElement | null {
  const resume = useDraftStore((state) => state.draft)
  const templateId = useDraftStore((state) => state.templateId)
  const updateDraft = useDraftStore((state) => state.updateDraft)
  const themes = useAppStore((state) => state.themes)
  const theme = themes[templateId] ?? useAppStore.getState().getThemeForTemplate(templateId)
  const [stage, setStage] = useState<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(300)
  const Template = getTemplate(templateId)?.component

  useEffect(() => {
    const previous = useAppStore.getState().readOnly
    useAppStore.getState().setReadOnly(true)
    return () => useAppStore.getState().setReadOnly(previous)
  }, [])
  useLayoutEffect(() => {
    const element = stage
    if (!element) return
    const update = (): void => setWidth(element.clientWidth)
    const observer = new ResizeObserver(update)
    observer.observe(element)
    update()
    return () => observer.disconnect()
  }, [stage])
  if (!resume) return null
  const scale = width / 794

  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent className="left-0 top-auto bottom-0 max-h-[90dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-b-none rounded-t-2xl p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]" aria-describedby="mobile-avatar-size-description">
      <DialogTitle className="text-base">照片大小</DialogTitle>
      <DialogDescription id="mobile-avatar-size-description">查看当前模板的顶部排版，调整后返回保存。</DialogDescription>
      <div ref={setStage} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50" style={{ height: Math.min(260, 520 * scale) }} aria-label="简历顶部预览">
        <div inert style={{ width: 794, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
          <Suspense fallback={<div className="p-8">正在加载模板…</div>}>
            {Template && <Template resume={resume} theme={theme} />}
          </Suspense>
        </div>
      </div>
      <AvatarSizeControl value={resume.baseInfo?.avatarSize} maxScale={getAvatarMaxScale(templateId)} onChange={(avatarSize) => {
        updateDraft('baseInfo.avatarSize', (draft) => { draft.baseInfo = { ...draft.baseInfo, avatarSize } })
      }} />
      <button type="button" onClick={onClose} className="min-h-11 rounded-xl bg-violet-600 text-sm font-medium text-white hover:bg-violet-700">完成</button>
    </DialogContent>
  </Dialog>
}
