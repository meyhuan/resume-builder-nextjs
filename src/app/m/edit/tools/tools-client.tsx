'use client'

import { useEffect, useRef, useState, type ReactElement } from 'react'
import { ArrowLeft, Languages, Save, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { ResumeData } from '@/entities/resume/resume-data'
import { EditorAiPanel } from '@/components/ai-chat/editor-ai-panel'
import { TranslateDialog } from '@/components/editor/translate-dialog'
import VipUpgradeDialog from '@/components/vip/vip-upgrade-dialog'
import { useAppStore } from '@/state/store'
import { useEditorUiStore } from '@/state/editor-ui-store'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { useVipCheck } from '@/hooks/use-vip-check'

export interface InitialAiToolsResume {
  readonly id: string
  readonly title: string
  readonly content: ResumeData
  readonly template: string
}

interface MobileAiToolsClientProps {
  readonly initial: InitialAiToolsResume
  readonly initialTool: 'assistant' | 'translate'
}

/**
 * Shared AI surface for the mini-program web-view.
 * The page hydrates the desktop AI store once, then mirrors accepted AI changes
 * into the mobile draft store so the normal mobile save endpoint remains the
 * single persistence path.
 */
export default function MobileAiToolsClient(
  { initial, initialTool }: MobileAiToolsClientProps,
): ReactElement {
  const router = useRouter()
  const initializedRef = useRef(false)
  const setFromServer = useDraftStore((state) => state.setFromServer)
  const saveAll = useDraftStore((state) => state.saveAll)
  const dirtyCount = useDraftStore((state) => state.dirtyPaths.length)
  const isSaving = useDraftStore((state) => state.isSaving)
  const [tool, setTool] = useState<'assistant' | 'translate'>(initialTool)
  const { showUpgrade, setShowUpgrade } = useVipCheck()

  useEffect(() => {
    const draftState = useDraftStore.getState()
    if (draftState.resumeId !== initial.id || !draftState.draft) {
      setFromServer(initial.id, initial.content, initial.template)
    }
    const hydrated = useDraftStore.getState().draft || initial.content
    useAppStore.setState({ resume: hydrated })
    useEditorUiStore.setState({
      assistantResumeId: initial.id,
      activeModal: initialTool === 'translate' ? 'translate' : null,
      activePanel: initialTool === 'assistant' ? 'ai' : null,
      showAiChat: initialTool === 'assistant',
    })
    initializedRef.current = true

    const unsubscribe = useAppStore.subscribe((state, previous) => {
      if (!initializedRef.current || state.resume === previous.resume) return
      useDraftStore.getState().replaceDraft(state.resume)
    })
    return () => {
      initializedRef.current = false
      unsubscribe()
      useEditorUiStore.setState({
        assistantResumeId: null,
        activeModal: null,
        activePanel: null,
        showAiChat: false,
        assistantTask: null,
      })
    }
  }, [initial.content, initial.id, initial.template, initialTool, setFromServer])

  const openAssistant = (): void => {
    setTool('assistant')
    useEditorUiStore.setState({ activeModal: null, activePanel: 'ai', showAiChat: true })
  }

  const openTranslate = (): void => {
    setTool('translate')
    useEditorUiStore.getState().openModal('translate')
  }

  const handleSave = async (): Promise<void> => {
    const result = await saveAll()
    if (result.ok) toast.success('AI 修改已保存')
    else toast.error(result.error || '保存失败')
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-3 backdrop-blur">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 active:bg-slate-100"
          aria-label="返回编辑"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-[17px] font-semibold">AI 工具</div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving || dirtyCount === 0}
          className="flex h-10 items-center gap-1 rounded-xl px-2 text-sm font-medium text-violet-700 disabled:text-slate-300"
        >
          <Save size={17} />
          {isSaving ? '保存中' : '保存'}
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-col px-3 pb-8 pt-3">
        <section className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Sparkles size={21} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold">让 AI 直接帮你改简历</h1>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                基于当前简历内容给出建议，确认后再应用并保存。
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={openAssistant}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold ${tool === 'assistant' ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700'}`}
            >
              <Sparkles size={16} /> AI 助手
            </button>
            <button
              type="button"
              onClick={openTranslate}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold ${tool === 'translate' ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700'}`}
            >
              <Languages size={16} /> 翻译简历
            </button>
          </div>
        </section>

        {tool === 'assistant' ? (
          <section className="mt-3 min-h-[calc(100dvh-190px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <EditorAiPanel resumeId={initial.id} />
          </section>
        ) : (
          <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            请选择目标语言和保存方式，翻译结果会回写到当前简历草稿。
          </section>
        )}
      </main>

      <TranslateDialog
        resumeId={initial.id}
        template={initial.template}
        successPath={(resumeId) => `/m/edit?id=${encodeURIComponent(resumeId)}`}
      />
      <VipUpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />
    </div>
  )
}
