/**
 * Zustand store for AI section-level state.
 *
 * Persists the user's identity selection, cached JD text,
 * realistic mode preference, and polish level across sessions.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SectionIdentity, PolishLevel, JobCategory } from '@/lib/ai/section-types';

export interface AiSectionState {
  /** Current user identity for AI prompts. */
  readonly identity: SectionIdentity;
  /** Cached JD text so users don't re-paste it every time. */
  readonly cachedJobDescription: string;
  /** Preferred polish level. */
  readonly polishLevel: PolishLevel;
  /** Whether realistic mode is enabled by default. */
  readonly realisticMode: boolean;
  /** Preferred job category for self-evaluation generation. */
  readonly jobCategory: JobCategory | undefined;
}

export interface AiSectionActions {
  readonly setIdentity: (identity: SectionIdentity) => void;
  readonly setCachedJobDescription: (jd: string) => void;
  readonly setPolishLevel: (level: PolishLevel) => void;
  readonly setRealisticMode: (enabled: boolean) => void;
  readonly setJobCategory: (category: JobCategory | undefined) => void;
  readonly reset: () => void;
}

export type AiSectionStore = AiSectionState & AiSectionActions;

const DEFAULT_STATE: AiSectionState = {
  identity: 'student',
  cachedJobDescription: '',
  polishLevel: 'professional',
  realisticMode: false,
  jobCategory: undefined,
};

export const useAiSectionStore = create<AiSectionStore>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      setIdentity: (identity: SectionIdentity): void => {
        set({ identity }, false);
      },

      setCachedJobDescription: (jd: string): void => {
        set({ cachedJobDescription: jd }, false);
      },

      setPolishLevel: (level: PolishLevel): void => {
        set({ polishLevel: level }, false);
      },

      setRealisticMode: (enabled: boolean): void => {
        set({ realisticMode: enabled }, false);
      },

      setJobCategory: (category: JobCategory | undefined): void => {
        set({ jobCategory: category }, false);
      },

      reset: (): void => {
        set(DEFAULT_STATE, false);
      },
    }),
    {
      name: 'ai-section-preferences',
      partialize: (state) => ({
        identity: state.identity,
        cachedJobDescription: state.cachedJobDescription,
        polishLevel: state.polishLevel,
        realisticMode: state.realisticMode,
        jobCategory: state.jobCategory,
      }),
    },
  ),
);
