import type { AssistantTask } from '@/lib/ai/unified/types';
import { create } from 'zustand';
import type { PanelId } from '@/ui/editor-toolbar';

export type EditorModal =
  | 'jd-analysis'
  | 'translate'
  | 'cover-letter'
  | 'interview-prep'
  | 'grammar-check'
  | 'optimize'
  | null;

interface EditorUiStore {
  editingBlockIds: readonly string[];
  setBlockEditing: (blockId: string, editing: boolean) => void;
  activePanel: PanelId | 'ai' | 'polish' | 'generate' | null;
  setActivePanel: (panel: PanelId | 'ai' | 'polish' | 'generate' | null) => void;
  sectionAiTarget: string;
  activeModal: EditorModal;
  showAiChat: boolean;
  assistantResumeId: string | null;
  assistantTask: AssistantTask | null;
  assistantBusy: boolean;
  pendingAiMessage: string | null;
  pendingJobDescription: string | null;
  openModal: (modal: Exclude<EditorModal, null>) => void;
  closeModal: () => void;
  toggleAiChat: () => void;
  setShowAiChat: (show: boolean) => void;
  setPendingAiMessage: (message: string | null) => void;
  clearPendingJobDescription: () => void;
  openInterviewPrep: (jobDescription: string) => void;
  handoffToChat: (message: string) => void;
}

export const useEditorUiStore = create<EditorUiStore>((set) => ({
  editingBlockIds: [],
  setBlockEditing: (blockId, editing) => set((state) => ({
    editingBlockIds: editing
      ? Array.from(new Set([...state.editingBlockIds, blockId]))
      : state.editingBlockIds.filter((id) => id !== blockId),
  })),
  activePanel: null,
  setActivePanel: (panel) => set({ activePanel: panel, showAiChat: panel === 'ai' }),
  sectionAiTarget: '',
  activeModal: null,
  showAiChat: false,
  assistantResumeId: null,
  assistantTask: null,
  assistantBusy: false,
  pendingAiMessage: null,
  pendingJobDescription: null,

  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
  toggleAiChat: () => set((state) => ({ showAiChat: !state.showAiChat, activePanel: state.showAiChat ? null : 'ai' })),
  setShowAiChat: (show) => set((state) => ({ showAiChat: show, activePanel: show ? 'ai' : state.activePanel === 'ai' ? null : state.activePanel })),
  setPendingAiMessage: (message) => set({ pendingAiMessage: message }),
  clearPendingJobDescription: () => set({ pendingJobDescription: null }),
  openInterviewPrep: (jobDescription) => {
    set({ activeModal: null, pendingJobDescription: jobDescription });
    window.setTimeout(() => {
      set({ activeModal: 'interview-prep' });
    }, 280);
  },
  handoffToChat: (message) => {
    set({ activeModal: null });
    window.setTimeout(() => {
      set({ pendingAiMessage: message, showAiChat: true, activePanel: 'ai' });
    }, 280);
  },
}));
