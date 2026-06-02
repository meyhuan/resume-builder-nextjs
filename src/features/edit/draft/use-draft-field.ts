'use client'

import { useCallback } from 'react'
import type { ResumeData } from '@/entities/resume/resume-data'
import { useDraftStore } from './draft-store'

type Setter<T> = (next: T) => void

/**
 * Returned bindings: current value from the draft plus a setter that updates
 * the draft store and marks the path as dirty.
 */
export interface FieldBinding<T> {
  readonly value: T
  readonly setValue: Setter<T>
}

/**
 * Build a binding for a scalar field under `resume.baseInfo.<key>`.
 */
export function useBaseInfoField<K extends keyof NonNullable<ResumeData['baseInfo']>>(
  key: K,
): FieldBinding<NonNullable<ResumeData['baseInfo']>[K] | undefined> {
  const draft = useDraftStore((s) => s.draft)
  const updateDraft = useDraftStore((s) => s.updateDraft)
  const value = draft?.baseInfo?.[key]
  const setValue = useCallback<Setter<NonNullable<ResumeData['baseInfo']>[K] | undefined>>(
    (next) => {
      updateDraft(`baseInfo.${String(key)}`, (d) => {
        const bi = (d.baseInfo ?? {}) as NonNullable<ResumeData['baseInfo']>
        const mutable = { ...bi } as Record<string, unknown>
        mutable[String(key)] = next
        ;(d as { baseInfo?: unknown }).baseInfo = mutable as NonNullable<ResumeData['baseInfo']>
      })
    },
    [key, updateDraft],
  )
  return { value, setValue }
}

/**
 * Build a binding for a scalar field under `resume.jobIntention.<key>`.
 */
export function useJobIntentionField<K extends keyof NonNullable<ResumeData['jobIntention']>>(
  key: K,
): FieldBinding<NonNullable<ResumeData['jobIntention']>[K] | undefined> {
  const draft = useDraftStore((s) => s.draft)
  const updateDraft = useDraftStore((s) => s.updateDraft)
  const value = draft?.jobIntention?.[key]
  const setValue = useCallback<Setter<NonNullable<ResumeData['jobIntention']>[K] | undefined>>(
    (next) => {
      updateDraft(`jobIntention.${String(key)}`, (d) => {
        const ji = (d.jobIntention ?? {}) as NonNullable<ResumeData['jobIntention']>
        const mutable = { ...ji } as Record<string, unknown>
        const fieldKey = String(key)
        mutable[fieldKey] = next
        ;(d as { jobIntention?: unknown }).jobIntention = mutable as NonNullable<ResumeData['jobIntention']>
        if (fieldKey === 'position') {
          const position = typeof next === 'string' ? next.trim() || undefined : undefined
          const bi = (d.baseInfo ?? {}) as NonNullable<ResumeData['baseInfo']>
          ;(d as { baseInfo?: unknown }).baseInfo = { ...bi, title: position } as NonNullable<
            ResumeData['baseInfo']
          >
        }
      })
    },
    [key, updateDraft],
  )
  return { value, setValue }
}

/**
 * Binding for the top-level `resume.name` field.
 */
export function useNameField(): FieldBinding<string> {
  const draft = useDraftStore((s) => s.draft)
  const updateDraft = useDraftStore((s) => s.updateDraft)
  const value: string = draft?.name ?? ''
  const setValue = useCallback<Setter<string>>(
    (next) => {
      updateDraft('name', (d) => {
        ;(d as { name: string }).name = next
      })
    },
    [updateDraft],
  )
  return { value, setValue }
}
