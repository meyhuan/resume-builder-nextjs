'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import type { ResumeData } from '@/entities/resume/resume-data'

/**
 * Result returned by saveAll().
 */
export interface SaveResult {
  readonly ok: boolean
  readonly error?: string
}

/**
 * Draft state for the mobile edit pages.
 *
 * The store keeps a local copy of the resume that the user is editing plus
 * a set of dirty field paths. On manual save, we send the full resume to the
 * server via PUT /next-api/resumes/:id, then clear the dirty set.
 */
export interface DraftState {
  readonly resumeId: string | null
  readonly draft: ResumeData | null
  readonly server: ResumeData | null
  readonly dirtyPaths: readonly string[]
  readonly lastSavedAt: number | null
  readonly isSaving: boolean
  readonly celebratedMilestones: readonly number[]
  setFromServer: (id: string, resume: ResumeData) => void
  updateDraft: (path: string, updater: (draft: ResumeData) => void) => void
  replaceDraft: (next: ResumeData) => void
  reorderSections: (fromIdx: number, toIdx: number) => void
  discardAll: () => void
  saveAll: () => Promise<SaveResult>
  markMilestoneCelebrated: (milestone: number) => void
}

/**
 * IndexedDB-backed storage adapter for zustand persist.
 */
const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value: unknown = await idbGet(name)
    return typeof value === 'string' ? value : null
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await idbSet(name, value)
  },
  removeItem: async (name: string): Promise<void> => {
    await idbDel(name)
  },
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      resumeId: null,
      draft: null,
      server: null,
      dirtyPaths: [],
      lastSavedAt: null,
      isSaving: false,
      celebratedMilestones: [],
      setFromServer: (id, resume): void => {
        const current = get()
        // If user has unsaved local draft for the same resume, keep it.
        if (current.resumeId === id && current.draft && current.dirtyPaths.length > 0) {
          set({ server: resume })
          return
        }
        set({ resumeId: id, draft: resume, server: resume, dirtyPaths: [] })
      },
      updateDraft: (path, updater): void => {
        const current = get().draft
        if (!current) return
        const next = structuredClone(current)
        updater(next)
        const dirty = new Set(get().dirtyPaths)
        dirty.add(path)
        set({ draft: next, dirtyPaths: Array.from(dirty) })
      },
      replaceDraft: (next): void => {
        set({ draft: next, dirtyPaths: ['*'] })
      },
      reorderSections: (fromIdx, toIdx): void => {
        const current = get().draft
        if (!current) return
        if (fromIdx === toIdx) return
        if (fromIdx < 0 || toIdx < 0) return
        if (fromIdx >= current.sections.length || toIdx >= current.sections.length) return
        const next = structuredClone(current)
        const [moved] = next.sections.splice(fromIdx, 1)
        next.sections.splice(toIdx, 0, moved)
        const dirty = new Set(get().dirtyPaths)
        dirty.add(`sections.reorder.${fromIdx}.${toIdx}`)
        set({ draft: next, dirtyPaths: Array.from(dirty) })
      },
      discardAll: (): void => {
        const server = get().server
        set({ draft: server, dirtyPaths: [] })
      },
      saveAll: async (): Promise<SaveResult> => {
        const { resumeId, draft } = get()
        if (!resumeId || !draft) {
          return { ok: false, error: '无草稿可保存' }
        }
        set({ isSaving: true })
        try {
          const res = await fetch(`/next-api/resumes/${resumeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: draft }),
          })
          if (!res.ok) {
            const text = await res.text().catch(() => '')
            throw new Error(text || `保存失败 (${res.status})`)
          }
          set({
            server: draft,
            dirtyPaths: [],
            lastSavedAt: Date.now(),
            isSaving: false,
          })
          return { ok: true }
        } catch (err: unknown) {
          set({ isSaving: false })
          const msg: string = err instanceof Error ? err.message : '网络错误'
          return { ok: false, error: msg }
        }
      },
      markMilestoneCelebrated: (milestone): void => {
        const list = new Set(get().celebratedMilestones)
        list.add(milestone)
        set({ celebratedMilestones: Array.from(list) })
      },
    }),
    {
      name: 'resume-draft-v1',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        resumeId: state.resumeId,
        draft: state.draft,
        dirtyPaths: state.dirtyPaths,
        celebratedMilestones: state.celebratedMilestones,
      }),
    },
  ),
)

/**
 * Selector: whether the draft has unsaved changes.
 */
export function selectIsDirty(state: DraftState): boolean {
  return state.dirtyPaths.length > 0
}
