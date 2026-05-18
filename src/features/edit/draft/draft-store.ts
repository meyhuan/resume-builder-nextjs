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
  readonly templateId: string
  readonly hiddenSectionIds: readonly string[]
  setFromServer: (id: string, resume: ResumeData, templateId?: string) => void
  updateDraft: (path: string, updater: (draft: ResumeData) => void) => void
  replaceDraft: (next: ResumeData) => void
  reorderSections: (fromIdx: number, toIdx: number) => void
  toggleSectionHidden: (sectionId: string) => void
  removeSection: (sectionId: string) => void
  discardAll: () => void
  saveAll: () => Promise<SaveResult>
  /**
   * Persist a freshly-captured resume thumbnail (data URL) alongside the
   * current draft content. Called from the preview page after the template
   * renders, so the saved cover reflects the real layout.
   */
  saveThumbnail: (dataUrl: string) => Promise<SaveResult>
  markMilestoneCelebrated: (milestone: number) => void
}

/**
 * Ensure required collection fields exist even when a resume was persisted
 * with an empty content object (e.g. a freshly-created blank resume saved as
 * `{}`). Without this normalization, downstream consumers iterating
 * `sections` would crash with "Cannot read properties of undefined".
 */
function normalizeResume(resume: ResumeData | null | undefined, fallbackId: string): ResumeData {
  const base = (resume ?? {}) as Partial<ResumeData>
  return {
    id: base.id ?? fallbackId,
    name: base.name ?? '',
    contactHtml: base.contactHtml,
    baseInfo: base.baseInfo,
    jobIntention: base.jobIntention,
    jobIntentionVisible: base.jobIntentionVisible,
    sections: Array.isArray(base.sections) ? base.sections : [],
  }
}

/**
 * IndexedDB-backed storage adapter for zustand persist.
 * Returns a noop adapter during SSR to avoid "indexedDB is not defined".
 */
function makeIdbStorage() {
  if (typeof window === 'undefined') {
    return {
      getItem: async (_name: string): Promise<string | null> => null,
      setItem: async (_name: string, _value: string): Promise<void> => {},
      removeItem: async (_name: string): Promise<void> => {},
    }
  }
  return {
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
      templateId: 'simple',
      hiddenSectionIds: [],
      setFromServer: (id, resume, templateId): void => {
        const normalized: ResumeData = normalizeResume(resume, id)
        const current = get()
        // If user has unsaved local draft for the same resume, keep it.
        if (current.resumeId === id && current.draft && current.dirtyPaths.length > 0) {
          set({ server: normalized, templateId: templateId ?? current.templateId })
          return
        }
        set({
          resumeId: id,
          draft: normalized,
          server: normalized,
          dirtyPaths: [],
          templateId: templateId ?? 'simple',
        })
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
      toggleSectionHidden: (sectionId): void => {
        const hidden = new Set(get().hiddenSectionIds)
        if (hidden.has(sectionId)) hidden.delete(sectionId)
        else hidden.add(sectionId)
        set({ hiddenSectionIds: Array.from(hidden) })
      },
      removeSection: (sectionId): void => {
        const current = get().draft
        if (!current) return
        const next = structuredClone(current)
        const idx = next.sections.findIndex((s) => s.id === sectionId)
        if (idx < 0) return
        next.sections.splice(idx, 1)
        const dirty = new Set(get().dirtyPaths)
        dirty.add(`sections.${sectionId}.remove`)
        const hidden = new Set(get().hiddenSectionIds)
        hidden.delete(sectionId)
        set({ draft: next, dirtyPaths: Array.from(dirty), hiddenSectionIds: Array.from(hidden) })
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
      saveThumbnail: async (dataUrl): Promise<SaveResult> => {
        const { resumeId, draft } = get()
        if (!resumeId || !draft) {
          return { ok: false, error: '无可保存的简历' }
        }
        try {
          const res = await fetch(`/next-api/resumes/${resumeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: draft, thumbnail: dataUrl }),
          })
          if (!res.ok) {
            const text = await res.text().catch(() => '')
            throw new Error(text || `封面保存失败 (${res.status})`)
          }
          return { ok: true }
        } catch (err: unknown) {
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
      storage: createJSONStorage(() => makeIdbStorage()),
      partialize: (state) => ({
        resumeId: state.resumeId,
        draft: state.draft,
        dirtyPaths: state.dirtyPaths,
        celebratedMilestones: state.celebratedMilestones,
        hiddenSectionIds: state.hiddenSectionIds,
      }),
      onRehydrateStorage: () => (state): void => {
        // Older persisted drafts may lack a `sections` array; normalize on
        // rehydrate so components that iterate sections never see undefined.
        if (!state) return
        const mutable = state as {
          -readonly [K in keyof DraftState]: DraftState[K]
        }
        if (mutable.draft && mutable.resumeId) {
          mutable.draft = normalizeResume(mutable.draft, mutable.resumeId)
        }
        if (mutable.server && mutable.resumeId) {
          mutable.server = normalizeResume(mutable.server, mutable.resumeId)
        }
      },
    },
  ),
)

/**
 * Selector: whether the draft has unsaved changes.
 */
export function selectIsDirty(state: DraftState): boolean {
  return state.dirtyPaths.length > 0
}
