import { create } from 'zustand';

export type EditorModal =
  | 'jd-analysis'
  | 'translate'
  | 'cover-letter'
  | 'interview-prep'
  | 'grammar-check'
  | 'optimize'
  | null;

interface EditorUiStore {
  activeModal: EditorModal;
  showAiChat: boolean;
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
  activeModal: null,
  showAiChat: false,
  pendingAiMessage: null,
  pendingJobDescription: null,

  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
  toggleAiChat: () => set((state) => ({ showAiChat: !state.showAiChat })),
  setShowAiChat: (show) => set({ showAiChat: show }),
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
      set({ pendingAiMessage: message, showAiChat: true });
    }, 280);
  },
}));
