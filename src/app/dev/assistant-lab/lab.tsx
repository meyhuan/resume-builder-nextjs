'use client';
import { useEffect } from 'react';
import { useAppStore } from '@/state/store';
import { EditorAiPanel } from '@/components/ai-chat/editor-ai-panel';
import AiSectionProvider, {
  useAiSection,
} from '@/components/ai-section/ai-section-provider';
import EditableBlockWrapper from '@/editor/editable-block-wrapper';
import type { ResumeData } from '@/entities/resume/resume-data';
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
      <div className="mt-5 flex justify-end gap-4 text-sm text-violet-600">
        <button onClick={() => ai.openPolish('campus-activity', '', 'campus')}>
          AI润色
        </button>
        <button onClick={() => ai.openGenerate('campus-activity', 'campus')}>
          AI帮我写
        </button>
      </div>
    </div>
  );
}
export default function AssistantLab() {
  useEffect(() => {
    useAppStore.setState({ resume: sample, pastStates: [], futureStates: [] });
  }, []);
  return (
    <AiSectionProvider>
      <main className="flex h-screen bg-slate-100">
        <section className="min-w-0 flex-1 overflow-auto p-10">
          <Content />
        </section>
        <aside className="w-[380px] shrink-0 border-l bg-white">
          <EditorAiPanel />
        </aside>
      </main>
    </AiSectionProvider>
  );
}
