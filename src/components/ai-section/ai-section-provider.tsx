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

  const openPolish = useCallback(
    (blockId: string, contentHtml: string, moduleType: SectionModuleType): void => {
      if (requireVip && !requireVip()) return;
      setPolishBlockId(blockId);
      setPolishContent(contentHtml);
      setPolishModule(moduleType);
      setPolishOpen(true);
    },
    [requireVip],
  );

  const openGenerate = useCallback(
    (blockId: string, moduleType: SectionModuleType, block?: ResumeBlock): void => {
      if (requireVip && !requireVip()) return;
      setGenerateBlockId(blockId);
      setGenerateModule(moduleType);
      setGeneratePrefill(block ? extractBlockPrefill(block) : {});
      setGenerateOpen(true);
    },
    [requireVip],
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
        open={polishOpen}
        onOpenChange={setPolishOpen}
        originalContent={polishContent}
        moduleType={polishModule}
        defaultIdentity={defaultIdentity}
        onInsert={handlePolishInsert}
      />

      <AiGenerateSheet
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        moduleType={generateModule}
        defaultIdentity={defaultIdentity}
        blockPrefill={generatePrefill}
        onInsert={handleGenerateInsert}
      />
    </AiSectionContext.Provider>
  );
}
