'use client'

import { useEffect, useRef, type ReactElement } from 'react'
import { Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { EditorAiPanel } from '@/components/ai-chat/editor-ai-panel'
import VipUpgradeDialog from '@/components/vip/vip-upgrade-dialog'
import { useAppStore } from '@/state/store'
import { useEditorUiStore } from '@/state/editor-ui-store'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { useVipCheck } from '@/hooks/use-vip-check'

interface MobileAiAssistantDrawerProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly resumeId: string
}

export function MobileAiAssistantDrawer({
  isOpen,
  onClose,
  resumeId,
}: MobileAiAssistantDrawerProps): ReactElement | null {
  const initializedRef = useRef(false)
  const { showUpgrade, setShowUpgrade } = useVipCheck()

  useEffect(() => {
    if (!isOpen) return

    const currentDraft = useDraftStore.getState().draft
    if (currentDraft) {
      useAppStore.setState({ resume: currentDraft })
    }

    useEditorUiStore.setState({
      assistantResumeId: resumeId,
      activeModal: null,
      activePanel: 'ai',
      showAiChat: true,
    })
    initializedRef.current = true

    // Mirror accepted AI changes back into draftStore
    const unsubscribe = useAppStore.subscribe((state, previous) => {
      if (!initializedRef.current || state.resume === previous.resume) return
      useDraftStore.getState().replaceDraft(state.resume)
      toast.success('已采纳 AI 建议，简历草稿已更新！')
    })

    return () => {
      initializedRef.current = false
      unsubscribe()
      useEditorUiStore.setState({
        assistantResumeId: null,
        activePanel: null,
        showAiChat: false,
        assistantTask: null,
      })
    }
  }, [isOpen, resumeId])

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex flex-col justify-end bg-black/55 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      >
        <div
          className="flex h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl transition-transform animate-in slide-in-from-bottom duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Drag Handle */}
          <div className="flex h-5 w-full items-center justify-center pt-2">
            <div className="h-1.5 w-12 rounded-full bg-slate-300" />
          </div>

          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                <Sparkles size={16} />
              </div>
              <span className="text-sm font-bold text-slate-900">AI 简历助手</span>
              <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 border border-violet-200">
                实时优化
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 active:text-slate-700"
            >
              <X size={18} />
            </button>
          </div>

          {/* Assistant Panel Body */}
          <div className="flex-1 overflow-hidden bg-slate-50/50">
            <EditorAiPanel resumeId={resumeId} />
          </div>
        </div>
      </div>

      <VipUpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />
    </>
  )
}
