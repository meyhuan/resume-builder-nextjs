'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactElement, ReactNode } from 'react';
import AiPolishSheet from '@/components/ai-section/ai-polish-sheet';
import AiGenerateSheet from '@/components/ai-section/ai-generate-sheet';
import type { SectionIdentity, SectionModuleType } from '@/lib/ai/section-types';
import { useAppStore } from '@/state/store';
import type { ResumeBlock } from '@/entities/blocks/resume-block';
import { extractBlockPrefill } from '@/components/ai-section/block-module-utils';
import { track } from '@/lib/analytics';
import { trackAssistant } from '@/lib/ai/unified/analytics';
import { unifiedEnabled, type AssistantTask } from '@/lib/ai/unified/types';
import { toast } from 'sonner';
import { toResumeContext } from '@/lib/ai/resume-context';
import { useEditorUiStore } from '@/state/editor-ui-store';

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

interface AiSectionContextValue {
  readonly openPolish: (blockId: string, contentHtml: string, moduleType: SectionModuleType) => void;
  readonly openGenerate: (blockId: string, moduleType: SectionModuleType, block?: ResumeBlock) => void;
}

const AiSectionContext = createContext<AiSectionContextValue | null>(null);

/**
 * Hook to access AI section polish/generate actions from any block.
 */
const NOOP_CONTEXT: AiSectionContextValue = {
  openPolish: () => {},
  openGenerate: () => {},
}

export function useAiSection(): AiSectionContextValue {
  const ctx = useContext(AiSectionContext);
  // Outside the editor (e.g. print/puppeteer page) there is no Provider.
  // Return a no-op context so templates render without throwing.
  return ctx ?? NOOP_CONTEXT;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AiSectionProviderProps {
  readonly children: ReactNode;
  readonly defaultIdentity?: SectionIdentity;
  readonly requireVip?: () => boolean;
}

/**
 * Provides AI polish/generate sheet management to the editor tree.
 * Place this high in the component tree (e.g. wrapping the template area).
 */
export default function AiSectionProvider(props: AiSectionProviderProps): ReactElement {
  const { children, defaultIdentity = 'student', requireVip } = props;

  const setResume = useAppStore((s) => s.setResume);

  // Polish sheet state
  const [polishOpen, setPolishOpen] = useState<boolean>(false);
  const [polishBlockId, setPolishBlockId] = useState<string>('');
  const [polishContent, setPolishContent] = useState<string>('');
  const [polishModule, setPolishModule] = useState<SectionModuleType>('experience');

  // Generate sheet state
  const [generateOpen, setGenerateOpen] = useState<boolean>(false);
  const [generateBlockId, setGenerateBlockId] = useState<string>('');
  const [generateModule, setGenerateModule] = useState<SectionModuleType>('experience');
  const [generatePrefill, setGeneratePrefill] = useState<Record<string, string>>({});

  const openUnified = useCallback((feature: 'polish' | 'generate', blockId: string): boolean => {
    if (!unifiedEnabled || !window.matchMedia('(min-width: 768px)').matches) return false;
    if (useEditorUiStore.getState().assistantBusy) {
      toast.info('请先停止当前任务，再选择其它经历');
      return true;
    }
    const resume = useAppStore.getState().resume;
    const context = toResumeContext(resume);
    const section = context.sections.find(s => s.blocks.some(b => b.blockId === blockId));
    const label = section?.blocks.find(b => b.blockId === blockId)?.label;
    const task: AssistantTask = { id: crypto.randomUUID(), resumeId: useEditorUiStore.getState().assistantResumeId || resume.id || 'local', feature, blockId, label: [section?.title, label].filter(Boolean).join(' · '), entry: 'module' };
    trackAssistant('entry_open', { feature, requestedFeature: feature, taskId: task.id, entry: 'module', surface: 'block' });
    setPolishOpen(false); setGenerateOpen(false);
    useEditorUiStore.setState({ assistantTask: task, activePanel: 'ai', showAiChat: true });
    return true;
  }, []);

  const openPolish = useCallback(
    (blockId: string, contentHtml: string, moduleType: SectionModuleType): void => {
      if (openUnified('polish', blockId)) return;
      if (requireVip && !requireVip()) return;
      const context = toResumeContext(useAppStore.getState().resume);
      const section = context.sections.find((item) => item.blocks.some((block) => block.blockId === blockId));
      const label = section?.blocks.find((block) => block.blockId === blockId)?.label;
      useEditorUiStore.setState({ sectionAiTarget: [section?.title, label].filter(Boolean).join(' · ') });
      setGenerateOpen(false);
      useEditorUiStore.getState().setActivePanel('polish');
      setPolishBlockId(blockId);
      setPolishContent(contentHtml);
      setPolishModule(moduleType);
      setPolishOpen(true);
    },
    [requireVip, openUnified],
  );

  const openGenerate = useCallback(
    (blockId: string, moduleType: SectionModuleType, block?: ResumeBlock): void => {
      if (openUnified('generate', blockId)) return;
      if (requireVip && !requireVip()) return;
      const context = toResumeContext(useAppStore.getState().resume);
      const section = context.sections.find((item) => item.blocks.some((block) => block.blockId === blockId));
      const label = section?.blocks.find((block) => block.blockId === blockId)?.label;
      useEditorUiStore.setState({ sectionAiTarget: [section?.title, label].filter(Boolean).join(' · ') });
      setPolishOpen(false);
      useEditorUiStore.getState().setActivePanel('generate');
      setGenerateBlockId(blockId);
      setGenerateModule(moduleType);
      setGeneratePrefill(block ? extractBlockPrefill(block) : {});
      setGenerateOpen(true);
    },
    [requireVip, openUnified],
  );

  const handlePolishInsert = useCallback(
    (html: string): void => {
      track('ai_result_apply', {
        entry: 'ai_section_polish',
        aiAction: 'polish',
        blockId: polishBlockId,
        moduleType: polishModule,
        resultLength: html.length,
      });
      setResume((draft) => {
        for (const section of draft.sections) {
          for (let i = 0; i < section.blocks.length; i++) {
            const block: ResumeBlock = section.blocks[i];
            if (block.id === polishBlockId) {
              if ('contentHtml' in block) {
                section.blocks[i] = { ...block, contentHtml: html };
              } else if ('html' in block) {
                section.blocks[i] = { ...block, html: html };
              } else if ('courseHtml' in block) {
                section.blocks[i] = { ...block, courseHtml: html };
              }
              return;
            }
          }
        }
      });
    },
    [polishBlockId, polishModule, setResume],
  );

  const handleGenerateInsert = useCallback(
    (html: string): void => {
      track('ai_result_apply', {
        entry: 'ai_section_generate',
        aiAction: 'generate',
        blockId: generateBlockId,
        moduleType: generateModule,
        resultLength: html.length,
      });
      setResume((draft) => {
        for (const section of draft.sections) {
          for (let i = 0; i < section.blocks.length; i++) {
            const block: ResumeBlock = section.blocks[i];
            if (block.id === generateBlockId) {
              if ('contentHtml' in block) {
                section.blocks[i] = { ...block, contentHtml: html };
              } else if ('html' in block) {
                section.blocks[i] = { ...block, html: html };
              } else if ('courseHtml' in block) {
                section.blocks[i] = { ...block, courseHtml: html };
              }
              return;
            }
          }
        }
      });
    },
    [generateBlockId, generateModule, setResume],
  );

  const contextValue: AiSectionContextValue = { openPolish, openGenerate };

  return (
    <AiSectionContext.Provider value={contextValue}>
      {children}

      <AiPolishSheet
        key={`polish-${polishBlockId}`}
        open={polishOpen}
        onOpenChange={(open) => { setPolishOpen(open); if (!open && useEditorUiStore.getState().activePanel === 'polish') useEditorUiStore.getState().setActivePanel(null); }}
        originalContent={polishContent}
        moduleType={polishModule}
        defaultIdentity={defaultIdentity}
        onInsert={handlePolishInsert}
      />

      <AiGenerateSheet
        key={`generate-${generateBlockId}`}
        open={generateOpen}
        onOpenChange={(open) => { setGenerateOpen(open); if (!open && useEditorUiStore.getState().activePanel === 'generate') useEditorUiStore.getState().setActivePanel(null); }}
        moduleType={generateModule}
        defaultIdentity={defaultIdentity}
        blockPrefill={generatePrefill}
        onInsert={handleGenerateInsert}
      />
    </AiSectionContext.Provider>
  );
}
