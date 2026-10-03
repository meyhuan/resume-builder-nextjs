'use client';
import { useEffect, useState } from 'react';
import { get, set } from 'idb-keyval';
import { GrammarCheckDialog } from '@/components/editor/grammar-check-dialog';
import { targetSnapshot } from '@/lib/ai/unified/policy';
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
import { ResizableEditorSidebar } from '@/ui/resizable-editor-sidebar';
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
  const [revision, setRevision] = useState(0);
  const [demo, setDemo] = useState(false);
  const loadReviewDemo = async () => {
    const resume: ResumeData = {
      ...sample,
      sections: [
        ...sample.sections,
        {
          id: 'skills',
          title: '相关技能',
          columns: 1,
          blocks: [
            {
              id: 'skills-text',
              type: 'text',
              html: '<p>会使用 Excel 整理报名信息。</p>',
            },
          ],
        },
      ],
    };
    useAppStore.setState({ resume, pastStates: [], futureStates: [] });
    const task = {
      id: crypto.randomUUID(),
      resumeId: sample.id,
      feature: 'chat',
      scope: 'resume',
      entry: 'resume_check',
      label: '整份简历优化',
    };
    const proposals = [
      {
        action: 'updateBlock',
        blockId: 'campus-activity',
        html: '<p>整理报名物品信息，核对领取时间和联系方式；活动当天协助登记、发放物品；活动结束后整理未领取清单并交给负责人。</p>',
        targetLabel: '在校经历 · 校园旧物交换活动',
        factChecked: true,
        before: targetSnapshot(resume, 'campus-activity'),
      },
      {
        action: 'updateBlock',
        blockId: 'skills-text',
        html: '<p>使用 Excel 整理报名信息。</p>',
        targetLabel: '相关技能',
        factChecked: true,
        before: targetSnapshot(resume, 'skills-text'),
      },
    ];
    const turn = {
      requestId: crypto.randomUUID(),
      text: '优化整份简历',
      answer: '演示数据：已整理 2 处修改建议，请核对差异后选择应用。',
      scope: 'resume',
      proposals,
      questions: [],
      coverage: proposals.map((p) => ({
        blockId: p.blockId,
        label: p.targetLabel,
        status: 'proposed',
      })),
      followups: ['这次调整了哪些表达？', '哪些信息需要我核对？'],
      direct: false,
      charged: false,
      feature: 'chat',
    };
    const key = `ai-unified-history:${sample.id}`;
    const saved = await get(key);
    await set(
      key,
      [
        {
          task,
          turns: [turn],
          reviews: {},
          receipts: {},
          updatedAt: Date.now(),
        },
        ...(Array.isArray(saved) ? saved : []),
      ].slice(0, 20),
    );
    useEditorUiStore.setState({
      assistantTask: null,
      activePanel: 'ai',
      showAiChat: true,
      pendingAiMessage: null,
    });
    setDemo(true);
    setRevision((value) => value + 1);
  };
  const activePanel = useEditorUiStore((s) => s.activePanel);
  const setActivePanel = useEditorUiStore((s) => s.setActivePanel);
  useEffect(() => {
    useAppStore.setState({ resume: sample, pastStates: [], futureStates: [] });
  }, []);
  return (
    <AiSectionProvider>
      <main className="flex h-screen bg-slate-100">
        <section
          data-editor-canvas
          className="hidden min-w-0 flex-1 overflow-auto p-10 md:block"
        >
          <Content />
        </section>
        <ResizableEditorSidebar open className="flex flex-col">
          <div className="flex flex-wrap gap-2 border-b p-2 text-xs text-violet-700">
            <button
              onClick={() =>
                useEditorUiStore.getState().openModal('grammar-check')
              }
            >
              简历检查
            </button>
            <button onClick={() => void loadReviewDemo()}>
              加载全文优化示例（模拟）
            </button>
            {demo && (
              <span className="text-amber-700">当前为模拟结果，不调用模型</span>
            )}
          </div>
          <EditorWorkspaceTabs
            activePanel={activePanel}
            onChange={setActivePanel}
          />
          <div className={activePanel === 'ai' ? 'min-h-0 flex-1' : 'hidden'}>
            <EditorAiPanel key={revision} />
          </div>
        </ResizableEditorSidebar>
      </main>
      <GrammarCheckDialog resumeId={sample.id} />
    </AiSectionProvider>
  );
}
