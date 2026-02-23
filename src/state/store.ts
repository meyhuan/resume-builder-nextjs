/**
 * Global app store using Zustand with Immer.
 * Holds resume data and theme tokens, and exposes minimal actions.
 * Includes undo/redo history for resume changes with debounced pushes.
 */
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { produce } from 'immer'
import type { AppState } from '@/state/app-state'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { UUID } from '@/entities/common/uuid'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ExternalResume } from '@/io/external-resume-types'
import { mapExternalResume } from '@/io/external-resume-importer'
import { BLANK_RESUME_JSON, TEST_RESUME_JSON } from '@/io/default-resume-data'
import { createDefaultBlock } from '@/entities/blocks/block-factory'

const DEFAULT_FONT_SIZE: number = 14
const defaultTheme: ThemeTokens = {
  primaryColor: '#111827',
  textColor: '#111827',
  fontFamily: 'Inter, Noto Sans SC, system-ui, sans-serif',
  fontSize: DEFAULT_FONT_SIZE,
  lineHeight: 1.5,
  spacingScale: 1,
}

export const defaultResume = mapExternalResume(BLANK_RESUME_JSON)
const testResume = mapExternalResume(TEST_RESUME_JSON)

function createId(prefix: string): UUID {
  const ts: string = Date.now().toString(36)
  const rnd: string = Math.random().toString(36).slice(2, 6)
  return `${prefix}-${ts}-${rnd}`
}

const DEFAULT_NEW_TEXT_HTML: string = '<p>New text block. Click to edit.</p>'

/** Maximum number of undo history entries. */
const MAX_HISTORY = 50
/** Debounce window (ms) — rapid changes within this window merge into one entry. */
const HISTORY_DEBOUNCE_MS = 500

/** Timestamp of last history push (module-level for debounce). */
let lastPushTs = 0

/**
 * Push the current resume onto the undo stack with debounce.
 * Returns the new pastStates and cleared futureStates.
 */
function pushHistory(
  current: ResumeData,
  past: readonly ResumeData[],
): readonly ResumeData[] {
  const now = Date.now()
  const isDebounced = now - lastPushTs < HISTORY_DEBOUNCE_MS && past.length > 0
  lastPushTs = now
  if (isDebounced) {
    // Replace the most recent entry instead of pushing a new one
    return past
  }
  const next = [...past, current]
  if (next.length > MAX_HISTORY) {
    next.shift()
  }
  return next
}

/**
 * Create app store.
 */
export const useAppStore = create<AppState>()(
  devtools((set, get) => ({
    resume: defaultResume,
    themes: {},
    pastStates: [],
    futureStates: [],
    undo: () =>
      set((state) => {
        if (state.pastStates.length === 0) return state
        const past = [...state.pastStates]
        const previous = past.pop()!
        return {
          pastStates: past,
          futureStates: [...state.futureStates, state.resume],
          resume: previous,
        }
      }, false, 'history/undo'),
    redo: () =>
      set((state) => {
        if (state.futureStates.length === 0) return state
        const future = [...state.futureStates]
        const next = future.pop()!
        return {
          futureStates: future,
          pastStates: [...state.pastStates, state.resume],
          resume: next,
        }
      }, false, 'history/redo'),
    loadTestData: () => {
      const state = get()
      set(() => ({
        pastStates: pushHistory(state.resume, state.pastStates),
        futureStates: [],
        resume: testResume,
      }), false, 'resume/loadTest')
    },
    setResume: (updater) => {
      const state = get()
      set(() => ({
        pastStates: pushHistory(state.resume, state.pastStates),
        futureStates: [],
        resume: produce(state.resume, updater),
      }), false, 'resume/set')
    },
    getThemeForTemplate: (templateId) => {
      const state = get()
      return state.themes[templateId] || defaultTheme
    },
    setThemeForTemplate: (templateId, updater) =>
      set((state) => {
        const currentTheme = state.themes[templateId] || defaultTheme
        return {
          themes: {
            ...state.themes,
            [templateId]: produce(currentTheme, updater),
          },
        }
      }, false, `theme/set/${templateId}`),
    moveBlockInSection: (sectionId, activeId, overId) => {
      const state = get()
      set(() => ({
        pastStates: pushHistory(state.resume, state.pastStates),
        futureStates: [],
        resume: produce(state.resume, (draft) => {
          const section = draft.sections.find((s) => s.id === sectionId)
          if (!section) return
          const fromIdx: number = section.blocks.findIndex((b) => b.id === activeId)
          const toIdx: number = section.blocks.findIndex((b) => b.id === overId)
          if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
          const [moved] = section.blocks.splice(fromIdx, 1)
          section.blocks.splice(toIdx, 0, moved)
        }),
      }), false, 'section/moveBlock')
    },
    moveBlockToSection: (fromSectionId, blockId, toSectionId, toIndex) => {
      const state = get()
      set(() => ({
        pastStates: pushHistory(state.resume, state.pastStates),
        futureStates: [],
        resume: produce(state.resume, (draft) => {
          const fromSection = draft.sections.find((s) => s.id === fromSectionId)
          const toSection = draft.sections.find((s) => s.id === toSectionId)
          if (!fromSection || !toSection) return
          const blockIdx: number = fromSection.blocks.findIndex((b) => b.id === blockId)
          if (blockIdx < 0) return
          const [block] = fromSection.blocks.splice(blockIdx, 1)
          toSection.blocks.splice(toIndex, 0, block)
        }),
      }), false, 'section/moveBlockToSection')
    },
    addTextBlock: (sectionId) => {
      const state = get()
      set(() => ({
        pastStates: pushHistory(state.resume, state.pastStates),
        futureStates: [],
        resume: produce(state.resume, (draft) => {
          const section = draft.sections.find((s) => s.id === sectionId)
          if (!section) return
          const newBlock = {
            id: createId('block'),
            type: 'text' as const,
            html: DEFAULT_NEW_TEXT_HTML,
          }
          section.blocks.push(newBlock)
        }),
      }), false, 'section/addTextBlock')
    },
    addBlockByType: (sectionId) => {
      const state = get()
      set(() => ({
        pastStates: pushHistory(state.resume, state.pastStates),
        futureStates: [],
        resume: produce(state.resume, (draft) => {
          const section = draft.sections.find((s) => s.id === sectionId)
          if (!section) return
          section.blocks.push(createDefaultBlock(section.title, createId))
        }),
      }), false, 'section/addBlockByType')
    },
    deleteBlock: (sectionId, blockId) => {
      const state = get()
      set(() => ({
        pastStates: pushHistory(state.resume, state.pastStates),
        futureStates: [],
        resume: produce(state.resume, (draft) => {
          const section = draft.sections.find((s) => s.id === sectionId)
          if (!section) return
          const idx: number = section.blocks.findIndex((b) => b.id === blockId)
          if (idx >= 0) {
            section.blocks.splice(idx, 1)
          }
        }),
      }), false, 'section/deleteBlock')
    },
    moveBlockUp: (sectionId, blockId) => {
      const state = get()
      set(() => ({
        pastStates: pushHistory(state.resume, state.pastStates),
        futureStates: [],
        resume: produce(state.resume, (draft) => {
          const section = draft.sections.find((s) => s.id === sectionId)
          if (!section) return
          const idx: number = section.blocks.findIndex((b) => b.id === blockId)
          if (idx <= 0) return
          const temp = section.blocks[idx]
          section.blocks[idx] = section.blocks[idx - 1]
          section.blocks[idx - 1] = temp
        }),
      }), false, 'section/moveBlockUp')
    },
    moveBlockDown: (sectionId, blockId) => {
      const state = get()
      set(() => ({
        pastStates: pushHistory(state.resume, state.pastStates),
        futureStates: [],
        resume: produce(state.resume, (draft) => {
          const section = draft.sections.find((s) => s.id === sectionId)
          if (!section) return
          const idx: number = section.blocks.findIndex((b) => b.id === blockId)
          if (idx < 0 || idx >= section.blocks.length - 1) return
          const temp = section.blocks[idx]
          section.blocks[idx] = section.blocks[idx + 1]
          section.blocks[idx + 1] = temp
        }),
      }), false, 'section/moveBlockDown')
    },
    moveSection: (activeSectionId, overSectionId) => {
      const state = get()
      set(() => ({
        pastStates: pushHistory(state.resume, state.pastStates),
        futureStates: [],
        resume: produce(state.resume, (draft) => {
          const from: number = draft.sections.findIndex((s) => s.id === activeSectionId)
          const to: number = draft.sections.findIndex((s) => s.id === overSectionId)
          if (from < 0 || to < 0 || from === to) return
          const [moved] = draft.sections.splice(from, 1)
          draft.sections.splice(to, 0, moved)
        }),
      }), false, 'section/moveSection')
    },
    addSection: (title) => {
      const state = get()
      set(() => ({
        pastStates: pushHistory(state.resume, state.pastStates),
        futureStates: [],
        resume: produce(state.resume, (draft) => {
          draft.sections.push({
            id: createId('section'),
            title,
            columns: 1,
            blocks: [createDefaultBlock(title, createId)],
          })
        }),
      }), false, 'section/addSection')
    },
    updateSectionTitle: (sectionId, title) => {
      const state = get()
      set(() => ({
        pastStates: pushHistory(state.resume, state.pastStates),
        futureStates: [],
        resume: produce(state.resume, (draft) => {
          const section = draft.sections.find((s) => s.id === sectionId)
          if (section) section.title = title
        }),
      }), false, 'section/updateSectionTitle')
    },
    deleteSection: (sectionId) => {
      const state = get()
      set(() => ({
        pastStates: pushHistory(state.resume, state.pastStates),
        futureStates: [],
        resume: produce(state.resume, (draft) => {
          const idx: number = draft.sections.findIndex((s) => s.id === sectionId)
          if (idx >= 0) {
            draft.sections.splice(idx, 1)
          }
        }),
      }), false, 'section/deleteSection')
    },
    importExternalResume: (external: ExternalResume) => {
      const state = get()
      set(() => ({
        pastStates: pushHistory(state.resume, state.pastStates),
        futureStates: [],
        resume: mapExternalResume(external),
      }), false, 'resume/import')
    },
    updateBaseInfo: (baseInfo, name) => {
      const state = get()
      set(() => ({
        pastStates: pushHistory(state.resume, state.pastStates),
        futureStates: [],
        resume: produce(state.resume, (draft) => {
          draft.name = name
          draft.baseInfo = baseInfo
        }),
      }), false, 'resume/updateBaseInfo')
    },
    updateJobIntention: (jobIntention) => {
      const state = get()
      set(() => ({
        pastStates: pushHistory(state.resume, state.pastStates),
        futureStates: [],
        resume: produce(state.resume, (draft) => {
          draft.jobIntention = jobIntention
        }),
      }), false, 'resume/updateJobIntention')
    },
  }))
)
