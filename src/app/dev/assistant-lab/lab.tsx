'use client';
import { useEffect } from 'react';
import { useAppStore } from '@/state/store';
import { EditorAiPanel } from '@/components/ai-chat/editor-ai-panel';
import AiSectionProvider, {
  useAiSection,
} from '@/components/ai-section/ai-section-provider';
import EditableBlockWrapper from '@/editor/editable-block-wrapper';
import type { ResumeData } from '@/entities/resume/resume-data';
import BlockActions from '@/components/blocks/block-actions';
import EditorWorkspaceTabs from '@/ui/editor-workspace-tabs';
import { useEditorUiStore } from '@/state/editor-ui-store';
const sample: ResumeData = {
  id: 'assistant-lab',
  name: '演示简历',
  sections: [
    {
      id: 'campus',
      columns: 1,
      title: '在校经历',
      blocks: [
        {
          id: 'campus-activity',
          type: 'campus',
          organization: '校园旧物交换活动',
          position: '志愿者',
          startDate: '2025.10',
          endDate: '2025.11',
          contentHtml:
            '<p>整理报名同学提交的物品信息，核对领取时间与联系方式；活动当天协助登记和发放，结束后整理未领取物品清单，交给活动负责人。</p>',
        },
      ],
    },
  ],
};
function Content() {
  const ai = useAiSection();
  return (
    <div className="mx-auto max-w-3xl rounded-xl bg-white p-10 shadow-sm">
      <h1 className="mb-6 text-2xl font-bold text-cyan-700">在校经历</h1>
      <h2 className="mb-4 text-xl font-semibold">
        校园旧物交换活动{' '}
        <span className="text-base font-normal text-slate-500">｜志愿者</span>
      </h2>
      <EditableBlockWrapper
        blockId="campus-activity"
        contentField="contentHtml"
      />
      <div className="relative mt-5 h-10">
        <BlockActions
          blockType="校园经历"
          onPolish={() => ai.openPolish('campus-activity', '', 'campus')}
          onGenerate={() => ai.openGenerate('campus-activity', 'campus')}
        />
      </div>
    </div>
  );
}
export default function AssistantLab() {
  const activePanel = useEditorUiStore((s) => s.activePanel);
  const setActivePanel = useEditorUiStore((s) => s.setActivePanel);
  useEffect(() => {
    useAppStore.setState({ resume: sample, pastStates: [], futureStates: [] });
  }, []);
  return (
    <AiSectionProvider>
      <main className="flex h-screen bg-slate-100">
        <section className="min-w-0 flex-1 overflow-auto p-10">
          <Content />
        </section>
        <aside className="flex w-[380px] shrink-0 flex-col border-l bg-white">
          <EditorWorkspaceTabs
            activePanel={activePanel}
            onChange={setActivePanel}
          />
          <div className={activePanel === 'ai' ? 'min-h-0 flex-1' : 'hidden'}>
            <EditorAiPanel />
          </div>
        </aside>
      </main>
    </AiSectionProvider>
  );
}
